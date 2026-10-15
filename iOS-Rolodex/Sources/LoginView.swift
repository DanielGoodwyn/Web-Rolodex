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
                    // Google Sign In Button
                    Button(action: {
                        Task {
                            do {
                                try await authService.signInWithGoogle()
                            } catch {
                                authService.errorMessage = error.localizedDescription
                            }
                        }
                    }) {
                        HStack(spacing: 12) {
                            GoogleLogoIcon()
                            Text("Sign in with Google")
                                .font(.headline)
                                .foregroundColor(.primary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(13)
                        .background(Color(uiColor: .systemBackground))
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color(uiColor: .systemGray4), lineWidth: 1)
                        )
                        .shadow(color: Color.black.opacity(0.04), radius: 2, x: 0, y: 1)
                    }
                    .disabled(authService.isLoading)

                    // OR Divider
                    HStack(spacing: 12) {
                        Rectangle()
                            .fill(Color(uiColor: .systemGray4))
                            .frame(height: 1)
                        Text("OR")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        Rectangle()
                            .fill(Color(uiColor: .systemGray4))
                            .frame(height: 1)
                    }
                    .padding(.vertical, 2)

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
                                Text(isSignUp ? "Sign Up with Email" : "Sign In with Email")
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

struct GoogleLogoIcon: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color(uiColor: .systemGray6))
                .frame(width: 22, height: 22)
            Text("G")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(Color(red: 0.26, green: 0.52, blue: 0.96))
        }
    }
}

