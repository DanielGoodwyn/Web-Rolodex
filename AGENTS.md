# AGENTS.md — Rolodex Project Handoff & Instructions

This document provides complete context, architectural background, operational procedures, and next steps for AI agents (including Antigravity 2.0 standalone app agents) working on the **Rolodex** project.

---

## 1. Project Overview & URLs

- **Repository**: `https://github.com/DanielGoodwyn/Web-Rolodex` (Local path: `/Users/danielgoodwyn/src/Rolodex`)
- **Active Git Branch**: `master` (synchronized with `origin/master`)
- **Live Production URL**: `https://danielgoodwyn.com/rolodex/`
- **Hosting Environment**: IONOS (Apache with `.htaccess` clean URL rewrites, SFTP deployment)
- **Primary Tech Stack**: HTML5, Vanilla JavaScript, CSS3, Bootstrap 3, Firebase v8 (Auth & Firestore)

---

## 2. Completed Milestones & Current State

### A. Backend Migration to Firebase
- **Old Backend**: Legacy 2015 Parse.com backend (defunct).
- **New Backend**: Firebase Project `rolodex-ade98` (Project Number: `119025024991`).
- **Adapter**: [`js/database-adapter.js`](file:///Users/danielgoodwyn/src/Rolodex/js/database-adapter.js) provides a drop-in compatibility layer that emulates the Parse 1.3.3 SDK API (`Parse.User`, `Parse.Object`, `Parse.Query`, `Parse.GeoPoint`) on top of Firebase Authentication and Cloud Firestore.
- **Config**: [`js/firebase-config.js`](file:///Users/danielgoodwyn/src/Rolodex/js/firebase-config.js) initializes the Firebase app.

### B. Authentication Features
- **Email/Password**: Standard sign-up and log-in.
- **Password Reset**: "Forgot password?" flow in [`login.html`](file:///Users/danielgoodwyn/src/Rolodex/login.html) sends standard Firebase reset emails.
- **Sign in with Google**: One-click Google Sign-In using Firebase Auth popup (`Parse.User.logInWithGoogle()`). Authorized domains include `danielgoodwyn.com`.
- **Test User Credentials**:
  - Email: `danielgoodwyn@gmail.com`
  - Password: `Testpassword123!`

### C. Username & Profile Customization
- **Title Case Formatting**: `capitaliseFirstLetter()` in [`js/rolodex.js`](file:///Users/danielgoodwyn/src/Rolodex/js/rolodex.js) formats every word in Title Case across spaces, hyphens, and underscores. Preserves user spaces from Google `displayName`.
- **Profile Pictures**:
  - Direct image URL support.
  - Native file upload with in-memory canvas resizing (max 256×256 WebP/JPEG) stored directly in Firestore, requiring no paid storage buckets.
  - Auto-grab profile photo from Google accounts (`user.photoURL`).

### D. 100% Free Location & Google Maps Integration ($0 Cost)
- **Zero Cost Geocoding**: Avoids Google Cloud billing requirements or authorization holds by using **OpenStreetMap Nominatim** (`freeGeocodeAddress` and `freeReverseGeocode` in [`js/rolodex.js`](file:///Users/danielgoodwyn/src/Rolodex/js/rolodex.js)).
- **Neighborhood Detection**: Device GPS coordinates reverse-geocode to detect and display the user's current neighborhood in `#hood`.
- **Card Navigation Links**: Each card with a location renders an official **Google Maps** button (`https://www.google.com/maps/search/?api=1&query=` + encoded address) that opens native Google Maps directions with zero API charges.
- **Distance Sorting**: Distance sorting calculates distance using in-memory Haversine distance in [`js/database-adapter.js`](file:///Users/danielgoodwyn/src/Rolodex/js/database-adapter.js).

### E. Clean URLs & Caching
- **Clean URLs**: Extensionless routing via [`.htaccess`](file:///Users/danielgoodwyn/src/Rolodex/.htaccess) (`/rolodex/`, `/rolodex/login`, `/rolodex/about`) with 301 redirects from `.html` paths.
- **Cachebusting**: Production script and stylesheet references use query versioning (`?v=16`).

---

## 3. Key Files Structure

```text
/Users/danielgoodwyn/src/Rolodex/
├── index.html               # Main Rolodex web dashboard & cards view
├── login.html               # Login, Sign Up, Google Auth, Password Reset, Profile Settings
├── about.html               # About & documentation page
├── .htaccess                # Apache rewrite rules for clean URLs & caching
├── deploy_rolodex.exp       # Expect/SFTP script to deploy web files to IONOS host
├── .env                     # Deployment credentials (SFTP password)
├── css/
│   └── styles.css           # Custom styling (Bootstrap 3 extensions, Google Maps buttons)
├── js/
│   ├── firebase-config.js   # Firebase credentials & initialization
│   ├── database-adapter.js  # Parse SDK emulation on Firebase Auth & Firestore
│   └── rolodex.js           # Core application UI and event logic
├── images/
│   ├── hood.png             # Neighborhood icon
│   └── rolodex.png          # Rolodex logo & default avatar
├── Android-Rolodex/         # Native Android application (Kotlin, Material 3, Firebase)
│   ├── app/
│   │   ├── build.gradle     # Android application Gradle configuration (compileSdk 34)
│   │   ├── google-services.json # Firebase project configuration (rolodex-ade98)
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/daniel/rolodex/
│   │       │   ├── RolodexApp.kt            # App init & offline persistence
│   │       │   ├── data/
│   │       │   │   ├── models/              # Association, Note, CardType
│   │       │   │   ├── repository/          # AuthRepository, RolodexRepository
│   │       │   │   └── location/            # LocationHelper (GPS, Haversine, Geocoder)
│   │       │   └── ui/
│   │       │       ├── auth/                # LoginActivity, ForgotPasswordDialog
│   │       │       ├── main/                # MainActivity, CardsAdapter, NotesAdapter, AddCardBottomSheet, EditCardBottomSheet
│   │       │       └── account/             # AccountActivity
│   │       └── res/                         # Material 3 layouts, drawables, colors, themes (dialog_rating, bottom_sheet_edit_card)
│   ├── build.gradle         # Root Gradle build script (AGP 8.7.0, Kotlin 2.0.21)
│   ├── settings.gradle
│   └── gradlew              # Gradle wrapper executable
└── iOS-Rolodex/             # Native iOS application (Swift 5.0, SwiftUI, iOS 16+)
    ├── project.yml          # XcodeGen specification
    ├── Rolodex.xcodeproj    # Generated Xcode project
    ├── Resources/
    │   ├── Assets.xcassets  # AppIcon (1024x1024), hood.png, rolodex.png
    │   ├── GoogleService-Info.plist # Firebase project configuration (rolodex-ade98)
    │   └── Info.plist       # Plist configuration with rolodex-app URL scheme
    └── Sources/
        ├── RolodexApp.swift # SwiftUI App entry point
        ├── ContentView.swift# Root auth switcher
        ├── MainView.swift   # Main dashboard, search, filter chips, location, sort, expand/collapse
        ├── CardView.swift   # Interactive expandable cards, rating popover/sheet, Google/Apple Maps
        ├── AddCardView.swift# Card creation with OSM geocoding, rating slider, social links
        ├── EditCardView.swift# Card editing with OSM re-geocoding, rating slider, social links
        ├── LoginView.swift  # Authentication view
        ├── AccountView.swift# Profile management & sign out
        ├── Association.swift# Association, LinkedItem, and GeoPoint models
        ├── Note.swift       # Note model
        ├── User.swift       # Auth user model
        ├── Theme.swift      # Brand palette and 1-100 rating color tiers
        ├── FirebaseConfig.swift # Unified Firebase project IDs and endpoints
        ├── FirebaseAuthService.swift # REST Authentication service
        ├── FirestoreService.swift    # REST Firestore queries, CRUD, 2-way linking
        └── LocationManager.swift     # CoreLocation, Nominatim reverse geocode & Haversine
```

---

## 4. Operational Instructions for New Agents

### Building the Native iOS App
The iOS app uses `xcodegen` and pure Swift with zero heavy third-party framework dependencies (compiles in ~3 seconds):
```bash
cd /Users/danielgoodwyn/src/Rolodex/iOS-Rolodex

# Regenerate project if project.yml changed:
xcodegen generate

# Build for iOS Simulator:
xcodebuild -project Rolodex.xcodeproj -scheme Rolodex -destination "generic/platform=iOS Simulator" -configuration Debug build CODE_SIGNING_ALLOWED=NO

# Install and run on booted simulator (e.g. iPhone 18 Pro):
xcrun simctl install booted /Users/danielgoodwyn/Library/Developer/Xcode/DerivedData/Rolodex-*/Build/Products/Debug-iphonesimulator/Rolodex.app
xcrun simctl launch booted daniel.rolodex

# Build for physical device (Team: FKK74MDS69):
xcodebuild -project Rolodex.xcodeproj -scheme Rolodex -destination "id=00008150-00196C9036D3C01C" -configuration Debug build
```

### Building the Native Android App
To compile the native Android application:
```bash
cd /Users/danielgoodwyn/src/Rolodex/Android-Rolodex
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew assembleDebug
# Build release bundle:
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew bundleDebug
```
Built artifacts are placed in `Android-Rolodex/app/build/outputs/apk/debug/app-debug.apk` and `Android-Rolodex/app/build/outputs/bundle/debug/app-debug.aab`.

### Deploying the Web App to Production
Whenever you modify web files, deploy them directly to IONOS production host using the automated script:
```bash
cd /Users/danielgoodwyn/src/Rolodex
./deploy_rolodex.exp
```
*Note: If updating JS or CSS files, make sure to bump the cachebuster version (e.g. from `?v=15` to `?v=16`) across `index.html`, `login.html`, and `about.html` so browsers load the latest code immediately.*

### Git Workflow
Keep git cleanly synced with GitHub:
```bash
git status
git add <files>
git commit -m "Description of changes"
git push origin master
```

### Browser Automation & Verification
When verifying web functionality with browser automation:
1. **Playwright MCP Server**: The repo has `.playwright-mcp/` context configured. Use the `mcp-playwright` tools or launch subagents for browser testing.
2. **Test Flow**:
   - Navigate to `https://danielgoodwyn.com/rolodex/login`
   - Log in with `danielgoodwyn@gmail.com` / `Testpassword123!`
   - Navigate to `https://danielgoodwyn.com/rolodex/`
   - Verify cards, location inputs, neighborhood detection, and links.

---

## 5. Potential Next Steps & Enhancements
- **Interactive Inline Maps**: Embed a lightweight Leaflet / OpenStreetMap interactive map or static thumbnail in each card's location panel.
- **Offline / PWA**: Add a service worker and web manifest for offline access on mobile devices.
- **Export / Import**: Support exporting contacts/cards to vCard (.vcf) or JSON, and importing existing contacts.
- **Contact Sharing**: Generate a shareable public card link or QR code for an association card.
