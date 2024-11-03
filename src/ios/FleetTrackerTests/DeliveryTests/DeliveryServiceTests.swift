//
// DeliveryServiceTests.swift
// FleetTrackerTests
//
// Human Tasks:
// 1. Ensure XCTest framework is properly linked in test target
// 2. Configure test scheme with appropriate environment variables
// 3. Set up mock data files in test bundle if needed
// 4. Verify CoreData test configuration is properly set up

import XCTest  // iOS 14.0+
import Combine  // iOS 14.0+
import Foundation  // iOS 14.0+
@testable import FleetTracker

/// Test suite for DeliveryService functionality including offline capabilities
/// Requirements addressed:
/// - Digital proof of delivery capabilities (1.2 Scope/Core Functionality)
/// - Offline data handling capabilities (1.2 Scope/Technical Implementation)
/// - Real-time data synchronization (1.2 Scope/Technical Implementation)
class DeliveryServiceTests: XCTestCase {
    
    // MARK: - Properties
    
    private var sut: DeliveryService!
    private var mockRepository: DeliveryRepository!
    private var cancellables: Set<AnyCancellable>!
    
    // MARK: - Test Lifecycle
    
    override func setUp() {
        super.setUp()
        
        // Initialize test dependencies
        let mockCoreDataManager = MockCoreDataManager()
        let mockNetworkManager = MockNetworkManager()
        mockRepository = DeliveryRepository()
        mockRepository.coreDataManager = mockCoreDataManager
        mockRepository.networkManager = mockNetworkManager
        
        // Initialize system under test
        sut = DeliveryService(repository: mockRepository)
        
        // Initialize cancellables set for Combine subscriptions
        cancellables = Set<AnyCancellable>()
    }
    
    override func tearDown() {
        // Cancel all active subscriptions
        cancellables.forEach { $0.cancel() }
        cancellables = nil
        
        // Reset mock repository state
        mockRepository = nil
        
        // Clear system under test
        sut = nil
        
        super.tearDown()
    }
    
    // MARK: - Status Update Tests
    
