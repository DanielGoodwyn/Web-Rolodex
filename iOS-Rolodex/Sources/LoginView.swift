import SwiftUI

struct LoginView: View {
    @ObservedObject var authService = FirebaseAuthService.shared

    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var isSignUp = false
    @State private var showForgotPassword = false
    @State private var forgotEmail = ""
    @State private var forgotStatusMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer(minLength: 40)

                // Logo & Header
                VStack(spacing: 12) {
                    Image("rolodex")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 80, height: 80)
                        .clipShape(Circle())
                        .shadow(color: Color.black.opacity(0.1), radius: 6, x: 0, y: 3)

                    Text("Rolodex")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.primaryDark)

                    Text(isSignUp ? "Create your personal directory" : "Welcome back to your Rolodex")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Input Card
                VStack(spacing: 16) {
                    if isSignUp {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Username")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                            TextField("e.g. daniel", text: $username)
                                .textFieldStyle(.plain)
                                .padding(12)
                                .background(Color(uiColor: .systemGray6))
                                .cornerRadius(8)
                                .autocapitalization(.none)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email Address")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        TextField("name@example.com", text: $email)
                            .textFieldStyle(.plain)
                            .padding(12)
                            .background(Color(uiColor: .systemGray6))
                            .cornerRadius(8)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        SecureField("••••••••", text: $password)
                            .textFieldStyle(.plain)
                            .padding(12)
                            .background(Color(uiColor: .systemGray6))
                            .cornerRadius(8)
                    }

                    if !isSignUp {
                        HStack {
                            Spacer()
                            Button("Forgot password?") {
                                forgotEmail = email
                                showForgotPassword = true
                            }
                            .font(.caption)
                            .foregroundColor(Theme.primary)
                        }
                    }

                    if let err = authService.errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(action: submitAuth) {
                        HStack {
                            Spacer()
                            if authService.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text(isSignUp ? "Sign Up" : "Sign In")
                                    .font(.headline)
                                    .foregroundColor(.white)
                            }
                            Spacer()
                        }
                        .padding(14)
                        .background(Theme.primary)
                        .cornerRadius(10)
                    }
                    .disabled(authService.isLoading || email.isEmpty || password.isEmpty)
                }
                .padding(20)
                .background(Theme.cardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 3)
                .padding(.horizontal, 24)

                // Toggle Mode
                Button(action: {
                    withAnimation {
                        isSignUp.toggle()
                        authService.errorMessage = nil
                    }
                }) {
                    Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                        .font(.subheadline)
                        .foregroundColor(Theme.primary)
                }

                // Quick test sign in
                Button(action: {
                    let testUser = User(
                        uid: "vfcmXNHTrYMj7ovOiwx2VU9dcwp2",
                        email: "danielgoodwyn@gmail.com",
                        displayName: "Daniel Goodwyn",
                        photoURL: nil,
                        idToken: nil,
                        refreshToken: nil
                    )
                    authService.saveUserPublic(testUser)
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "person.badge.key.fill")
                        Text("Sign In as Daniel Goodwyn")
                    }
                    .font(.caption.bold())
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Theme.primaryLight.opacity(0.5))
                    .foregroundColor(Theme.primaryDark)
                    .cornerRadius(20)
                }

                Spacer()
            }
        }
        .background(Theme.background)
        .sheet(isPresented: $showForgotPassword) {
            NavigationStack {
                Form {
                    Section(header: Text("Reset Password")) {
                        TextField("Your email address", text: $forgotEmail)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)

                        if let status = forgotStatusMessage {
                            Text(status)
                                .font(.caption)
                                .foregroundColor(.green)
                        }

                        Button("Send Reset Link") {
                            Task {
                                do {
                                    try await authService.sendPasswordReset(email: forgotEmail)
                                    forgotStatusMessage = "Reset link sent! Check your inbox."
                                } catch {
                                    forgotStatusMessage = "Error: \(error.localizedDescription)"
                                }
                            }
                        }
                    }
                }
                .navigationTitle("Forgot Password")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Close") { showForgotPassword = false }
                    }
                }
            }
        }
    }

    private func submitAuth() {
        Task {
            do {
                if isSignUp {
                    try await authService.signUp(email: email, password: password, username: username)
                } else {
                    try await authService.signIn(email: email, password: password)
                }
            } catch {
                // Handled in authService
            }
        }
    }
}
