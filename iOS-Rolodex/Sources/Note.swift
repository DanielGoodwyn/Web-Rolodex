import Foundation

struct Note: Identifiable, Codable, Equatable {
    var id: String
    var name: String?
    var note: String?
    var associationId: String?
    var userId: String?
    var createdAt: Date?
    var updatedAt: Date?

    var displayName: String {
        name ?? ""
    }

    var displayNote: String {
        note ?? ""
    }
}
