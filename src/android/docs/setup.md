# Fleet Tracking Android App Setup Guide

## HUMAN TASKS
- [ ] Obtain Google Maps API key and replace GOOGLE_MAPS_API_KEY in app.json
- [ ] Configure Firebase project and place google-services.json in android/app/
- [ ] Set up development machine with required hardware/software specifications
- [ ] Configure environment variables in local development environment
- [ ] Request necessary development certificates and credentials

## Prerequisites

### System Requirements
- Windows 10/11 or macOS 10.15+
- Minimum 8GB RAM (16GB recommended)
- 256GB storage space
- Intel/AMD x64 processor or Apple Silicon

### Required Software
- Node.js 16.0.0 or later
- Android Studio Chipmunk (2021.2.1) or later
- Java Development Kit (JDK) 11
- Git

### Android SDK Requirements
- Android SDK Platform 31 (Android 12.0)
- Android SDK Build-Tools 31.0.0
- Google Play services
- Intel x86 Atom System Image or Google APIs ARM 64 v8a System Image
- Android SDK Platform-Tools

## Development Environment Setup

### 1. Node.js Installation
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 16
nvm use 16

# Verify installation
node --version  # Should be ≥16.0.0
npm --version
```

### 2. Android Studio Installation
1. Download Android Studio from https://developer.android.com/studio
2. Run the installer and follow the setup wizard
3. During installation, ensure the following components are selected:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
   - Performance (Intel HAXM)

### 3. JDK Configuration
```bash
# macOS (using Homebrew)
brew install openjdk@11

# Windows
# Download OpenJDK 11 from https://adoptium.net/
# Run the installer
```

### 4. Environment Variables Setup
Add the following to your shell profile (~/.bash_profile, ~/.zshrc, etc.):

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk  # Windows

# Add platform tools to path
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Java
export JAVA_HOME=/path/to/jdk-11  # Update with actual path
export PATH=$PATH:$JAVA_HOME/bin

# Google Maps
export GOOGLE_MAPS_API_KEY="your_api_key_here"
```

## Project Setup

### 1. Repository Setup
```bash
# Clone the repository
git clone <repository_url>
cd fleet-tracker

# Install dependencies
npm install
```

### 2. Android Configuration
1. Open Android Studio
2. Open the android folder as a project
3. Wait for Gradle sync to complete
4. Configure Google Services:
   - Place google-services.json in android/app/
   - Verify package name matches in app.json

### 3. Permissions Setup
The following permissions are configured in app.json:
- Location services (background and foreground)
- Camera access
- External storage
- Google Maps integration

### 4. Offline Storage Configuration
```bash
# Initialize SQLite database
npx expo install expo-sqlite
npx expo install @react-native-async-storage/async-storage

# Configure background tasks
npx expo install expo-background-fetch
npx expo install expo-task-manager
```

## Build Configuration

### Debug Build
```bash
# Start Metro bundler
npm start

# Run on Android device/emulator
npm run android

# Or using specific device
npm run android --deviceId=device_id
```

### Release Build
1. Generate upload key:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore fleet-tracker.keystore -alias fleet-tracker -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure signing in android/app/build.gradle:
```gradle
signingConfigs {
    release {
        storeFile file('fleet-tracker.keystore')
        storePassword System.getenv('KEYSTORE_PASSWORD')
        keyAlias 'fleet-tracker'
        keyPassword System.getenv('KEY_PASSWORD')
    }
}
```

3. Build release APK:
```bash
cd android
./gradlew assembleRelease
```

## Running the Application

### Development Mode
```bash
# Start with development server
npm start
```

### Debug Mode
```bash
# Run with debugging enabled
npm run android:debug
```

### Release Mode
```bash
# Run release build
npm run android:release
```

## Troubleshooting

### Common Build Issues
1. Gradle sync failures
   - Clean project: `cd android && ./gradlew clean`
   - Delete .gradle folder: `rm -rf ~/.gradle/caches/`
   - Sync project in Android Studio

2. SDK version mismatches
   - Verify buildToolsVersion in build.gradle
   - Check compileSdkVersion matches app.json
   - Update SDK tools in Android Studio

3. Missing dependencies
   - Run `npm install`
   - Clear npm cache: `npm cache clean --force`
   - Check node_modules exists

4. Google Play services configuration
   - Verify google-services.json is present
   - Check package name matches in app.json
   - Update Google Play services in SDK Manager

### Runtime Issues
1. Location permission errors
   - Check manifest permissions
   - Verify runtime permissions handling
   - Test background location access

2. Camera access issues
   - Grant camera permissions manually
   - Check expo-camera installation
   - Verify AndroidManifest.xml

3. Storage permission problems
   - Check WRITE_EXTERNAL_STORAGE permission
   - Verify storage access implementation
   - Test on different Android versions

4. Background task failures
   - Check task registration
   - Verify background fetch configuration
   - Test task manager implementation

5. Offline database issues
   - Check SQLite initialization
   - Verify database schema
   - Test synchronization logic

## Performance Optimization

### Background Location
```javascript
// Optimize location tracking intervals
{
  distanceInterval: 100, // meters
  timeInterval: 30000,   // milliseconds
  accuracy: 'balanced'
}
```

### File Storage
```javascript
// Configure storage paths
const STORAGE_PATHS = {
  DELIVERY_IMAGES: 'deliveries/images/',
  SIGNATURES: 'deliveries/signatures/',
  CACHE: 'cache/'
};
```

### Background Tasks
```javascript
// Configure task intervals
{
  minimumInterval: 900, // 15 minutes
  stopOnTerminate: false,
  startOnBoot: true
}
```

## Security Considerations

1. API Key Protection
   - Store sensitive keys in gradle.properties
   - Use environment variables for CI/CD
   - Implement API key encryption

2. Data Encryption
   - Implement SQLite encryption
   - Secure file storage
   - Protect API communications

3. Authentication
   - Implement secure token storage
   - Handle session management
   - Secure background operations