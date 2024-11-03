//
// LocationServiceTests.swift
// FleetTrackerTests
//
// Human Tasks:
// 1. Ensure XCTest framework is properly linked in test target
// 2. Configure test scheme with proper environment variables
// 3. Set up mock location data for consistent test results
// 4. Configure test coverage thresholds in project settings
// 5. Set up CI pipeline test reporting integration

import XCTest  // iOS 14.0+
import CoreLocation  // iOS 14.0+
@testable import FleetTracker

/// Test suite for LocationService functionality including tracking, persistence, and synchronization
/// Requirements addressed:
/// - Real-time GPS tracking with 30-second update intervals
/// - Offline operation support
/// - Real-time data synchronization between mobile and backend
/// - Performance Requirements: 30-second maximum data latency
class LocationServiceTests: XCTestCase {
    
    // MARK: - Properties
    
    /// System under test
    private var sut: LocationService!
    
    /// Mock repository for testing
    private var mockRepository: MockLocationRepository!
    
    // MARK: - Test Lifecycle
    
    override func setUp() {
        super.setUp()
        mockRepository = MockLocationRepository()
        sut = LocationService(repository: mockRepository)
    }
    
    override func tearDown() {
        sut.stopTracking()
        mockRepository.savedLocations.removeAll()
        mockRepository.syncCalled = false
        mockRepository.clearCalled = false
        sut = nil
        mockRepository = nil
        super.tearDown()
    }
    
    // MARK: - Test Cases
    
    /// Tests location tracking initialization with 30-second intervals
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Performance Requirements: 30-second maximum data latency
    func testStartTrackingInitializesLocationManager() {
        // Given
        let testVehicleId = "TEST-VEHICLE-001"
        let expectation = XCTestExpectation(description: "Location manager initialized")
        
        // When
        sut.startTracking(vehicleId: testVehicleId)
        
        // Then
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            XCTAssertTrue(self.sut.locationManager.isTracking)
            XCTAssertEqual(self.sut.locationManager.desiredAccuracy, kCLLocationAccuracyBest)
            XCTAssertEqual(self.sut.locationManager.distanceFilter, LocationConstants.desiredAccuracy)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 2.0)
    }
    
    /// Tests location update persistence and validation
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Offline operation support
    func testLocationUpdateIsPersisted() {
        // Given
        let testVehicleId = "TEST-VEHICLE-001"
        let testLocation = CLLocation(
            coordinate: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
            altitude: 0,
            horizontalAccuracy: 10,
            verticalAccuracy: 10,
            course: 180,
            speed: 15,
            timestamp: Date()
        )
        let expectation = XCTestExpectation(description: "Location persisted")
        
        // When
        sut.startTracking(vehicleId: testVehicleId)
        sut.didUpdateLocation(testLocation)
        
        // Then
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            XCTAssertEqual(self.mockRepository.savedLocations.count, 1)
            let savedLocation = self.mockRepository.savedLocations.first
            XCTAssertNotNil(savedLocation)
            XCTAssertEqual(savedLocation?.vehicleId, testVehicleId)
            XCTAssertEqual(savedLocation?.coordinate.latitude, testLocation.coordinate.latitude, accuracy: 0.0001)
            XCTAssertEqual(savedLocation?.coordinate.longitude, testLocation.coordinate.longitude, accuracy: 0.0001)
            XCTAssertTrue(savedLocation?.isValid() ?? false)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 2.0)
    }
    
    /// Tests location synchronization with 30-second intervals
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    /// - Performance Requirements: 30-second maximum data latency
    func testLocationSyncTriggered() {
        // Given
        let testVehicleId = "TEST-VEHICLE-001"
        let syncExpectation = XCTestExpectation(description: "Sync triggered")
        
        // When
        sut.startTracking(vehicleId: testVehicleId)
        
        // Then
        DispatchQueue.main.asyncAfter(deadline: .now() + 31) { // Wait for sync interval
            XCTAssertTrue(self.mockRepository.syncCalled)
            XCTAssertTrue(self.mockRepository.clearCalled)
            syncExpectation.fulfill()
        }
        
        wait(for: [syncExpectation], timeout: 32.0)
    }
    
    /// Tests cleanup operations when tracking is stopped
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    /// - Offline operation support
    func testStopTrackingCleansUp() {
        // Given
        let testVehicleId = "TEST-VEHICLE-001"
        let expectation = XCTestExpectation(description: "Tracking stopped")
        
        // When
        sut.startTracking(vehicleId: testVehicleId)
        sut.stopTracking()
        
        // Then
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            XCTAssertFalse(self.sut.locationManager.isTracking)
            XCTAssertTrue(self.mockRepository.syncCalled) // Final sync attempted
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 2.0)
    }
}

// MARK: - Mock Location Repository

/// Mock repository class for testing location persistence and synchronization
class MockLocationRepository: LocationRepository {
    
    // MARK: - Properties
    
    var savedLocations: [Location] = []
    var syncCalled: Bool = false
    var clearCalled: Bool = false
    
    // MARK: - LocationRepository Override
    
    override func saveLocation(_ location: Location) -> Bool {
        guard location.isValid() else { return false }
        savedLocations.append(location)
        return true
    }
    
    override func syncUnsyncedLocations() {
        syncCalled = true
        savedLocations.indices.forEach { savedLocations[$0].isSynced = true }
    }
    
    override func clearSyncedLocations(_ locationIds: [String]) {
        clearCalled = true
        savedLocations.removeAll { $0.isSynced }
    }
}