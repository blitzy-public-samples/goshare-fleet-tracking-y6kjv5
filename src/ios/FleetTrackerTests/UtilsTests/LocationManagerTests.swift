//
// LocationManagerTests.swift
// FleetTrackerTests
//
// Human Tasks:
// 1. Ensure XCTest framework is properly linked in test target
// 2. Configure test target with appropriate location usage descriptions
// 3. Enable location simulation in test scheme settings
// 4. Add test location GPX files to test bundle for simulated routes

import XCTest  // iOS 14.0+
import CoreLocation  // iOS 14.0+
@testable import FleetTracker

class LocationManagerTests: XCTestCase {
    
    // MARK: - Properties
    
    private var sut: LocationManager!
    private var mockDelegate: MockLocationUpdateDelegate!
    private let testVehicleId = "TEST_VEHICLE_001"
    private let testDriverId = "TEST_DRIVER_001"
    
    // MARK: - Setup & Teardown
    
    override func setUp() {
        super.setUp()
        sut = LocationManager.shared()
        mockDelegate = MockLocationUpdateDelegate()
        sut.delegate = mockDelegate
    }
    
    override func tearDown() {
        sut.stopTracking()
        mockDelegate = nil
        super.tearDown()
    }
    
    // MARK: - Location Tracking Tests
    
    /// Tests location tracking initialization with 30-second update interval
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Performance Requirements: 30-second maximum data latency
    func testStartTracking() {
        // Given
        let locationManager = sut.value(forKey: "locationManager") as! CLLocationManager
        
        // When
        sut.startTracking(vehicleId: testVehicleId, driverId: testDriverId)
        
        // Then
        XCTAssertTrue(sut.isTracking)
        XCTAssertEqual(sut.currentVehicleId, testVehicleId)
        XCTAssertEqual(sut.currentDriverId, testDriverId)
        XCTAssertEqual(locationManager.desiredAccuracy, LocationConstants.desiredAccuracy)
        XCTAssertEqual(locationManager.distanceFilter, LocationConstants.distanceFilter)
        XCTAssertTrue(locationManager.allowsBackgroundLocationUpdates)
        XCTAssertFalse(locationManager.pausesLocationUpdatesAutomatically)
    }
    
    /// Tests location tracking termination and cleanup
    func testStopTracking() {
        // Given
        sut.startTracking(vehicleId: testVehicleId)
        let testRegion = CLCircularRegion(center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
                                        radius: 1000,
                                        identifier: "TEST_REGION")
        sut.startMonitoringRegion(testRegion)
        
        // When
        sut.stopTracking()
        
        // Then
        XCTAssertFalse(sut.isTracking)
        XCTAssertNil(sut.currentVehicleId)
        XCTAssertNil(sut.currentDriverId)
        XCTAssertEqual(mockDelegate.enteredRegions.count, 0)
        XCTAssertEqual(mockDelegate.exitedRegions.count, 0)
    }
    
    /// Tests location update handling with offline support
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Offline operation support
    func testLocationUpdates() {
        // Given
        sut.startTracking(vehicleId: testVehicleId)
        let locationManager = sut.value(forKey: "locationManager") as! CLLocationManager
        let testLocation = CLLocation(latitude: 37.7749, longitude: -122.4194)
        
        // When
        locationManager.delegate?.locationManager?(locationManager, didUpdateLocations: [testLocation])
        
        // Then
        XCTAssertEqual(mockDelegate.receivedLocations.count, 1)
        XCTAssertEqual(mockDelegate.receivedLocations.first?.vehicleId, testVehicleId)
        XCTAssertFalse(sut.isOfflineMode)
        
        // Test offline mode
        let networkError = NSError(domain: kCLErrorDomain, code: 0, userInfo: nil)
        locationManager.delegate?.locationManager?(locationManager, didFailWithError: networkError)
        XCTAssertTrue(sut.isOfflineMode)
    }
    
    /// Tests geofence region monitoring within valid radius limits
    /// Requirements addressed:
    /// - Geofencing and zone management capabilities
    func testGeofenceMonitoring() {
        // Given
        let validRegion = CLCircularRegion(center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
                                         radius: LocationConstants.minimumGeofenceRadius + 100,
                                         identifier: "VALID_REGION")
        let invalidRegion = CLCircularRegion(center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
                                           radius: LocationConstants.minimumGeofenceRadius - 10,
                                           identifier: "INVALID_REGION")
        let locationManager = sut.value(forKey: "locationManager") as! CLLocationManager
        
        // When - Test valid region
        sut.startMonitoringRegion(validRegion)
        locationManager.delegate?.locationManager?(locationManager, didEnterRegion: validRegion)
        
        // Then
        XCTAssertEqual(mockDelegate.enteredRegions.count, 1)
        XCTAssertEqual(mockDelegate.enteredRegions.first?.identifier, "VALID_REGION")
        
        // When - Test invalid region
        sut.startMonitoringRegion(invalidRegion)
        
        // Then
        XCTAssertEqual(mockDelegate.receivedErrors.count, 1)
        XCTAssertEqual((mockDelegate.receivedErrors.first as NSError).code, 400)
    }
}

// MARK: - Mock Location Update Delegate

class MockLocationUpdateDelegate: NSObject, LocationUpdateDelegate {
    var receivedLocations: [Location] = []
    var receivedErrors: [Error] = []
    var enteredRegions: [CLRegion] = []
    var exitedRegions: [CLRegion] = []
    var isOfflineMode: Bool = false
    
    func didUpdateLocation(_ location: Location) {
        receivedLocations.append(location)
    }
    
    func didFailWithError(_ error: Error) {
        receivedErrors.append(error)
        if (error as NSError).domain == kCLErrorDomain {
            isOfflineMode = true
        }
    }
    
    func didEnterRegion(_ region: CLRegion) {
        enteredRegions.append(region)
    }
    
    func didExitRegion(_ region: CLRegion) {
        exitedRegions.append(region)
    }
}