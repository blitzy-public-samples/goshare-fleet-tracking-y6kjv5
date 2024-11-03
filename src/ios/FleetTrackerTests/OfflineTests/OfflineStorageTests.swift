//
// OfflineStorageTests.swift
// FleetTrackerTests
//
// Human Tasks:
// 1. Verify CoreData model schema matches test expectations
// 2. Configure test environment with proper mock data
// 3. Set up CI pipeline to run these tests before deployment
// 4. Review test coverage with QA team
// 5. Ensure proper error simulation scenarios are covered

import XCTest    // iOS SDK 14.0+
import CoreData  // iOS SDK 14.0+
@testable import FleetTracker

/// Test suite for validating offline storage functionality and synchronization
/// Requirements addressed:
/// - Offline Data Handling (1.2 Scope/Technical Implementation)
/// - Mobile Applications (1.1 System Overview/Mobile Applications)
/// - Real-time Data Synchronization (1.2 Scope/Technical Implementation)
class OfflineStorageTests: XCTestCase {
    
    // MARK: - Properties
    
    /// System under test - OfflineStorage instance
    private var sut: OfflineStorage!
    
    /// Mock CoreData container for testing
    private var mockContainer: NSPersistentContainer!
    
    /// Mock delegate for testing callbacks
    private var mockDelegate: MockOfflineStorageDelegate!
    
    // MARK: - Test Lifecycle
    
    override func setUp() {
        super.setUp()
        
        // Initialize in-memory CoreData store
        let managedObjectModel = NSManagedObjectModel.mergedModel(from: [Bundle.main])!
        mockContainer = NSPersistentContainer(name: "TestContainer", managedObjectModel: managedObjectModel)
        
        let description = NSPersistentStoreDescription()
        description.type = NSInMemoryStoreType
        description.shouldAddStoreAsynchronously = false
        mockContainer.persistentStoreDescriptions = [description]
        
        mockContainer.loadPersistentStores { (description, error) in
            XCTAssertNil(error, "Failed to load test store: \(String(describing: error))")
        }
        
        // Initialize mock delegate
        mockDelegate = MockOfflineStorageDelegate()
        
        // Initialize system under test
        sut = OfflineStorage(container: mockContainer)
        sut.delegate = mockDelegate
        
        // Setup test data
        setupTestData()
    }
    
    override func tearDown() {
        // Clean up test data
        let context = mockContainer.viewContext
        let fetchRequest: NSFetchRequest<NSFetchRequestResult> = NSFetchRequest(entityName: "DeliveryEntity")
        let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
        
        try? mockContainer.persistentStoreCoordinator.execute(deleteRequest, with: context)
        
        // Reset properties
        sut = nil
        mockContainer = nil
        mockDelegate = nil
        
        super.tearDown()
    }
    
    // MARK: - Test Cases
    
