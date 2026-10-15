import SwiftUI

struct ContentView: View {
    @ObservedObject var authService = FirebaseAuthService.shared

    var body: some View {
        Group {
            if authService.currentUser != nil {
                MainView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authService.currentUser != nil)
    }
}
