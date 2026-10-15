import Foundation

struct User: Codable, Equatable {
    var uid: String
    var email: String
    var displayName: String?
    var photoURL: String?
    var idToken: String?
    var refreshToken: String?

    var displayTitle: String {
        if let d = displayName, !d.trimmingCharacters(in: .whitespaces).isEmpty {
            return d
        }
        return email.components(separatedBy: "@").first?.capitalized ?? "Rolodex User"
    }
}