    /// Tests saving delivery data to offline storage
    /// Requirements addressed:
    /// - Offline Data Handling (1.2 Scope/Technical Implementation)
    func testSaveDeliveryOffline() {
        // Given
        let delivery = createMockDelivery()
        let expectation = XCTestExpectation(description: "Save delivery callback")
        
        mockDelegate.didSaveDeliveryCallback = { savedDelivery in
            XCTAssertEqual(savedDelivery.id, delivery.id)
            expectation.fulfill()
        }
        
        // When
        let result = sut.saveDeliveryOffline(delivery)
        
        // Then
        switch result {
        case .success(let success):
            XCTAssertTrue(success)
            
            // Verify storage
            let fetchResult = sut.getOfflineDelivery(deliveryId: delivery.id)
            switch fetchResult {
            case .success(let fetchedDelivery):
                XCTAssertEqual(fetchedDelivery.id, delivery.id)
                XCTAssertTrue(fetchedDelivery.isOffline)
                XCTAssertFalse(fetchedDelivery.isSynced)
            case .failure(let error):
                XCTFail("Failed to fetch saved delivery: \(error)")
            }
            
        case .failure(let error):
            XCTFail("Failed to save delivery: \(error)")
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    /// Tests saving route data to offline storage
    /// Requirements addressed:
    /// - Offline Data Handling (1.2 Scope/Technical Implementation)
    func testSaveRouteOffline() {
        // Given
        let route = createMockRoute()
        let expectation = XCTestExpectation(description: "Save route callback")
        
        mockDelegate.didSaveRouteCallback = { savedRoute in
            XCTAssertEqual(savedRoute.id, route.id)
            expectation.fulfill()
        }
        
        // When
        let result = sut.saveRouteOffline(route)
        
        // Then
        switch result {
        case .success(let success):
            XCTAssertTrue(success)
            
            // Verify storage
            let fetchResult = sut.getOfflineRoute(routeId: route.id)
            switch fetchResult {
            case .success(let fetchedRoute):
                XCTAssertEqual(fetchedRoute.id, route.id)
                XCTAssertTrue(fetchedRoute.isOffline)
                XCTAssertFalse(fetchedRoute.isSynced)
            case .failure(let error):
                XCTFail("Failed to fetch saved route: \(error)")
            }
            
        case .failure(let error):
            XCTFail("Failed to save route: \(error)")
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    /// Tests synchronization of offline data with server
    /// Requirements addressed:
    /// - Real-time Data Synchronization (1.2 Scope/Technical Implementation)
    func testSyncOfflineData() {
        // Given
        let deliveries = [createMockDelivery(), createMockDelivery()]
        let routes = [createMockRoute(), createMockRoute()]
        
        // Save test data offline
        deliveries.forEach { _ = sut.saveDeliveryOffline($0) }
        routes.forEach { _ = sut.saveRouteOffline($0) }
        
        let expectation = XCTestExpectation(description: "Sync completion callback")
        
        mockDelegate.didSyncCallback = { results in
            // Verify sync results
            XCTAssertEqual(results[SyncResultKeys.totalSynced] as? Int, 4)
            XCTAssertEqual(results[SyncResultKeys.successCount] as? Int, 4)
            XCTAssertEqual(results[SyncResultKeys.failureCount] as? Int, 0)
            
            if let syncedItems = results[SyncResultKeys.syncedItems] as? [[String: Any]] {
                XCTAssertEqual(syncedItems.count, 4)
            } else {
                XCTFail("Missing synced items in results")
            }
            
            expectation.fulfill()
        }
        
        // When
        let result = sut.syncOfflineData()
        
        // Then
        switch result {
        case .success(let results):
            XCTAssertNotNil(results[SyncResultKeys.syncStartTime])
            XCTAssertNotNil(results[SyncResultKeys.syncEndTime])
            XCTAssertNotNil(results[SyncResultKeys.syncDuration])
            
        case .failure(let error):
            XCTFail("Sync failed: \(error)")
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    /// Tests error handling in offline storage operations
    /// Requirements addressed:
    /// - Offline Data Handling (1.2 Scope/Technical Implementation)
    func testOfflineStorageError() {
        // Given
        let invalidDelivery = createInvalidMockDelivery()
        let expectation = XCTestExpectation(description: "Error callback")
        
        mockDelegate.didFailCallback = { error in
            XCTAssertNotNil(error)
            expectation.fulfill()
        }
        
        // When
        let result = sut.saveDeliveryOffline(invalidDelivery)
        
        // Then
        switch result {
        case .success:
            XCTFail("Expected failure for invalid delivery")
        case .failure(let error):
            XCTAssertEqual(error, StorageError.invalidData)
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // MARK: - Helper Methods
    
    private func setupTestData() {
        let context = mockContainer.viewContext
        
        // Create test entities
        let deliveryEntity = NSEntityDescription.entity(forEntityName: "DeliveryEntity", in: context)!
        _ = NSManagedObject(entity: deliveryEntity, insertInto: context)
        
        let routeEntity = NSEntityDescription.entity(forEntityName: "RouteEntity", in: context)!
        _ = NSManagedObject(entity: routeEntity, insertInto: context)
        
        try? context.save()
    }
    
    private func createMockDelivery() -> Delivery {
        return Delivery(
            id: UUID().uuidString,
            status: .pending,
            isOffline: true,
            isSynced: false,
            data: [
                "address": "123 Test St",
                "customer": "Test Customer",
                "timestamp": Date()
            ]
        )
    }
    
    private func createInvalidMockDelivery() -> Delivery {
        return Delivery(
            id: "",
            status: .pending,
            isOffline: true,
            isSynced: false,
            data: [:]
        )
    }
    
    private func createMockRoute() -> Route {
        return Route(
            id: UUID().uuidString,
            status: .active,
            isOffline: true,
            isSynced: false,
            data: [
                "stops": [
                    ["address": "Stop 1"],
                    ["address": "Stop 2"]
                ],
                "startTime": Date()
            ]
        )
    }
}

// MARK: - Mock Delegate Implementation

/// Mock implementation of OfflineStorageDelegate for testing
class MockOfflineStorageDelegate: NSObject, OfflineStorageDelegate {
    
    var didSaveDeliveryCallback: ((Delivery) -> Void)?
    var didSaveRouteCallback: ((Route) -> Void)?
    var didFailCallback: ((Error) -> Void)?
    var didSyncCallback: (([String: Any]) -> Void)?
    
    func didSaveDeliveryOffline(_ delivery: Delivery) {
        didSaveDeliveryCallback?(delivery)
    }
    
    func didSaveRouteOffline(_ route: Route) {
        didSaveRouteCallback?(route)
    }
    
    func didFailToSaveOffline(_ error: Error) {
        didFailCallback?(error)
    }
    
    func didSyncOfflineData(_ syncResults: [String : Any]) {
        didSyncCallback?(syncResults)
    }
}