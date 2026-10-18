import SwiftUI
import CoreLocation

enum SortType: String, CaseIterable, Identifiable {
    case name = "Name"
    case neighborhood = "Neighborhood"
    case distance = "Distance"
    case rating = "Rating"

    var id: String { rawValue }
}

struct MainView: View {
    @ObservedObject var firestore = FirestoreService.shared
    @ObservedObject var authService = FirebaseAuthService.shared
    @ObservedObject var locationManager = LocationManager.shared

    @Environment(\.scenePhase) private var scenePhase
    @State private var searchText = ""
    @State private var selectedFilter = "ALL" // "ALL", "ALL_ASSOCIATIONS", "ALL_ASSOCIATES", or custom type
    @State private var selectedSortType: SortType = .distance
    @State private var sortAscending: Bool = true
    @State private var showAddCardSheet = false
    @State private var showAccountSheet = false
    @State private var cardExpansionState: [String: Bool] = [:]
    @State private var showRenameTypeAlert = false
    @State private var typeToRename: String? = nil
    @State private var renamedTypeInput = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter Chips Carousel
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        filterChip(title: "All Cards", tag: "ALL")
                        filterChip(title: "All Associations", tag: "ALL_ASSOCIATIONS")
                        filterChip(title: "All Associates", tag: "ALL_ASSOCIATES")

                        ForEach(firestore.userTypes, id: \.self) { t in
                            filterChip(title: t, tag: t)
                                .contextMenu {
                                    Button(action: {
                                        typeToRename = t
                                        renamedTypeInput = t
                                        showRenameTypeAlert = true
                                    }) {
                                        Label("Rename '\(t)'", systemImage: "pencil")
                                    }
                                }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                }
                .background(Theme.background)

                // Current Neighborhood Badge
                if let hood = locationManager.currentNeighborhood {
                    HStack {
                        Button(action: {
                            searchText = hood
                        }) {
                            HStack(spacing: 5) {
                                Glyph(name: "pin", size: 14, color: Theme.primary)
                                Text(hood)
                                    .font(.caption.bold())
                                    .foregroundColor(.primary)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color(uiColor: .systemGray6))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.primary.opacity(0.12), lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)

                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 6)
                }

