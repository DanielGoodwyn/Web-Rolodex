import Foundation
import Combine

@MainActor
class FirestoreService: ObservableObject {
    static let shared = FirestoreService()

    @Published var associations: [Association] = []
    @Published var userTypes: [String] = []
    @Published var notesCache: [String: [Note]] = [:] // associationId -> [Note]
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

    private var syncTask: Task<Void, Never>?
    private let cacheKeyAssociations = "rolodex_cached_associations"
    private let cacheKeyNotes = "rolodex_cached_notes"

    init() {
        loadLocalCache()
    }

    private func loadLocalCache() {
        if let data = UserDefaults.standard.data(forKey: cacheKeyAssociations),
           let list = try? JSONDecoder().decode([Association].self, from: data), !list.isEmpty {
            self.associations = list
            self.updateAssociateLookups()
        } else if let bundleURL = Bundle.main.url(forResource: "initial_cards", withExtension: "json"),
                  let data = try? Data(contentsOf: bundleURL),
                  let list = try? JSONDecoder().decode([Association].self, from: data), !list.isEmpty {
            self.associations = list
            self.updateAssociateLookups()
            self.persistLocalCache()
        }

        if let data = UserDefaults.standard.data(forKey: cacheKeyNotes),
           let notes = try? JSONDecoder().decode([String: [Note]].self, from: data), !notes.isEmpty {
            self.notesCache = notes
        } else if let bundleURL = Bundle.main.url(forResource: "initial_notes", withExtension: "json"),
                  let data = try? Data(contentsOf: bundleURL),
                  let notes = try? JSONDecoder().decode([String: [Note]].self, from: data), !notes.isEmpty {
            self.notesCache = notes
            self.persistLocalCache()
        }
    }

    func persistLocalCache() {
        if let data = try? JSONEncoder().encode(self.associations) {
            UserDefaults.standard.set(data, forKey: cacheKeyAssociations)
        }
        if let data = try? JSONEncoder().encode(self.notesCache) {
            UserDefaults.standard.set(data, forKey: cacheKeyNotes)
        }
    }

