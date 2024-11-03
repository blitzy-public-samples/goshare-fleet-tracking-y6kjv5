# Fleet Tracker iOS Application

## Project Overview

The Fleet Tracker iOS application is a robust, enterprise-grade mobile solution for real-time fleet tracking and delivery management. Built with Swift 5.7, the application provides comprehensive features including:

- Real-time GPS tracking with 30-second update intervals
- Offline-first architecture for uninterrupted operation
- Digital proof of delivery capabilities
- Background location tracking
- Push notification support
- Secure data synchronization

## Prerequisites

### Required Tools
- Xcode 14.0+
- CocoaPods 1.12.0
- Swift 5.7

### System Requirements
- macOS Monterey (12.0) or later
- iOS 14.0+ deployment target
- Apple Developer Program membership

## Getting Started

### 1. Environment Setup

```bash
# Install CocoaPods if not already installed
sudo gem install cocoapods

# Install project dependencies
cd src/ios
pod install

# Open workspace in Xcode
open FleetTracker.xcworkspace
```

### 2. Configuration Setup

1. Copy Debug.xcconfig.example to Debug.xcconfig
2. Copy Release.xcconfig.example to Release.xcconfig
3. Configure environment-specific variables:
   - API_BASE_URL
   - SOCKET_URL
   - MAPS_API_KEY

### 3. Location Services Setup

Add the following keys to Info.plist:
```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Fleet Tracker requires location access for real-time tracking</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Fleet Tracker needs your location to track deliveries</string>
```

### 4. Background Capabilities

Enable the following capabilities in Xcode:
- Background Modes
  - Location updates
  - Background fetch
  - Remote notifications

## Project Structure

```
FleetTracker/
├── Application/
│   ├── Config/
│   ├── Constants/
│   ├── Extensions/
│   ├── Protocols/
│   └── Utils/
├── Data/
│   ├── Models/
│   ├── Repository/
│   ├── Services/
│   └── Database/
├── Presentation/
│   ├── Auth/
│   ├── Dashboard/
│   ├── Delivery/
│   ├── Map/
│   ├── Route/
│   └── Settings/
└── Resources/
```

## Configuration

### Development Environment
- Local API endpoint: http://localhost:3000
- WebSocket: ws://localhost:3000
- Debug logging enabled
- Crash reporting disabled
- Test coverage enabled

### Production Environment
- Secure API endpoint: https://api.fleettracker.com
- Secure WebSocket: wss://api.fleettracker.com
- Error-level logging only
- Crash reporting enabled
- SSL certificate pinning

## Development

### Building the Project
```bash
# Build for development
xcodebuild -workspace FleetTracker.xcworkspace -scheme FleetTracker -configuration Debug

# Build for release
xcodebuild -workspace FleetTracker.xcworkspace -scheme FleetTracker -configuration Release
```

### Location Testing
1. Enable location simulation in Xcode
2. Use GPX files in Resources/GPXFiles for route simulation
3. Test background location updates using Debug > Simulate Background Fetch

### Offline Development
1. Enable airplane mode on device/simulator
2. Perform operations to test offline queue
3. Verify data synchronization when connection restored

## Testing

### Running Tests
```bash
# Run unit tests
xcodebuild test -workspace FleetTracker.xcworkspace -scheme FleetTracker -destination 'platform=iOS Simulator,name=iPhone 14'

# Run UI tests
xcodebuild test -workspace FleetTracker.xcworkspace -scheme FleetTrackerUITests -destination 'platform=iOS Simulator,name=iPhone 14'
```

### Test Coverage
- Unit tests for business logic
- Integration tests for API services
- UI tests for critical user flows
- Location service tests
- Offline functionality tests

## Deployment

### App Store Deployment
1. Configure version and build number
2. Update release notes
3. Archive the application
4. Submit for App Store review

### Enterprise Distribution
1. Configure enterprise provisioning profile
2. Build for enterprise distribution
3. Deploy via MDM solution

### Required Certificates
- Apple Push Notification service (APNs) certificate
- Distribution certificate
- Provisioning profiles for development and distribution

## Troubleshooting

### Common Issues

#### Location Tracking
- Verify location permissions are granted
- Check background modes are enabled
- Ensure proper usage description in Info.plist

#### Offline Sync
- Check CoreData persistence setup
- Verify sync queue implementation
- Monitor background task execution

#### Background Operation
- Validate background capability configuration
- Check background task registration
- Monitor background refresh intervals

### Debug Tools
- Xcode Console for logs
- Network Link Conditioner for connectivity testing
- Instruments for performance profiling
- Debug gauges for resource monitoring

## Human Tasks Checklist

### Development Setup
- [ ] Configure MAPS_API_KEY_DEV in local environment
- [ ] Set up development API server
- [ ] Configure push notification certificates
- [ ] Add required capabilities in Xcode project

### Production Setup
- [ ] Configure MAPS_API_KEY_PROD in CI/CD
- [ ] Verify API and WebSocket DNS configurations
- [ ] Set up SSL certificates
- [ ] Configure crash reporting service

### App Store Preparation
- [ ] Create App Store provisioning profile
- [ ] Configure app signing
- [ ] Prepare app privacy details
- [ ] Create app store screenshots