//
// MapUITests.swift
// FleetTrackerUITests
//
// Human Tasks:
// 1. Configure test scheme with UI Testing enabled
// 2. Add test data for offline mode testing
// 3. Configure mock location data for testing
// 4. Verify map assets are included in test target
// 5. Set up test environment variables if needed

import XCTest // iOS 14.0+

/// UI test suite for testing map-related functionality
/// Requirements addressed:
/// - Real-time GPS tracking with 30-second intervals (1.2 Scope/Core Functionality)
/// - Interactive mapping using Google Maps Platform (1.2 Scope/Core Functionality)
/// - Route optimization and planning (1.2 Scope/Core Functionality)
/// - Offline operation support (1.2 Scope/Technical Implementation)
class MapUITests: XCTestCase {
    
    // MARK: - Properties
    
    /// Test application instance
    let app = XCUIApplication()
    
    // MARK: - Setup/Teardown
    
    override func setUp() {
        super.setUp()
        
        // Configure test settings
        app.launchArguments += ["--uitesting"]
        app.launchEnvironment["OFFLINE_MODE"] = "false"
        app.launchEnvironment["USE_TEST_DATA"] = "true"
        
        // Launch application and navigate to map screen
        app.launch()
        
        // Navigate to map screen if not already there
        if !app.navigationBars["Fleet Tracking"].exists {
            app.tabBars.buttons["Map"].tap()
        }
        
        // Wait for map to load
        let mapView = app.otherElements["MapView"]
        XCTAssertTrue(mapView.waitForExistence(timeout: 5))
        
        // Handle location permissions dialog if it appears
        let locationDialog = app.alerts.firstMatch
        if locationDialog.waitForExistence(timeout: 3) {
            locationDialog.buttons["Allow While Using App"].tap()
        }
    }
    
    override func tearDown() {
        // Stop any active tracking
        if app.navigationBars["Fleet Tracking"].buttons["Stop Tracking"].exists {
            app.navigationBars["Fleet Tracking"].buttons["Stop Tracking"].tap()
        }
        
        // Reset offline mode
        app.launchEnvironment["OFFLINE_MODE"] = "false"
        
        // Terminate application
        app.terminate()
        
        super.tearDown()
    }
    
    // MARK: - Test Cases
    
    /// Tests initial map loading and display with offline support
    /// Requirements addressed:
    /// - Interactive mapping using Google Maps Platform
    /// - Offline operation support
    func testMapInitialLoad() {
        // Verify map view exists and is visible
        let mapView = app.otherElements["MapView"]
        XCTAssertTrue(mapView.exists)
        XCTAssertTrue(mapView.isHittable)
        
        // Verify map controls are visible
        XCTAssertTrue(app.buttons["ZoomIn"].exists)
        XCTAssertTrue(app.buttons["ZoomOut"].exists)
        XCTAssertTrue(app.buttons["Compass"].exists)
        
        // Verify navigation bar elements
        let navBar = app.navigationBars["Fleet Tracking"]
        XCTAssertTrue(navBar.exists)
        XCTAssertTrue(navBar.buttons["Refresh"].exists)
        
        // Test offline mode indicator
        app.launchEnvironment["OFFLINE_MODE"] = "true"
        app.terminate()
        app.launch()
        
        let offlineLabel = app.staticTexts["Offline Mode"]
        XCTAssertTrue(offlineLabel.waitForExistence(timeout: 5))
    }
    
    /// Tests real-time vehicle tracking functionality with 30-second intervals
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second intervals
    func testVehicleTracking() {
        // Start route tracking
        app.buttons["StartTracking"].tap()
        
        // Wait for vehicle marker to appear
        let vehicleMarker = app.otherElements["VehicleMarker"]
        XCTAssertTrue(vehicleMarker.waitForExistence(timeout: 5))
        
        // Verify location updates at 30-second intervals
        let initialLocation = vehicleMarker.coordinate
        
        // Wait for 35 seconds to ensure update occurs
        Thread.sleep(forTimeInterval: 35)
        
        let updatedLocation = vehicleMarker.coordinate
        XCTAssertNotEqual(initialLocation, updatedLocation)
        
        // Test offline tracking
        app.launchEnvironment["OFFLINE_MODE"] = "true"
        app.terminate()
        app.launch()
        
        // Verify tracking continues in offline mode
        XCTAssertTrue(vehicleMarker.waitForExistence(timeout: 5))
        
        // Wait for another update
        Thread.sleep(forTimeInterval: 35)
        
        let offlineLocation = vehicleMarker.coordinate
        XCTAssertNotEqual(updatedLocation, offlineLocation)
    }
    
    /// Tests route visualization features with offline support
    /// Requirements addressed:
    /// - Route optimization and planning capabilities
    /// - Offline operation support
    func testRouteDisplay() {
        // Select active route
        app.buttons["SelectRoute"].tap()
        app.tables.cells.firstMatch.tap()
        
        // Verify route polyline is displayed
        let routePolyline = app.otherElements["RoutePolyline"]
        XCTAssertTrue(routePolyline.waitForExistence(timeout: 5))
        
        // Verify delivery markers
        let deliveryMarkers = app.otherElements.matching(identifier: "DeliveryMarker")
        XCTAssertGreaterThan(deliveryMarkers.count, 0)
        
        // Test route details display
        deliveryMarkers.firstMatch.tap()
        let detailsView = app.otherElements["DeliveryDetails"]
        XCTAssertTrue(detailsView.waitForExistence(timeout: 3))
        
        // Test offline route persistence
        app.launchEnvironment["OFFLINE_MODE"] = "true"
        app.terminate()
        app.launch()
        
        // Verify route data is still displayed
        XCTAssertTrue(routePolyline.waitForExistence(timeout: 5))
        XCTAssertGreaterThan(deliveryMarkers.count, 0)
    }
    
    /// Tests map interaction gestures in both online and offline modes
    /// Requirements addressed:
    /// - Interactive mapping using Google Maps Platform
    /// - Offline operation support
    func testMapInteractions() {
        let mapView = app.otherElements["MapView"]
        
        // Test zoom gestures
        let initialScale = mapView.value as? String
        mapView.pinch(withScale: 2, velocity: 1)
        let zoomedScale = mapView.value as? String
        XCTAssertNotEqual(initialScale, zoomedScale)
        
        // Test pan gesture
        let start = mapView.coordinate
        mapView.swipeLeft()
        let end = mapView.coordinate
        XCTAssertNotEqual(start.longitude, end.longitude)
        
        // Test marker selection
        let marker = app.otherElements["VehicleMarker"]
        marker.tap()
        let callout = app.otherElements["MarkerCallout"]
        XCTAssertTrue(callout.waitForExistence(timeout: 2))
        
        // Test interactions in offline mode
        app.launchEnvironment["OFFLINE_MODE"] = "true"
        app.terminate()
        app.launch()
        
        // Verify gestures still work offline
        mapView.pinch(withScale: 0.5, velocity: -1)
        mapView.swipeRight()
        marker.tap()
        XCTAssertTrue(callout.waitForExistence(timeout: 2))
    }
}