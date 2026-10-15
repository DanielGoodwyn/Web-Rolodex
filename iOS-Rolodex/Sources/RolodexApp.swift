import SwiftUI

@main
struct RolodexApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    FirebaseAuthService.shared.handleAuthCallback(url)
                }
        }
    }
}
