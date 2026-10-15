import SwiftUI

struct AccountView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var authService = FirebaseAuthService.shared

    @State private var resetMessage: String? = nil
    @State private var isSendingReset = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 16) {
                        Image("rolodex")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 60, height: 60)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.secondary.opacity(0.2), lineWidth: 1))

                        VStack(alignment: .leading, spacing: 4) {
                            Text(authService.currentUser?.displayTitle ?? "Rolodex User")
                                .font(.headline)
                            Text(authService.currentUser?.email ?? "")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                Section(header: Text("Security")) {
                    Button(action: sendResetEmail) {
                        HStack {
                            Text("Reset Password via Email")
                            Spacer()
                            if isSendingReset {
                                ProgressView()
                            }
                        }
                    }

                    if let msg = resetMessage {
                        Text(msg)
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }

                Section {
                    Button(role: .destructive, action: {
                        authService.signOut()
                        dismiss()
                    }) {
                        HStack {
                            Spacer()
                            Text("Log Out")
                                .bold()
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func sendResetEmail() {
        guard let email = authService.currentUser?.email, !email.isEmpty else { return }
        isSendingReset = true
        resetMessage = nil

        Task {
            do {
                try await authService.sendPasswordReset(email: email)
                await MainActor.run {
                    isSendingReset = false
                    resetMessage = "Password reset email sent to \(email)."
                }
            } catch {
                await MainActor.run {
                    isSendingReset = false
                    resetMessage = "Error: \(error.localizedDescription)"
                }
            }
        }
    }
}
