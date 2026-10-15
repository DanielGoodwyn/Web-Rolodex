import Foundation
import Combine

@MainActor
class FirebaseAuthService: ObservableObject {
    static let shared = FirebaseAuthService()

    @Published var currentUser: User? = nil
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

    private let userDefaultsKey = "rolodex_cached_user"

    init() {
        loadCachedUser()
        #if DEBUG
        if currentUser == nil {
            let defaultUser = User(
                uid: "vfcmXNHTrYMj7ovOiwx2VU9dcwp2",
                email: "danielgoodwyn@gmail.com",
                displayName: "Daniel Goodwyn",
                photoURL: nil,
                idToken: nil,
                refreshToken: nil
            )
            saveUser(defaultUser)
        }
        #endif
    }

    private func loadCachedUser() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let user = try? JSONDecoder().decode(User.self, from: data) {
            self.currentUser = user
        }
    }

    func saveUserPublic(_ user: User?) {
        saveUser(user)
    }

    private func saveUser(_ user: User?) {
        self.currentUser = user
        if let user = user, let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: userDefaultsKey)
        } else {
            UserDefaults.standard.removeObject(forKey: userDefaultsKey)
        }
    }

    func signIn(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        guard let url = URL(string: "\(FirebaseConfig.authBaseURL)/accounts:signInWithPassword?key=\(FirebaseConfig.apiKey)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password,
            "returnSecureToken": true
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]

        if let error = json["error"] as? [String: Any],
           let msg = error["message"] as? String {
            let humanMsg = formatAuthError(msg)
            self.errorMessage = humanMsg
            throw NSError(domain: "FirebaseAuth", code: 400, userInfo: [NSLocalizedDescriptionKey: humanMsg])
        }

        guard let uid = json["localId"] as? String,
              let idToken = json["idToken"] as? String else {
            throw NSError(domain: "FirebaseAuth", code: 500, userInfo: [NSLocalizedDescriptionKey: "Authentication failed."])
        }

        let refreshToken = json["refreshToken"] as? String
        let displayName = json["displayName"] as? String

        let user = User(
            uid: uid,
            email: email,
            displayName: displayName,
            photoURL: nil,
            idToken: idToken,
            refreshToken: refreshToken
        )
        saveUser(user)
    }

    func signUp(email: String, password: String, username: String) async throws {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        guard let url = URL(string: "\(FirebaseConfig.authBaseURL)/accounts:signUp?key=\(FirebaseConfig.apiKey)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password,
            "returnSecureToken": true
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]

        if let error = json["error"] as? [String: Any],
           let msg = error["message"] as? String {
            let humanMsg = formatAuthError(msg)
            self.errorMessage = humanMsg
            throw NSError(domain: "FirebaseAuth", code: 400, userInfo: [NSLocalizedDescriptionKey: humanMsg])
        }

        guard let uid = json["localId"] as? String,
              let idToken = json["idToken"] as? String else {
            throw NSError(domain: "FirebaseAuth", code: 500, userInfo: [NSLocalizedDescriptionKey: "Sign up failed."])
        }

        let user = User(
            uid: uid,
            email: email,
            displayName: username,
            photoURL: nil,
            idToken: idToken,
            refreshToken: json["refreshToken"] as? String
        )
        saveUser(user)
    }

    func sendPasswordReset(email: String) async throws {
        guard let url = URL(string: "\(FirebaseConfig.authBaseURL)/accounts:sendOobCode?key=\(FirebaseConfig.apiKey)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "requestType": "PASSWORD_RESET",
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines)
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]

        if let error = json["error"] as? [String: Any],
           let msg = error["message"] as? String {
            let humanMsg = formatAuthError(msg)
            throw NSError(domain: "FirebaseAuth", code: 400, userInfo: [NSLocalizedDescriptionKey: humanMsg])
        }
    }

    func signInWithGoogleToken(_ idToken: String) async throws {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        guard let url = URL(string: "\(FirebaseConfig.authBaseURL)/accounts:signInWithIdp?key=\(FirebaseConfig.apiKey)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "postBody": "id_token=\(idToken)&providerId=google.com",
            "requestUri": "http://localhost",
            "returnSecureToken": true,
            "returnIdpCredential": true
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]

        if let error = json["error"] as? [String: Any],
           let msg = error["message"] as? String {
            let humanMsg = formatAuthError(msg)
            self.errorMessage = humanMsg
            throw NSError(domain: "FirebaseAuth", code: 400, userInfo: [NSLocalizedDescriptionKey: humanMsg])
        }

        guard let uid = json["localId"] as? String,
              let token = json["idToken"] as? String,
              let email = json["email"] as? String else {
            throw NSError(domain: "FirebaseAuth", code: 500, userInfo: [NSLocalizedDescriptionKey: "Google Sign-in failed."])
        }

        let displayName = json["displayName"] as? String
        let photoUrl = json["photoUrl"] as? String

        let user = User(
            uid: uid,
            email: email,
            displayName: displayName,
            photoURL: photoUrl,
            idToken: token,
            refreshToken: json["refreshToken"] as? String
        )
        saveUser(user)
    }

    func signOut() {
        saveUser(nil)
    }

    private func formatAuthError(_ code: String) -> String {
        switch code {
        case "EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS":
            return "Invalid email or password."
        case "EMAIL_EXISTS":
            return "An account with this email already exists."
        case "USER_DISABLED":
            return "This user account has been disabled."
        case "TOO_MANY_ATTEMPTS_TRY_LATER":
            return "Too many failed attempts. Please try again later."
        case "WEAK_PASSWORD : Password should be at least 6 characters":
            return "Password should be at least 6 characters."
        default:
            return code.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}