                // Cards List
                ZStack(alignment: .bottomTrailing) {
                    if filteredAndSortedCards.isEmpty {
                        VStack(spacing: 12) {
                            Spacer()
                            Image(systemName: "person.crop.rectangle.stack")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            Text("No cards found")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Text("Add your first card using the + button below.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 10) {
                                ForEach(Array(filteredAndSortedCards.enumerated()), id: \.element.id) { index, card in
                                    CardView(
                                        card: card,
                                        number: index + 1,
                                        isExpanded: isCardExpanded(id: card.id),
                                        availableTypes: firestore.userTypes,
                                        allAssociateNames: firestore.associations.filter(\.isAssociate).map(\.name),
                                        allParentNames: firestore.associations.filter { !$0.isAssociate }.map(\.name),
                                        notes: firestore.notesCache[card.id] ?? [],
                                        onUpdateRating: { c, rating in
                                            Task {
                                                try? await firestore.updateRating(id: c.id, newRating: rating)
                                            }
                                        },
                                        onUpdateCard: { updated in
                                            Task {
                                                try? await firestore.updateCard(updated)
                                            }
                                        },
                                        onDeleteCard: { toDelete in
                                            Task {
                                                try? await firestore.deleteCard(id: toDelete.id)
                                            }
                                        },
                                        onAddAssociate: { c, name in
                                            Task {
                                                guard let uid = authService.currentUser?.uid else { return }
                                                try? await firestore.linkAssociate(name: name, associationId: c.id, userId: uid)
                                            }
                                        },
                                        onUnlinkAssociate: { c, assocId in
                                            Task {
                                                if c.isAssociate {
                                                    try? await firestore.unlinkAssociate(associateId: c.id, associationId: assocId)
                                                } else {
                                                    try? await firestore.unlinkAssociate(associateId: assocId, associationId: c.id)
                                                }
                                            }
                                        },
                                        onAddNote: { c, text in
                                            Task {
                                                guard let uid = authService.currentUser?.uid else { return }
                                                try? await firestore.addNote(associationId: c.id, userId: uid, name: "General", note: text)
                                            }
                                        },
                                        onDeleteNote: { note in
                                            Task {
                                                guard let aId = note.associationId else { return }
                                                try? await firestore.deleteNote(id: note.id, associationId: aId)
                                            }
                                        },
                                        onSearch: { query in
                                            searchText = query
                                        },
                                        onUpdateLink: { c, type, value in
                                            Task {
                                                try? await firestore.updateLink(id: c.id, type: type, value: value)
                                            }
                                        }
                                    )
                                    .onAppear {
                                        if firestore.notesCache[card.id] == nil, let uid = authService.currentUser?.uid {
                                            Task {
                                                await firestore.fetchNotes(for: card.id, userId: uid)
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(.vertical, 8)
                            .padding(.bottom, 80)
                        }
                    }

                    // Floating Action Button (+)
                    Button(action: { showAddCardSheet = true }) {
                        Glyph(name: "plus", size: 24, color: .white)
                            .frame(width: 56, height: 56)
                            .background(Theme.primary)
                            .clipShape(Circle())
                            .shadow(color: Color.black.opacity(0.2), radius: 6, x: 0, y: 3)
                    }
                    .padding(20)
                }
            }
            .background(Theme.background)
            .navigationTitle("Rolodex")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search cards or associates...")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 0) {
                        HStack(spacing: 2) {
                            // 1. Sort Type Dropdown Menu (Generous 40x40 hit target)
                            Menu {
                                ForEach(SortType.allCases) { type in
                                    Button(action: {
                                        selectedSortType = type
                                        if type == .rating {
                                            sortAscending = false
                                        } else {
                                            sortAscending = true
                                        }
                                    }) {
                                        HStack {
                                            Text(type.rawValue)
                                            if selectedSortType == type {
                                                Image(systemName: "checkmark")
                                            }
                                        }
                                    }
                                }
                            } label: {
                                Glyph(name: "sort", size: 18, color: .primary)
                                    .frame(width: 40, height: 40)
                                    .contentShape(Rectangle())
                            }
                            .accessibilityLabel("Sort by: \(selectedSortType.rawValue)")

                            // 2. Sort Direction Toggle (Ascending / Descending) (Generous 40x40 hit target)
                            Button(action: {
                                sortAscending.toggle()
                            }) {
                                Image(systemName: sortAscending ? "arrow.up" : "arrow.down")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.primary)
                                    .frame(width: 40, height: 40)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(sortAscending ? "Sort ascending, tap for descending" : "Sort descending, tap for ascending")

                            // 3. Expand All Cards (1-Click Button) (Generous 40x40 hit target)
                            Button(action: expandAll) {
                                Text("▼")
                                    .font(.system(size: 13, weight: .black))
                                    .foregroundColor(.primary)
                                    .frame(width: 40, height: 40)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Expand all cards")

                            // 4. Collapse All Cards (1-Click Button) (Generous 40x40 hit target)
                            Button(action: collapseAll) {
                                Text("▶")
                                    .font(.system(size: 12, weight: .black))
                                    .foregroundColor(.primary)
                                    .frame(width: 40, height: 40)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Collapse all cards")
                        }

                        Spacer()

                        Text("Rolodex")
                            .font(.headline.bold())

                        Spacer()

                        // Account Profile Button (Generous 40x40 hit target)
                        Button(action: { showAccountSheet = true }) {
                            Image("rolodex")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 32, height: 32)
                                .clipShape(Circle())
                        }
                        .frame(width: 40, height: 40)
                        .contentShape(Rectangle())
                        .buttonStyle(.plain)
                        .accessibilityLabel("Account settings")
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .sheet(isPresented: $showAddCardSheet) {
                AddCardView(availableTypes: firestore.userTypes) { newCard in
                    Task {
                        try? await firestore.addCard(newCard)
                    }
                }
            }
            .sheet(isPresented: $showAccountSheet) {
                AccountView()
            }
            .alert("Rename Type", isPresented: $showRenameTypeAlert) {
                TextField("New name", text: $renamedTypeInput)
                Button("Rename") {
                    if let old = typeToRename, !renamedTypeInput.trimmingCharacters(in: .whitespaces).isEmpty {
                        let newName = renamedTypeInput.trimmingCharacters(in: .whitespaces)
                        Task {
                            try? await firestore.renameType(oldType: old, newType: newName)
                            if selectedFilter == old {
                                selectedFilter = newName
                            }
                        }
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Renaming '\(typeToRename ?? "")' will update all cards with this type.")
            }
            .refreshable {
                await refreshData()
            }
            .task {
                locationManager.requestPermission()
                if let uid = authService.currentUser?.uid {
                    await refreshData()
                    firestore.startRealtimeSync(for: uid)
                }
            }
            .onDisappear {
                firestore.stopRealtimeSync()
            }
            .onChange(of: scenePhase) { newPhase in
                if newPhase == .active, let uid = authService.currentUser?.uid {
                    firestore.startRealtimeSync(for: uid)
                    Task { await refreshData() }
                } else if newPhase == .background {
                    firestore.stopRealtimeSync()
                }
            }
        }
    }

    private func filterChip(title: String, tag: String) -> some View {
        let isSelected = selectedFilter == tag
        return Button(action: { selectedFilter = tag }) {
            Text(title)
                .font(.subheadline.bold())
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Theme.primary : Color(uiColor: .systemGray6))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }

    private var filteredAndSortedCards: [Association] {
        var list = firestore.associations

        // 1. Category Filter
        switch selectedFilter {
        case "ALL":
            break
        case "ALL_ASSOCIATIONS":
            list = list.filter { !$0.isAssociate }
        case "ALL_ASSOCIATES":
            list = list.filter { $0.isAssociate }
        default:
            list = list.filter { $0.allTypes.contains(selectedFilter) }
        }

        // 2. Search Text
        if !searchText.trimmingCharacters(in: .whitespaces).isEmpty {
            let q = searchText.trimmingCharacters(in: .whitespaces).lowercased()
            list = list.filter { card in
                card.name.lowercased().contains(q) ||
                (card.location?.lowercased().contains(q) == true) ||
                (card.neighborhood?.lowercased().contains(q) == true) ||
                card.linkedAssociateNames.contains { $0.name.lowercased().contains(q) } ||
                card.linkedParentNames.contains { $0.name.lowercased().contains(q) }
            }
        }

        // 3. Compute Distance if User Location Available
        if let userLoc = locationManager.currentLocation {
            for i in 0..<list.count {
                if let geo = list[i].geo {
                    list[i].distanceMiles = locationManager.calculateHaversineDistanceMiles(
                        lat1: userLoc.coordinate.latitude,
                        lon1: userLoc.coordinate.longitude,
                        lat2: geo.latitude,
                        lon2: geo.longitude
                    )
                }
            }
        }

        // 4. Sort
        switch selectedSortType {
        case .name:
            return list.sorted { a, b in
                let comp = a.name.localizedCaseInsensitiveCompare(b.name)
                return sortAscending ? (comp == .orderedAscending) : (comp == .orderedDescending)
            }
        case .neighborhood:
            return list.sorted { a, b in
                let aHood = a.neighborhood?.trimmingCharacters(in: .whitespaces) ?? ""
                let bHood = b.neighborhood?.trimmingCharacters(in: .whitespaces) ?? ""
                if aHood.isEmpty && !bHood.isEmpty { return false }
                if !aHood.isEmpty && bHood.isEmpty { return true }
                let comp = aHood.localizedCaseInsensitiveCompare(bHood)
                return sortAscending ? (comp == .orderedAscending) : (comp == .orderedDescending)
            }
        case .distance:
            return list.sorted { a, b in
                let aDist = a.distanceMiles ?? .infinity
                let bDist = b.distanceMiles ?? .infinity
                return sortAscending ? (aDist < bDist) : (aDist > bDist)
            }
        case .rating:
            return list.sorted { a, b in
                return sortAscending ? (a.displayRating < b.displayRating) : (a.displayRating > b.displayRating)
            }
        }
    }

    private func refreshData() async {
        guard let uid = authService.currentUser?.uid else { return }
        await firestore.fetchAssociations(for: uid)
        await firestore.fetchAllNotes(for: uid)
    }

    private func isCardExpanded(id: String) -> Binding<Bool> {
        Binding(
            get: { cardExpansionState[id] ?? (id == "7rglAtKLeYexpXO9osxt" || firestore.associations.first?.id == id) },
            set: { cardExpansionState[id] = $0 }
        )
    }

    private func expandAll() {
        withAnimation(.easeInOut(duration: 0.2)) {
            for card in firestore.associations {
                cardExpansionState[card.id] = true
            }
        }
    }

    private func collapseAll() {
        withAnimation(.easeInOut(duration: 0.2)) {
            for card in firestore.associations {
                cardExpansionState[card.id] = false
            }
        }
    }
}