    /// Tests delivery status update functionality with offline support
    /// Requirement: Real-time data synchronization between mobile and backend
    func testUpdateDeliveryStatus() {
        // Given
        let expectation = XCTestExpectation(description: "Status update completed")
        let deliveryId = "TEST-001"
        let newStatus = DeliveryStatus.inTransit
        
        // Create test delivery
        let testDelivery = Delivery(
            id: deliveryId,
            routeId: "ROUTE-001",
            customerId: "CUST-001",
            address: "123 Test St",
            scheduledDate: Date()
        )
        
        // Setup repository expectations
        mockRepository.updateDeliveryStatusResult = .success(testDelivery)
        
        // When
        let result = sut.updateDeliveryStatus(deliveryId: deliveryId, status: newStatus)
        
        // Then
        switch result {
        case .success:
            // Verify status was updated
            XCTAssertEqual(testDelivery.status, newStatus)
            // Verify repository was called
            XCTAssertTrue(mockRepository.updateDeliveryStatusCalled)
            // Verify offline handling
            if !NetworkManager.shared.isConnected {
                XCTAssertFalse(testDelivery.isSynced)
                XCTAssertTrue(testDelivery.isOffline)
            }
            expectation.fulfill()
            
        case .failure(let error):
            XCTFail("Status update failed with error: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    /// Tests status update with network failure
    func testUpdateDeliveryStatusOffline() {
        // Given
        let expectation = XCTestExpectation(description: "Offline status update completed")
        let deliveryId = "TEST-002"
        let newStatus = DeliveryStatus.delivered
        
        // Force offline mode
        mockRepository.networkManager.isConnected = false
        
        // Create test delivery
        let testDelivery = Delivery(
            id: deliveryId,
            routeId: "ROUTE-001",
            customerId: "CUST-001",
            address: "123 Test St",
            scheduledDate: Date()
        )
        
        // Setup repository expectations
        mockRepository.updateDeliveryStatusResult = .success(testDelivery)
        
        // When
        let result = sut.updateDeliveryStatus(deliveryId: deliveryId, status: newStatus)
        
        // Then
        switch result {
        case .success:
            // Verify local update succeeded
            XCTAssertEqual(testDelivery.status, newStatus)
            XCTAssertTrue(testDelivery.isOffline)
            XCTAssertFalse(testDelivery.isSynced)
            expectation.fulfill()
            
        case .failure(let error):
            XCTFail("Offline status update failed with error: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - Proof of Delivery Tests
    
    /// Tests proof of delivery submission with signature and photos
    /// Requirement: Digital proof of delivery capabilities for mobile applications
    func testSubmitProofOfDelivery() {
        // Given
        let expectation = XCTestExpectation(description: "Proof of delivery submission completed")
        let deliveryId = "TEST-003"
        
        // Create test data
        let signature = "test_signature".data(using: .utf8)!
        let photo = "test_photo".data(using: .utf8)!
        let recipientName = "John Doe"
        let notes = "Test delivery notes"
        
        // Create test delivery
        let testDelivery = Delivery(
            id: deliveryId,
            routeId: "ROUTE-001",
            customerId: "CUST-001",
            address: "123 Test St",
            scheduledDate: Date()
        )
        
        // Setup repository expectations
        mockRepository.addProofOfDeliveryResult = .success(testDelivery)
        
        // When
        let result = sut.submitProofOfDelivery(
            deliveryId: deliveryId,
            signature: signature,
            photos: [photo],
            recipientName: recipientName,
            notes: notes
        )
        
        // Then
        switch result {
        case .success:
            // Verify proof was added
            XCTAssertNotNil(testDelivery.proof)
            XCTAssertEqual(testDelivery.proof?.recipientName, recipientName)
            // Verify repository was called
            XCTAssertTrue(mockRepository.addProofOfDeliveryCalled)
            // Verify location was captured
            XCTAssertNotNil(testDelivery.deliveryLocation)
            expectation.fulfill()
            
        case .failure(let error):
            XCTFail("Proof submission failed with error: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    /// Tests proof of delivery submission in offline mode
    func testSubmitProofOfDeliveryOffline() {
        // Given
        let expectation = XCTestExpectation(description: "Offline proof submission completed")
        let deliveryId = "TEST-004"
        
        // Force offline mode
        mockRepository.networkManager.isConnected = false
        
        // Create test data
        let signature = "test_signature".data(using: .utf8)!
        let photo = "test_photo".data(using: .utf8)!
        let recipientName = "Jane Doe"
        
        // Create test delivery
        let testDelivery = Delivery(
            id: deliveryId,
            routeId: "ROUTE-001",
            customerId: "CUST-001",
            address: "123 Test St",
            scheduledDate: Date()
        )
        
        // Setup repository expectations
        mockRepository.addProofOfDeliveryResult = .success(testDelivery)
        
        // When
        let result = sut.submitProofOfDelivery(
            deliveryId: deliveryId,
            signature: signature,
            photos: [photo],
            recipientName: recipientName,
            notes: nil
        )
        
        // Then
        switch result {
        case .success:
            // Verify local storage
            XCTAssertTrue(testDelivery.isOffline)
            XCTAssertFalse(testDelivery.isSynced)
            XCTAssertNotNil(testDelivery.proof)
            expectation.fulfill()
            
        case .failure(let error):
            XCTFail("Offline proof submission failed with error: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - Fetch Deliveries Tests
    
    /// Tests delivery fetching functionality with offline support
    /// Requirement: Offline data handling capabilities with local persistence
    func testFetchDeliveries() {
        // Given
        let expectation = XCTestExpectation(description: "Fetch deliveries completed")
        let routeId = "ROUTE-001"
        
        // Create test deliveries
        let testDeliveries = [
            Delivery(id: "TEST-005", routeId: routeId, customerId: "CUST-001", address: "123 Test St", scheduledDate: Date()),
            Delivery(id: "TEST-006", routeId: routeId, customerId: "CUST-002", address: "456 Test Ave", scheduledDate: Date())
        ]
        
        // Setup repository expectations
        mockRepository.getDeliveriesForRouteResult = .success(testDeliveries)
        
        // When
        let result = sut.fetchDeliveries(includeCompleted: false)
        
        // Then
        switch result {
        case .success(let deliveries):
            // Verify deliveries were fetched
            XCTAssertEqual(deliveries.count, 2)
            XCTAssertTrue(mockRepository.getDeliveriesForRouteCalled)
            // Verify filtering
            XCTAssertFalse(deliveries.contains { $0.status == .delivered })
            expectation.fulfill()
            
        case .failure(let error):
            XCTFail("Fetch deliveries failed with error: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    /// Tests delivery fetching with network failure
    func testFetchDeliveriesOffline() {
        // Given
        let expectation = XCTestExpectation(description: "Offline fetch completed")
        let routeId = "ROUTE-001"
        
        // Force offline mode
        mockRepository.networkManager.isConnected = false
        
        // Create test deliveries
        let testDeliveries = [
            Delivery(id: "TEST-007", routeId: routeId, customerId: "CUST-001", address: "123 Test St", scheduledDate: Date()),
            Delivery(id: "TEST-008", routeId: routeId, customerId: "CUST-002", address: "456 Test Ave", scheduledDate: Date())
        ]
        
        // Setup repository expectations
        mockRepository.getDeliveriesForRouteResult = .success(testDeliveries)
        
        // When
        let result = sut.fetchDeliveries(includeCompleted: true)
        
        // Then
        switch result {
        case .success(let deliveries):
            // Verify local data access
            XCTAssertEqual(deliveries.count, 2)
            XCTAssertTrue(deliveries.allSatisfy { $0.isOffline })
            expectation.fulfill()
            
        case .failure(let error):
            XCTFail("Offline fetch failed with error: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - Sync Tests
    
    /// Tests offline data synchronization functionality
    /// Requirement: Real-time data synchronization between mobile and backend
    func testSyncOfflineData() {
        // Given
        let expectation = XCTestExpectation(description: "Sync completed")
        
        // Create test offline data
        let offlineDeliveries = [
            Delivery(id: "TEST-009", routeId: "ROUTE-001", customerId: "CUST-001", address: "123 Test St", scheduledDate: Date()),
            Delivery(id: "TEST-010", routeId: "ROUTE-001", customerId: "CUST-002", address: "456 Test Ave", scheduledDate: Date())
        ]
        offlineDeliveries.forEach { $0.isOffline = true }
        
        // Setup repository expectations
        mockRepository.syncUnsyncedResult = .success(true)
        
        // When
        let result = sut.syncOfflineDeliveries()
        
        // Then
        switch result {
        case .success(let syncCount):
            // Verify sync completion
            XCTAssertEqual(syncCount, 1)
            XCTAssertTrue(mockRepository.syncUnsyncedCalled)
            
            // Verify data updates
            offlineDeliveries.forEach { delivery in
                XCTAssertFalse(delivery.isOffline)
                XCTAssertTrue(delivery.isSynced)
            }
            
            expectation.fulfill()
            
        case .failure(let error):
            XCTFail("Sync failed with error: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    /// Tests sync conflict handling
    func testSyncOfflineDataWithConflicts() {
        // Given
        let expectation = XCTestExpectation(description: "Sync with conflicts completed")
        
        // Create conflicting delivery versions
        let localDelivery = Delivery(
            id: "TEST-011",
            routeId: "ROUTE-001",
            customerId: "CUST-001",
            address: "123 Test St",
            scheduledDate: Date()
        )
        localDelivery.updateStatus(.delivered)
        localDelivery.isOffline = true
        
        let serverDelivery = Delivery(
            id: "TEST-011",
            routeId: "ROUTE-001",
            customerId: "CUST-001",
            address: "123 Test St",
            scheduledDate: Date()
        )
        serverDelivery.updateStatus(.failed)
        
        // Setup repository expectations with conflict
        mockRepository.syncUnsyncedResult = .success(true)
        mockRepository.conflictingDelivery = serverDelivery
        
        // When
        let result = sut.syncOfflineDeliveries()
        
        // Then
        switch result {
        case .success:
            // Verify conflict resolution
            XCTAssertEqual(localDelivery.status, .delivered) // Local changes should be preserved
            XCTAssertTrue(localDelivery.isSynced)
            XCTAssertFalse(localDelivery.isOffline)
            expectation.fulfill()
            
        case .failure(let error):
            XCTFail("Sync conflict handling failed with error: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
}

// MARK: - Mock Objects

private class MockCoreDataManager: CoreDataManager {
    override func saveDelivery(_ delivery: Delivery) -> Bool {
        return true
    }
    
    override func fetchUnsyncedData() -> [String: Any] {
        return ["deliveries": []]
    }
}

private class MockNetworkManager: NetworkManager {
    var isConnected: Bool = true
    
    override func performRequest<T>(_ request: URLRequest) -> AnyPublisher<T, Error> {
        return Just(Data() as! T)
            .setFailureType(to: Error.self)
            .eraseToAnyPublisher()
    }
}