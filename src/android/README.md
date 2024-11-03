# Live Fleet Tracking System - Android Mobile Application

## Human Tasks
- [ ] Configure Google Maps API key in android/app/src/main/res/values/strings.xml
- [ ] Set up Firebase project and add google-services.json to android/app/
- [ ] Configure signing keys for release builds
- [ ] Set up environment variables for CI/CD pipeline
- [ ] Request necessary development certificates and credentials

## Project Overview

### System Requirements
- Android SDK 24+ (Android 7.0 Nougat or higher)
- Target SDK: Android 13 (API Level 33)
- Compile SDK: Android 13 (API Level 33)
- Google Play Services
- Minimum 2GB RAM
- GPS/Location Services
- Camera (for proof of delivery)
- Internet connectivity (with offline support)

### Key Features
- Real-time GPS location tracking
- Offline-first architecture
- Digital proof of delivery
- Route optimization
- Background location updates
- Push notifications
- Secure data synchronization
- Offline storage capabilities

### Architecture Overview
- React Native 0.71.8
- SQLite database using Room 2.5.0
- Firebase Cloud Messaging 23.2.0
- Google Maps integration (21.0.1)
- Location Services (21.0.1)
- AsyncStorage for key-value storage
- Background services for location tracking
- Offline-first data handling

## Getting Started

### Prerequisites
- Node.js 16+
- Java Development Kit (JDK) 11
- Android Studio
- Android SDK Platform 33
- Android Build Tools
- Google Play Services
- Git

### Installation Steps
1. Clone the repository
```bash
git clone <repository-url>
cd src/android
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
# Copy and edit environment configuration
cp .env.example .env
```

4. Install Android SDK components
```bash
# Using Android Studio SDK Manager
- Android SDK Platform 33
- Google Play Services
- Android Build Tools
```

### Configuration
1. Firebase Setup
- Create a Firebase project
- Download google-services.json
- Place in android/app/

2. Google Maps Configuration
- Obtain API key from Google Cloud Console
- Add to android/app/src/main/res/values/strings.xml

3. Build Configuration
- Configure signing keys
- Set up environment variables
- Update build.gradle settings

## Development

### Build Process
1. Development Build
```bash
npm run android
```

2. Release Build
```bash
cd android
./gradlew assembleRelease
```

### Testing
- Unit Tests: `npm test`
- Integration Tests: `npm run test:integration`
- E2E Tests: `npm run test:e2e`

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- React Native best practices

### Debugging
- React Native Debugger
- Chrome Developer Tools
- Android Studio Debugger
- Flipper integration

## Deployment

### Build Generation
1. Configure signing keys
```bash
keytool -genkey -v -keystore release.keystore -alias fleet-tracker -keyalg RSA -keysize 2048 -validity 10000
```

2. Update build.gradle
```gradle
signingConfigs {
    release {
        storeFile file("release.keystore")
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias "fleet-tracker"
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
```

3. Generate release build
```bash
cd android
./gradlew bundleRelease
```

### Play Store Publishing
1. Create release in Google Play Console
2. Upload signed AAB/APK
3. Configure store listing
4. Submit for review

### CI/CD Integration
- GitHub Actions workflow
- Automated testing
- Build verification
- Release deployment
- Version management

## Technical Details

### Key Dependencies
- react-native: 0.71.8
- firebase-messaging: 23.2.0
- play-services-maps: 21.0.1
- play-services-location: 21.0.1
- room-runtime: 2.5.0

### Offline Capabilities
- SQLite database using Room
- AsyncStorage for key-value pairs
- Background location tracking
- Offline proof of delivery
- Data synchronization
- Conflict resolution
- Queue management

### Performance Optimizations
- Image compression
- Lazy loading
- Memory management
- Battery optimization
- Network handling
- Cache management

## Version Information
- Version: 1.0.0
- Last Updated: YYYY-MM-DD
- Maintainers: Mobile Development Team
- License: Proprietary
- Repository: Live Fleet Tracking System