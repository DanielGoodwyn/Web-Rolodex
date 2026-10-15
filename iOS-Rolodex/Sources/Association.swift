import Foundation

struct GeoPoint: Codable, Equatable {
    var latitude: Double
    var longitude: Double
}

struct LinkedItem: Identifiable, Hashable, Equatable {
    var id: String
    var name: String
}

struct Association: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var type: String?
    var types: [String]?
    var rating: Int?
    var location: String?
    var neighborhood: String?
    var site: String?
    var web: String?
    var fb: String?
    var facebook: String?
    var ig: String?
    var instagram: String?
    var twitter: String?
    var x: String?
    var geo: GeoPoint?
    var userId: String
    var associationId: String?
    var associationIds: [String]?
    var createdAt: Date?
    var updatedAt: Date?

    // Runtime state (excluded from CodingKeys)
    var isExpanded: Bool = true
    var distanceMiles: Double? = nil
    var linkedAssociateNames: [LinkedItem] = []
    var linkedParentNames: [LinkedItem] = []

    enum CodingKeys: String, CodingKey {
        case id, name, type, types, rating, location, neighborhood
        case site, web, fb, facebook, ig, instagram, twitter, x
        case geo, userId, associationId, associationIds, createdAt, updatedAt
    }

    var isAssociate: Bool {
        type == "associate" || (types?.contains("associate") == true)
    }

    var allTypes: [String] {
        if let list = types?.filter({ !$0.trimmingCharacters(in: .whitespaces).isEmpty }), !list.isEmpty {
            return list
        }
        if let t = type, !t.trimmingCharacters(in: .whitespaces).isEmpty {
            return [t]
        }
        return []
    }

    var safeAssociationIds: [String] {
        associationIds ?? []
    }

    var displayRating: Int {
        rating ?? 0
    }

    var websiteUrl: String? {
        site?.nonEmpty ?? web?.nonEmpty
    }

    var facebookUrl: String? {
        fb?.nonEmpty ?? facebook?.nonEmpty
    }

    var instagramUrl: String? {
        ig?.nonEmpty ?? instagram?.nonEmpty
    }

    var twitterUrl: String? {
        twitter?.nonEmpty ?? x?.nonEmpty
    }

    static func == (lhs: Association, rhs: Association) -> Bool {
        lhs.id == rhs.id &&
        lhs.name == rhs.name &&
        lhs.allTypes == rhs.allTypes &&
        lhs.rating == rhs.rating &&
        lhs.location == rhs.location &&
        lhs.neighborhood == rhs.neighborhood &&
        lhs.isExpanded == rhs.isExpanded &&
        lhs.distanceMiles == rhs.distanceMiles &&
        lhs.linkedAssociateNames == rhs.linkedAssociateNames &&
        lhs.linkedParentNames == rhs.linkedParentNames
    }
}

private extension String {
    var nonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
