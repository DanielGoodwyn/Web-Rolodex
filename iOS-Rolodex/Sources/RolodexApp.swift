import SwiftUI

@main
struct RolodexApp: App {
    init() {
        for arg in ProcessInfo.processInfo.arguments {
            if arg.hasPrefix("rolodex-app://"), let url = URL(string: arg) {
                FirebaseAuthService.shared.handleAuthCallback(url)
            }
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    FirebaseAuthService.shared.handleAuthCallback(url)
                }
        }
    }
}