    // MARK: - Realtime Sync
    func startRealtimeSync(for userId: String) {
        stopRealtimeSync()
        syncTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 6_000_000_000) // 6s
                if Task.isCancelled { break }
                guard let self = self else { break }
                await self.fetchAssociations(for: userId)
            }
        }
    }

    func stopRealtimeSync() {
        syncTask?.cancel()
        syncTask = nil
    }

    // MARK: - Query Associations
    func fetchAssociations(for userId: String) async {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL):runQuery") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let query: [String: Any] = [
            "structuredQuery": [
                "from": [["collectionId": "Association"]],
                "where": [
                    "fieldFilter": [
                        "field": ["fieldPath": "userId"],
                        "op": "EQUAL",
                        "value": ["stringValue": userId]
                    ]
                ]
            ]
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: query)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                return
            }
            guard let rawList = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                return
            }

            var parsed: [Association] = []
            for item in rawList {
                guard let doc = item["document"] as? [String: Any],
                      let namePath = doc["name"] as? String,
                      let fields = doc["fields"] as? [String: Any] else {
                    continue
                }
                let id = namePath.components(separatedBy: "/").last ?? ""
                if let card = parseAssociation(id: id, fields: fields) {
                    parsed.append(card)
                }
            }

            let hasChanges = parsed.count != self.associations.count ||
                zip(parsed, self.associations).contains { p, existing in
                    p.id != existing.id ||
                    p.name != existing.name ||
                    p.rating != existing.rating ||
                    p.allTypes != existing.allTypes ||
                    p.location != existing.location ||
                    p.neighborhood != existing.neighborhood ||
                    p.safeAssociationIds != existing.safeAssociationIds ||
                    p.websiteUrl != existing.websiteUrl ||
                    p.facebookUrl != existing.facebookUrl ||
                    p.instagramUrl != existing.instagramUrl ||
                    p.twitterUrl != existing.twitterUrl
                }

            if hasChanges {
                let existingMap = Dictionary(uniqueKeysWithValues: self.associations.map { ($0.id, $0) })
                for i in 0..<parsed.count {
                    if let old = existingMap[parsed[i].id] {
                        parsed[i].distanceMiles = old.distanceMiles
                    }
                }
                self.associations = parsed
                self.updateAssociateLookups()
                self.persistLocalCache()
                await self.fetchUserTypes(for: userId)
            }
        } catch {
            // Ignore error to avoid wiping cache
        }
    }

    // MARK: - Two-way Associate Resolution
    func updateAssociateLookups() {
        let types = Set(associations.flatMap { $0.allTypes }).filter { $0.lowercased() != "associate" }.sorted()
        if !types.isEmpty {
            self.userTypes = types
        }

        let associateCards = associations.filter { $0.isAssociate }
        let orgCards = associations.filter { !$0.isAssociate }

        let orgMap = Dictionary(uniqueKeysWithValues: orgCards.map { ($0.id, $0.name) })

        for i in 0..<associations.count {
            if associations[i].isAssociate {
                let pIds = associations[i].safeAssociationIds.isEmpty
                    ? (associations[i].associationId.map { [$0] } ?? [])
                    : associations[i].safeAssociationIds
                associations[i].linkedParentNames = pIds.compactMap { pid in
                    orgMap[pid].map { LinkedItem(id: pid, name: $0) }
                }
            } else {
                let currentId = associations[i].id
                let linked = associateCards.filter { a in
                    let aIds = a.safeAssociationIds.isEmpty
                        ? (a.associationId.map { [$0] } ?? [])
                        : a.safeAssociationIds
                    return aIds.contains(currentId)
                }
                associations[i].linkedAssociateNames = linked.map { LinkedItem(id: $0.id, name: $0.name) }
            }
        }
    }

    // MARK: - Query Notes
    func fetchNotes(for associationId: String, userId: String) async {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL):runQuery") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = FirebaseAuthService.shared.currentUser?.idToken {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let query: [String: Any] = [
            "structuredQuery": [
                "from": [["collectionId": "Note"]],
                "where": [
                    "compositeFilter": [
                        "op": "AND",
                        "filters": [
                            [
                                "fieldFilter": [
                                    "field": ["fieldPath": "userId"],
                                    "op": "EQUAL",
                                    "value": ["stringValue": userId]
                                ]
                            ],
                            [
                                "fieldFilter": [
                                    "field": ["fieldPath": "associationId"],
                                    "op": "EQUAL",
                                    "value": ["stringValue": associationId]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: query)
            let (data, _) = try await URLSession.shared.data(for: request)
            let rawList = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []

            var notes: [Note] = []
            for item in rawList {
                guard let doc = item["document"] as? [String: Any],
                      let namePath = doc["name"] as? String,
                      let fields = doc["fields"] as? [String: Any] else {
                    continue
                }
                let id = namePath.components(separatedBy: "/").last ?? ""
                let name = (fields["name"] as? [String: Any])?["stringValue"] as? String
                let note = (fields["note"] as? [String: Any])?["stringValue"] as? String
                notes.append(Note(id: id, name: name, note: note, associationId: associationId, userId: userId))
            }
            notes.sort { ($0.name ?? "").lowercased() < ($1.name ?? "").lowercased() }
            self.notesCache[associationId] = notes
            self.persistLocalCache()
        } catch {
            // Ignore error
        }
    }

    // MARK: - Query All Notes
    func fetchAllNotes(for userId: String) async {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL):runQuery") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let query: [String: Any] = [
            "structuredQuery": [
                "from": [["collectionId": "Note"]],
                "where": [
                    "fieldFilter": [
                        "field": ["fieldPath": "userId"],
                        "op": "EQUAL",
                        "value": ["stringValue": userId]
                    ]
                ]
            ]
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: query)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                return
            }
            guard let rawList = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                return
            }

            var newCache: [String: [Note]] = [:]
            for item in rawList {
                guard let doc = item["document"] as? [String: Any],
                      let namePath = doc["name"] as? String,
                      let fields = doc["fields"] as? [String: Any] else {
                    continue
                }
                let id = namePath.components(separatedBy: "/").last ?? ""
                let name = (fields["name"] as? [String: Any])?["stringValue"] as? String
                let note = (fields["note"] as? [String: Any])?["stringValue"] as? String
                let associationId = (fields["associationId"] as? [String: Any])?["stringValue"] as? String ?? ""
                if !associationId.isEmpty {
                    newCache[associationId, default: []].append(
                        Note(id: id, name: name, note: note, associationId: associationId, userId: userId)
                    )
                }
            }
            for (k, v) in newCache {
                newCache[k] = v.sorted { ($0.name ?? "").lowercased() < ($1.name ?? "").lowercased() }
            }
            if newCache != self.notesCache {
                self.notesCache = newCache
                self.persistLocalCache()
            }
        } catch {
            // Ignore error
        }
    }

    // MARK: - Query Types
    func fetchUserTypes(for userId: String) async {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL):runQuery") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let query: [String: Any] = [
            "structuredQuery": [
                "from": [["collectionId": "Type"]],
                "where": [
                    "fieldFilter": [
                        "field": ["fieldPath": "userId"],
                        "op": "EQUAL",
                        "value": ["stringValue": userId]
                    ]
                ]
            ]
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: query)
            let (data, _) = try await URLSession.shared.data(for: request)
            let rawList = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []

            var set = Set<String>()
            for item in rawList {
                guard let doc = item["document"] as? [String: Any],
                      let fields = doc["fields"] as? [String: Any],
                      let typeVal = (fields["type"] as? [String: Any])?["stringValue"] as? String else {
                    continue
                }
                if typeVal != "associate" && !typeVal.isEmpty {
                    set.insert(typeVal)
                }
            }
            self.userTypes = Array(set).sorted()
        } catch {
            // Ignore
        }
    }

    // MARK: - Add Card
    func addCard(_ card: Association) async throws {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Association") else { return }

        var fields: [String: Any] = [
            "name": ["stringValue": card.name],
            "userId": ["stringValue": card.userId],
            "rating": ["integerValue": "\(card.displayRating)"],
            "createdAt": ["timestampValue": ISO8601DateFormatter().string(from: Date())],
            "updatedAt": ["timestampValue": ISO8601DateFormatter().string(from: Date())]
        ]

        if let type = card.type { fields["type"] = ["stringValue": type] }
        if let types = card.types, !types.isEmpty {
            fields["types"] = ["arrayValue": ["values": types.map { ["stringValue": $0] }]]
        }
        if let loc = card.location { fields["location"] = ["stringValue": loc] }
        if let hood = card.neighborhood { fields["neighborhood"] = ["stringValue": hood] }
        if let site = card.websiteUrl { fields["site"] = ["stringValue": site] }
        if let fb = card.facebookUrl { fields["fb"] = ["stringValue": fb] }
        if let ig = card.instagramUrl { fields["ig"] = ["stringValue": ig] }
        if let tw = card.twitterUrl { fields["twitter"] = ["stringValue": tw] }
        if let geo = card.geo {
            fields["geo"] = [
                "mapValue": [
                    "fields": [
                        "latitude": ["doubleValue": geo.latitude],
                        "longitude": ["doubleValue": geo.longitude]
                    ]
                ]
            ]
        }
        if let aId = card.associationId { fields["associationId"] = ["stringValue": aId] }
        if let aIds = card.associationIds, !aIds.isEmpty {
            fields["associationIds"] = ["arrayValue": ["values": aIds.map { ["stringValue": $0] }]]
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["fields": fields])

        let (data, _) = try await URLSession.shared.data(for: request)
        if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
           let namePath = json["name"] as? String {
            let newId = namePath.components(separatedBy: "/").last ?? ""
            var newCard = card
            newCard.id = newId
            associations.insert(newCard, at: 0)
            updateAssociateLookups()
        }

        for t in card.allTypes {
            await ensureTypeExists(t, userId: card.userId)
        }
    }

    // MARK: - Update Rating
    func updateRating(id: String, newRating: Int) async throws {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Association/\(id)?updateMask.fieldPaths=rating&updateMask.fieldPaths=updatedAt") else { return }

        let fields: [String: Any] = [
            "rating": ["integerValue": "\(newRating)"],
            "updatedAt": ["timestampValue": ISO8601DateFormatter().string(from: Date())]
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["fields": fields])

        _ = try await URLSession.shared.data(for: request)

        if let idx = associations.firstIndex(where: { $0.id == id }) {
            associations[idx].rating = newRating
            persistLocalCache()
        }
    }

    // MARK: - Update Card
    func updateCard(_ card: Association) async throws {
        var maskFields: [String] = ["name", "rating", "updatedAt"]
        var fields: [String: Any] = [
            "name": ["stringValue": card.name],
            "rating": ["integerValue": "\(card.displayRating)"],
            "updatedAt": ["timestampValue": ISO8601DateFormatter().string(from: Date())]
        ]

        if let type = card.type {
            fields["type"] = ["stringValue": type]
            maskFields.append("type")
        }
        if let types = card.types {
            fields["types"] = ["arrayValue": ["values": types.map { ["stringValue": $0] }]]
            maskFields.append("types")
        }
        if let loc = card.location {
            fields["location"] = ["stringValue": loc]
            maskFields.append("location")
        }
        if let hood = card.neighborhood {
            fields["neighborhood"] = ["stringValue": hood]
            maskFields.append("neighborhood")
        }
        if let site = card.websiteUrl, !site.trimmingCharacters(in: .whitespaces).isEmpty {
            fields["site"] = ["stringValue": site]
        }
        maskFields.append("site")

        if let fb = card.facebookUrl, !fb.trimmingCharacters(in: .whitespaces).isEmpty {
            fields["fb"] = ["stringValue": fb]
        }
        maskFields.append("fb")

        if let ig = card.instagramUrl, !ig.trimmingCharacters(in: .whitespaces).isEmpty {
            fields["ig"] = ["stringValue": ig]
        }
        maskFields.append("ig")

        if let twitter = card.twitterUrl, !twitter.trimmingCharacters(in: .whitespaces).isEmpty {
            fields["twitter"] = ["stringValue": twitter]
            fields["x"] = ["stringValue": twitter]
        }
        maskFields.append("twitter")
        maskFields.append("x")

        if let geo = card.geo {
            fields["geo"] = [
                "mapValue": [
                    "fields": [
                        "latitude": ["doubleValue": geo.latitude],
                        "longitude": ["doubleValue": geo.longitude]
                    ]
                ]
            ]
            maskFields.append("geo")
        }

        let queryParams = maskFields.map { "updateMask.fieldPaths=\($0)" }.joined(separator: "&")
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Association/\(card.id)?\(queryParams)") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["fields": fields])

        _ = try await URLSession.shared.data(for: request)

        if let idx = associations.firstIndex(where: { $0.id == card.id }) {
            associations[idx] = card
            updateAssociateLookups()
            persistLocalCache()
        }

        for t in card.allTypes {
            await ensureTypeExists(t, userId: card.userId)
        }
    }

    // MARK: - Rename Type
    func renameType(oldType: String, newType: String) async throws {
        guard let userId = FirebaseAuthService.shared.currentUser?.uid else { return }
        let cleanedNew = newType.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanedNew.isEmpty, cleanedNew.lowercased() != oldType.lowercased() else { return }
        guard oldType.lowercased() != "associate" else { return }

        // 1. Update matching Type document in Firestore
        if let runQueryUrl = URL(string: "\(FirebaseConfig.firestoreBaseURL):runQuery") {
            var request = URLRequest(url: runQueryUrl)
            request.httpMethod = "POST"
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
                request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let query: [String: Any] = [
                "structuredQuery": [
                    "from": [["collectionId": "Type"]],
                    "where": [
                        "compositeFilter": [
                            "op": "AND",
                            "filters": [
                                [
                                    "fieldFilter": [
                                        "field": ["fieldPath": "userId"],
                                        "op": "EQUAL",
                                        "value": ["stringValue": userId]
                                    ]
                                ],
                                [
                                    "fieldFilter": [
                                        "field": ["fieldPath": "type"],
                                        "op": "EQUAL",
                                        "value": ["stringValue": oldType]
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
            if let queryData = try? JSONSerialization.data(withJSONObject: query) {
                request.httpBody = queryData
                if let (data, _) = try? await URLSession.shared.data(for: request),
                   let rawList = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    for item in rawList {
                        if let doc = item["document"] as? [String: Any],
                           let docName = doc["name"] as? String,
                           let docUrl = URL(string: "https://firestore.googleapis.com/v1/\(docName)?updateMask.fieldPaths=type") {
                            var patchReq = URLRequest(url: docUrl)
                            patchReq.httpMethod = "PATCH"
                            patchReq.addValue("application/json", forHTTPHeaderField: "Content-Type")
                            if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
                                patchReq.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                            }
                            let patchBody: [String: Any] = [
                                "fields": [
                                    "type": ["stringValue": cleanedNew],
                                    "userId": ["stringValue": userId]
                                ]
                            ]
                            patchReq.httpBody = try? JSONSerialization.data(withJSONObject: patchBody)
                            _ = try? await URLSession.shared.data(for: patchReq)
                        }
                    }
                }
            }
        }

        // 2. Cascade across all Associations belonging to this user
        for i in 0..<associations.count {
            var card = associations[i]
            var modified = false

            if card.type == oldType {
                card.type = cleanedNew
                modified = true
            }

            if let currentTypes = card.types, currentTypes.contains(oldType) {
                var newTypesList: [String] = []
                for t in currentTypes {
                    let mapped = (t == oldType) ? cleanedNew : t
                    if !newTypesList.contains(mapped) {
                        newTypesList.append(mapped)
                    }
                }
                card.types = newTypesList
                modified = true
            }

            if modified {
                associations[i] = card
                try? await updateCard(card)
            }
        }

        // 3. Update userTypes & associate lookups
        updateAssociateLookups()
        await fetchUserTypes(for: userId)
        persistLocalCache()
    }

    // MARK: - Update Single Link
    func updateLink(id: String, type: String, value: String?) async throws {
        let fieldName: String
        switch type.lowercased() {
        case "site", "web", "www": fieldName = "site"
        case "fb", "facebook": fieldName = "fb"
        case "ig", "insta", "instagram": fieldName = "ig"
        case "twitter", "x": fieldName = "twitter"
        default: fieldName = type
        }

        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines)
        var mask = "updateMask.fieldPaths=\(fieldName)&updateMask.fieldPaths=updatedAt"
        var fields: [String: Any] = [
            "updatedAt": ["timestampValue": ISO8601DateFormatter().string(from: Date())]
        ]

        var formattedVal: String? = nil
        if let val = trimmed, !val.isEmpty {
            var f = val
            if !f.lowercased().hasPrefix("http://") && !f.lowercased().hasPrefix("https://") {
                f = "https://\(f)"
            }
            formattedVal = f
            fields[fieldName] = ["stringValue": f]
            if fieldName == "twitter" {
                mask += "&updateMask.fieldPaths=x"
                fields["x"] = ["stringValue": f]
            }
        } else if fieldName == "twitter" {
            mask += "&updateMask.fieldPaths=x"
        }

        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Association/\(id)?\(mask)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["fields": fields])
        _ = try await URLSession.shared.data(for: request)

        if let idx = associations.firstIndex(where: { $0.id == id }) {
            switch fieldName {
            case "site":
                associations[idx].site = formattedVal
                associations[idx].web = formattedVal
            case "fb":
                associations[idx].fb = formattedVal
                associations[idx].facebook = formattedVal
            case "ig":
                associations[idx].ig = formattedVal
                associations[idx].instagram = formattedVal
            case "twitter":
                associations[idx].twitter = formattedVal
                associations[idx].x = formattedVal
            default: break
            }
            persistLocalCache()
        }
    }

    // MARK: - Delete Card
    func deleteCard(id: String) async throws {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Association/\(id)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        _ = try await URLSession.shared.data(for: request)
        associations.removeAll { $0.id == id }
        updateAssociateLookups()
        persistLocalCache()
    }

    // MARK: - Add Note
    func addNote(associationId: String, userId: String, name: String, note: String) async throws {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Note") else { return }

        let fields: [String: Any] = [
            "associationId": ["stringValue": associationId],
            "userId": ["stringValue": userId],
            "name": ["stringValue": name.trimmingCharacters(in: .whitespacesAndNewlines)],
            "note": ["stringValue": note.trimmingCharacters(in: .whitespacesAndNewlines)],
            "createdAt": ["timestampValue": ISO8601DateFormatter().string(from: Date())]
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["fields": fields])

        let (data, _) = try await URLSession.shared.data(for: request)
        if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
           let namePath = json["name"] as? String {
            let id = namePath.components(separatedBy: "/").last ?? ""
            let newNote = Note(id: id, name: name, note: note, associationId: associationId, userId: userId)
            var current = notesCache[associationId] ?? []
            current.append(newNote)
            notesCache[associationId] = current
            persistLocalCache()
        }
    }

    // MARK: - Delete Note
    func deleteNote(id: String, associationId: String) async throws {
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Note/\(id)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        if let token = await FirebaseAuthService.shared.refreshIdTokenIfNeeded() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        _ = try await URLSession.shared.data(for: request)
        notesCache[associationId]?.removeAll { $0.id == id }
        persistLocalCache()
    }

    // MARK: - Link Associate
    func linkAssociate(name: String, associationId: String, userId: String) async throws {
        let formattedName = name.trimmingCharacters(in: .whitespacesAndNewlines).capitalized

        if let existingIdx = associations.firstIndex(where: { $0.isAssociate && $0.name.caseInsensitiveCompare(formattedName) == .orderedSame }) {
            var card = associations[existingIdx]
            var ids = card.safeAssociationIds
            if let single = card.associationId, !ids.contains(single) {
                ids.append(single)
            }
            if !ids.contains(associationId) {
                ids.append(associationId)
            }
            card.associationIds = ids
            associations[existingIdx] = card
            updateAssociateLookups()

            // Update on server
            guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Association/\(card.id)?updateMask.fieldPaths=associationIds") else { return }
            var request = URLRequest(url: url)
            request.httpMethod = "PATCH"
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            let body: [String: Any] = [
                "fields": [
                    "associationIds": ["arrayValue": ["values": ids.map { ["stringValue": $0] }]]
                ]
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            _ = try await URLSession.shared.data(for: request)
        } else {
            // Create new associate card
            let newAssociate = Association(
                id: "",
                name: formattedName,
                type: "associate",
                types: ["associate"],
                rating: 0,
                location: nil,
                neighborhood: nil,
                userId: userId,
                associationId: associationId,
                associationIds: [associationId]
            )
            try await addCard(newAssociate)
        }
    }

    // MARK: - Unlink Associate
    func unlinkAssociate(associateId: String, associationId: String) async throws {
        guard let idx = associations.firstIndex(where: { $0.id == associateId }) else { return }
        var card = associations[idx]
        var ids = card.safeAssociationIds
        if let s = card.associationId, !ids.contains(s) {
            ids.append(s)
        }
        ids.removeAll { $0 == associationId }
        card.associationIds = ids
        card.associationId = ids.first
        associations[idx] = card
        updateAssociateLookups()

        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Association/\(associateId)?updateMask.fieldPaths=associationIds&updateMask.fieldPaths=associationId") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        var fields: [String: Any] = [
            "associationIds": ["arrayValue": ["values": ids.map { ["stringValue": $0] }]]
        ]
        if let firstId = ids.first {
            fields["associationId"] = ["stringValue": firstId]
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["fields": fields])
        _ = try await URLSession.shared.data(for: request)
    }

    private func ensureTypeExists(_ typeName: String, userId: String) async {
        guard !userTypes.contains(typeName) else { return }
        guard let url = URL(string: "\(FirebaseConfig.firestoreBaseURL)/Type") else { return }

        let fields: [String: Any] = [
            "type": ["stringValue": typeName],
            "userId": ["stringValue": userId],
            "createdAt": ["timestampValue": ISO8601DateFormatter().string(from: Date())]
        ]
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body = try? JSONSerialization.data(withJSONObject: ["fields": fields]) {
            request.httpBody = body
            _ = try? await URLSession.shared.data(for: request)
            userTypes.append(typeName)
            userTypes.sort()
        }
    }

    // MARK: - Parsing
    private func parseAssociation(id: String, fields: [String: Any]) -> Association? {
        guard let name = (fields["name"] as? [String: Any])?["stringValue"] as? String else {
            return nil
        }
        let type = (fields["type"] as? [String: Any])?["stringValue"] as? String
        let types = ((fields["types"] as? [String: Any])?["arrayValue"] as? [String: Any])?["values"] as? [[String: Any]]
        let typesList = types?.compactMap { $0["stringValue"] as? String }

        let ratingVal = (fields["rating"] as? [String: Any])?["integerValue"] as? String
        let rating = ratingVal.flatMap { Int($0) }

        let location = (fields["location"] as? [String: Any])?["stringValue"] as? String
        let neighborhood = (fields["neighborhood"] as? [String: Any])?["stringValue"] as? String
        let site = (fields["site"] as? [String: Any])?["stringValue"] as? String
        let web = (fields["web"] as? [String: Any])?["stringValue"] as? String
        let fb = (fields["fb"] as? [String: Any])?["stringValue"] as? String
        let facebook = (fields["facebook"] as? [String: Any])?["stringValue"] as? String
        let ig = (fields["ig"] as? [String: Any])?["stringValue"] as? String
        let instagram = (fields["instagram"] as? [String: Any])?["stringValue"] as? String
        let twitter = (fields["twitter"] as? [String: Any])?["stringValue"] as? String
        let x = (fields["x"] as? [String: Any])?["stringValue"] as? String

        var geoPoint: GeoPoint? = nil
        if let geoMap = ((fields["geo"] as? [String: Any])?["mapValue"] as? [String: Any])?["fields"] as? [String: Any] {
            let lat = (geoMap["latitude"] as? [String: Any])?["doubleValue"] as? Double
            let lon = (geoMap["longitude"] as? [String: Any])?["doubleValue"] as? Double
            if let lat = lat, let lon = lon {
                geoPoint = GeoPoint(latitude: lat, longitude: lon)
            }
        }

        let userId = (fields["userId"] as? [String: Any])?["stringValue"] as? String ?? ""
        let associationId = (fields["associationId"] as? [String: Any])?["stringValue"] as? String
        let aIds = ((fields["associationIds"] as? [String: Any])?["arrayValue"] as? [String: Any])?["values"] as? [[String: Any]]
        let associationIds = aIds?.compactMap { $0["stringValue"] as? String }

        return Association(
            id: id,
            name: name,
            type: type,
            types: typesList,
            rating: rating,
            location: location,
            neighborhood: neighborhood,
            site: site,
            web: web,
            fb: fb,
            facebook: facebook,
            ig: ig,
            instagram: instagram,
            twitter: twitter,
            x: x,
            geo: geoPoint,
            userId: userId,
            associationId: associationId,
            associationIds: associationIds
        )
    }
}
