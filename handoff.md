# Project Handoff: Rolodex

## Status: COMPLETE & VERIFIED IN PRODUCTION

### 1. Goal & Architecture
The legacy 2015 Parse.com-based Rolodex web application has been revived and upgraded to Firebase (Authentication and Cloud Firestore). It is deployed and operational at `https://danielgoodwyn.com/rolodex/`.

### 2. Completed Milestones
1. **Firebase Migration**:
   - Provisioned Firebase Project: `rolodex-ade98` (Project Number: `119025024991`).
   - Enabled Email/Password provider in Firebase Authentication.
   - Configured Cloud Firestore in test mode (`databases/(default)`).
   - Created `js/firebase-config.js` with active credentials.
2. **Compatibility Adapter (`js/database-adapter.js`)**:
   - Drop-in replacement for legacy Parse 1.3.3 SDK.
   - Wraps Firebase v8 SDK (`firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js`).
   - Emulates `Parse.User` (`signUp`, `logIn`, `logOut`, `requestPasswordReset`, `current`) with synchronous `localStorage` caching and reactive auth-state listeners.
   - Emulates `Parse.Object` and `Parse.Query` with client-side filtering and sorting to support regex search and avoid Firestore composite index errors.
   - Emulates `Parse.GeoPoint` and integrates Google Maps Geocoder with fallback.
3. **Forgot Password Feature**:
   - Implemented dedicated "Forgot password?" UI in `login.html`.
   - Connected `Parse.User.requestPasswordReset()` to `firebase.auth().sendPasswordResetEmail()`.
   - Verified end-to-end: sent reset email to `danielgoodwyn@gmail.com`, opened reset link, set new password, and authenticated.
4. **Sign in with Google (Firebase Google Auth Provider)**:
   - Configured Google Sign-In Provider in Firebase Console (`rolodex-ade98`) with support email `danielgoodwyn@gmail.com`.
   - Added `danielgoodwyn.com` to Firebase Authentication Authorized Domains.
   - Implemented `Parse.User.logInWithGoogle()` using `firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())` in `js/database-adapter.js`.
   - Added branded Google Sign-In button and separator in `login.html`.
   - Wired up login state handling in `js/rolodex.js`.
   - Verified end-to-end in production: clicked "Sign in with Google", authenticated via popup with `danielgoodwyn@gmail.com`, and successfully redirected to the active session.
5. **Title Case Every Word for Usernames**:
   - Upgraded `capitaliseFirstLetter()` in `js/rolodex.js` to capitalize the initial letter of every word (supporting spaces, hyphens, and underscores: e.g. "Daniel Goodwyn", "Mary-Ann", "John Doe").
   - Preserved spaces in Google Auth `displayName` and upgraded legacy collapsed usernames.
6. **Profile Picture (Upload, URL, & Auto-Grab Google Photo)**:
   - Auto-grabs Google profile picture from `user.photoURL` on sign-in and auth state changes.
   - Added native file upload with client-side canvas downscaling (max 256x256 WebP/JPEG) for instant uploads and Firestore persistence without requiring Blaze storage billing.
   - Added "Use Google Photo" restore button for Google accounts.
   - Preserved direct URL configuration.
   - Styled circular avatars in navbar and account settings.
7. **Clean URLs & Server Configuration (`.htaccess`)**:
   - Stripped `.html` extensions (`/rolodex/`, `/rolodex/login`, `/rolodex/about`).
   - 301 redirects from legacy `.html` URLs to extensionless URLs.
   - Added cache-control headers (`mod_headers`) and script cachebusting (`?v=7`).
8. **100% Free Location Geocoding & Google Maps Integration ($0 Cost)**:
   - Replaced Google Cloud Geocoder dependency (which required Google Cloud billing accounts and authorization holds) with OpenStreetMap Nominatim for forward and reverse geocoding.
   - Provides free address-to-coordinates geocoding and device GPS-to-neighborhood detection with $0 charges and zero API key requirements.
   - Added direct "Open in Google Maps" navigation links (`https://www.google.com/maps/search/?api=1&query=...`) to each card, leveraging Google's free universal URL scheme to open native Google Maps directions with zero charges.
   - Updated distance sorting to calculate Haversine distance in memory via `database-adapter.js`.
9. **Production Deployment & Verification**:
   - Deployed all assets via SFTP to IONOS production host.
   - Verified HTTP 200 responses on all routes.
   - Verified Card creation, ratings, locations, links, type filtering, name search, ascending/descending sorting, and Google Maps links.

### 3. Key Files
- `index.html`: Main Rolodex cards view.
- `login.html`: User login, signup, Google sign-in, password reset, and account settings.
- `about.html`: Information and documentation.
- `js/database-adapter.js`: Drop-in Parse-to-Firebase adapter (supports Email/Password & Google OAuth).
- `js/firebase-config.js`: Firebase configuration.
- `js/rolodex.js`: Application logic.
- `.htaccess`: Apache clean URL rewrite rules and cache headers.
- `deploy_rolodex.exp`: Automated SFTP deployment script (credentials stored in `.env`).
