# Live Fleet Tracking System - Android Deployment Guide

## HUMAN TASKS
- [ ] Obtain and configure Google Play Console access
- [ ] Set up signing keys and keystore for release builds
- [ ] Configure CI/CD environment variables in GitHub Actions
- [ ] Set up Firebase project and obtain google-services.json
- [ ] Configure monitoring and crash reporting tools
- [ ] Verify Play Store listing requirements and assets
- [ ] Set up automated testing infrastructure

## 1. Overview

This guide details the deployment process for the React Native-based Android mobile application of the Live Fleet Tracking System. The deployment strategy is designed to ensure reliable, secure, and efficient delivery of updates while maintaining high performance and stability.

### 1.1 Environment Configurations

| Environment | API Endpoint | Build Type | Features |
|-------------|-------------|------------|-----------|
| Development | dev-api.fleettracker.com | debug | Detailed logging, debug menu, test accounts |
| Staging | staging-api.fleettracker.com | release | Crash reporting, analytics, staging data |
| Production | api.fleettracker.com | release | Crash reporting, analytics, production data |

### 1.2 Release Types

| Build Type | Signing Config | ProGuard | Debuggable |
|------------|---------------|-----------|------------|
| Debug | debug | Disabled | Yes |
| Release | release | Enabled | No |

## 2. Build Process

### 2.1 Debug Build Configuration

```gradle
android {
    defaultConfig {
        applicationId "com.fleettracker"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
    
    buildTypes {
        debug {
            debuggable true
            minifyEnabled false
            signingConfig signingConfigs.debug
            buildConfigField "String", "API_BASE_URL", "\"https://dev-api.fleettracker.com\""
            buildConfigField "String", "SOCKET_URL", "\"wss://dev-api.fleettracker.com/ws\""
        }
    }
}
```

### 2.2 Release Build Configuration

```gradle
android {
    signingConfigs {
        release {
            storeFile file(KEYSTORE_FILE)
            storePassword STORE_PASSWORD
            keyAlias KEY_ALIAS
            keyPassword KEY_PASSWORD
        }
    }
    
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
            buildConfigField "String", "API_BASE_URL", "\"https://api.fleettracker.com\""
            buildConfigField "String", "SOCKET_URL", "\"wss://api.fleettracker.com/ws\""
        }
    }
}
```

### 2.3 ProGuard Configuration

```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# SQLite
-keep class org.sqlite.** { *; }
-keep class org.sqlite.database.** { *; }

# Google Maps
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.location.** { *; }

# Socket.IO
-keep class io.socket.** { *; }
-keep class okhttp3.** { *; }

# Custom Native Modules
-keep class com.fleettracker.modules.** { *; }
```

## 3. Release Management

### 3.1 Semantic Versioning

```javascript
{
  "version": {
    "major": 1,    // Breaking changes
    "minor": 0,    // New features
    "patch": 0,    // Bug fixes
    "build": 100   // Internal build number
  }
}
```

### 3.2 Release Notes Template

```markdown
## Version 1.0.0 (100)

### New Features
- Feature description
- Feature description

### Improvements
- Improvement description
- Improvement description

### Bug Fixes
- Fix description
- Fix description

### Security Updates
- Security update description
- Security update description
```

### 3.3 Git Tagging Convention

```bash
# Format: v<major>.<minor>.<patch>
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

```yaml
name: Android CI/CD

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 11
        uses: actions/setup-java@v3
        with:
          java-version: '11'
          distribution: 'adopt'
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run tests
        run: npm test
        
      - name: Build Release APK
        run: |
          cd android
          ./gradlew assembleRelease
        env:
          KEYSTORE_FILE: ${{ secrets.KEYSTORE_FILE }}
          STORE_PASSWORD: ${{ secrets.STORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
          
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

## 5. Play Store Deployment

### 5.1 App Signing Configuration

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../keystores/release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
}
```

### 5.2 Release Tracks

| Track | Purpose | Audience |
|-------|---------|----------|
| Internal | Team testing | Development team |
| Alpha | Feature testing | QA team |
| Beta | User acceptance | Selected users |
| Production | Public release | All users |

### 5.3 Phased Rollout Strategy

```javascript
const rolloutPhases = {
  phase1: {
    percentage: 10,
    duration: '24h',
    metrics: ['crashes', 'anr']
  },
  phase2: {
    percentage: 25,
    duration: '48h',
    metrics: ['crashes', 'anr', 'retention']
  },
  phase3: {
    percentage: 50,
    duration: '72h',
    metrics: ['crashes', 'anr', 'retention', 'performance']
  },
  phase4: {
    percentage: 100,
    duration: '96h',
    metrics: ['crashes', 'anr', 'retention', 'performance', 'reviews']
  }
};
```

## 6. Security Measures

### 6.1 Code Signing Process

```bash
# Generate release keystore
keytool -genkey -v -keystore release.keystore -alias fleet-tracker -keyalg RSA -keysize 2048 -validity 10000

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore release.keystore app-release-unsigned.apk fleet-tracker

# Verify signing
jarsigner -verify -verbose -certs app-release.apk
```

### 6.2 Sensitive Data Protection

```javascript
// Environment variables encryption
const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 64
};

// API key storage
const securityConfig = {
  apiKeys: {
    storage: 'android-keystore',
    encryption: true,
    accessControl: 'biometric'
  }
};
```

## 7. Performance Optimization

### 7.1 Bundle Size Optimization

```javascript
// Asset optimization configuration
const assetConfig = {
  images: {
    compression: 'high',
    maxWidth: 1024,
    quality: 0.8
  },
  fonts: {
    subsets: ['latin'],
    display: 'swap'
  }
};

// Code splitting configuration
const bundleConfig = {
  splitChunks: true,
  minSize: 30000,
  maxSize: 250000
};
```

### 7.2 Load Time Optimization

```javascript
// Performance configuration
const performanceConfig = {
  initialRoute: {
    prefetch: true,
    preload: ['essential']
  },
  images: {
    lazyLoad: true,
    placeholder: 'blur'
  },
  networking: {
    timeout: 30000,
    retries: 3
  }
};
```

## 8. Monitoring

### 8.1 Crash Reporting Setup

```javascript
// Firebase Crashlytics configuration
const crashlyticsConfig = {
  enabled: true,
  collectCrashReports: true,
  debugMode: __DEV__,
  customKeys: [
    'userId',
    'sessionId',
    'routeId'
  ]
};
```

### 8.2 Analytics Implementation

```javascript
// Analytics events configuration
const analyticsConfig = {
  events: {
    startup: ['timestamp', 'deviceInfo'],
    navigation: ['screen', 'timestamp'],
    delivery: ['status', 'timestamp', 'location'],
    error: ['type', 'message', 'stackTrace']
  },
  userProperties: {
    role: true,
    region: true,
    appVersion: true
  }
};
```

### 8.3 Performance Monitoring

```javascript
// Performance metrics configuration
const performanceMetrics = {
  network: {
    timeToFirstByte: true,
    responseTime: true,
    failureRate: true
  },
  app: {
    startupTime: true,
    frameRate: true,
    memoryUsage: true
  },
  custom: {
    routeLoadTime: true,
    mapRenderTime: true,
    syncDuration: true
  }
};
```

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-19 | Initial release |

## 10. Contact Information

- Mobile Team Lead: mobile.lead@fleettracker.com
- DevOps Engineer: devops@fleettracker.com
- Release Manager: release@fleettracker.com