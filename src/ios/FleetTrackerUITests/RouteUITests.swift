//
// RouteUITests.swift
// FleetTrackerUITests
//
// Human Tasks:
// 1. Configure test device with proper network conditions for offline testing
// 2. Verify test device has sufficient storage for offline data
// 3. Set up test data fixtures for consistent test execution
// 4. Configure test device location simulation settings
// 5. Verify proper test environment variables are set

import XCTest // iOS 14.0+

/// UI test suite for testing route management functionality including real-time updates
/// and offline support capabilities
/// Requirements addressed:
/// - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
/// - Route optimization and planning (1.2 Scope/Core Functionality)
/// - Digital proof of delivery (1.2 Scope/Core Functionality)
/// - Real-time data synchronization (1.2 Scope/Technical Implementation)
class RouteUITests: XCTestCase {
    
    // MARK: - Properties
    
    /// Reference to the application under test
    let app = XCUIApplication()
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        // Disable test retries on failure for consistent results
        continueAfterFailure = false
        
        // Launch app with test configuration
        app.launchArguments = ["--uitesting"]
        app.launchEnvironment = [
            "IS_UI_TESTING": "1",
            "USE_TEST_DATA": "1",
            "DISABLE_ANIMATIONS": "1"
        ]
        app.launch()
        
        // Navigate to routes section
        let tabBar = app.tabBars["Main Tab Bar"]
        let routesTab = tabBar.buttons["Routes"]
        routesTab.tap()
        
        // Wait for route list to load
        let routeList = app.collectionViews["RouteListView"]
        XCTAssertTrue(routeList.waitForExistence(timeout: 5))
    }
    
    override func tearDownWithError() throws {
        // Reset offline mode if enabled
        if app.staticTexts["Offline Mode"].exists {
            toggleOfflineMode()
        }
        
        // Clean up any test data
        app.terminate()
    }
    
    // MARK: - Test Cases
    
    /// Tests the display and basic interaction of route list with real-time updates
    /// Requirements addressed:
    /// - Interactive fleet management dashboard
    /// - Real-time data synchronization with 30-second intervals
    func testRouteListDisplay() throws {
        // Verify route list exists
        let routeList = app.collectionViews["RouteListView"]
        XCTAssertTrue(routeList.exists)
        
        // Verify route cells are displayed
        let routeCells = routeList.cells
        XCTAssertGreaterThan(routeCells.count, 0)
        
        // Verify route information is visible
        let firstRoute = routeCells.element(boundBy: 0)
        XCTAssertTrue(firstRoute.staticTexts["RouteID"].exists)
        XCTAssertTrue(firstRoute.staticTexts["RouteStatus"].exists)
        
        // Test route list scrolling
        routeList.swipeUp()
        routeList.swipeDown()
        
        // Verify 30-second update interval
        let initialStatus = firstRoute.staticTexts["RouteStatus"].label
        
        // Wait for 35 seconds to ensure update cycle
        sleep(35)
        
        let updatedStatus = firstRoute.staticTexts["RouteStatus"].label
        XCTAssertNotEqual(initialStatus, updatedStatus, "Route status should update every 30 seconds")
        
        // Test offline mode indicators
        toggleOfflineMode()
        XCTAssertTrue(app.staticTexts["Offline Mode"].exists)
        
        // Verify offline visual indicators
        let offlineRoute = routeCells.element(boundBy: 0)
        XCTAssertTrue(offlineRoute.images["OfflineIndicator"].exists)
    }
    
    /// Tests navigation to route details and real-time updates
    /// Requirements addressed:
    /// - Interactive fleet management dashboard
    /// - Real-time data synchronization
    func testRouteDetailNavigation() throws {
        // Select first route in list
        let routeList = app.collectionViews["RouteListView"]
        let firstRoute = routeList.cells.element(boundBy: 0)
        firstRoute.tap()
        
        // Verify route detail view appears
        let routeDetailView = app.otherElements["RouteDetailView"]
        XCTAssertTrue(routeDetailView.waitForExistence(timeout: 5))
        
        // Verify route information is displayed
        XCTAssertTrue(routeDetailView.staticTexts["RouteID"].exists)
        XCTAssertTrue(routeDetailView.staticTexts["Status"].exists)
        XCTAssertTrue(routeDetailView.staticTexts["DeliveryCount"].exists)
        
        // Test back navigation
        app.navigationBars.buttons.element(boundBy: 0).tap()
        XCTAssertTrue(routeList.exists)
        
        // Verify real-time updates
        firstRoute.tap()
        let initialStatus = routeDetailView.staticTexts["Status"].label
        
        // Wait for update interval
        sleep(35)
        
        let updatedStatus = routeDetailView.staticTexts["Status"].label
        XCTAssertNotEqual(initialStatus, updatedStatus, "Route status should update in real-time")
        
        // Test offline functionality
        toggleOfflineMode()
        XCTAssertTrue(routeDetailView.staticTexts["Offline Mode"].exists)
        XCTAssertTrue(routeDetailView.buttons["SyncButton"].exists)
    }
    
    /// Tests route status update functionality with offline support
    /// Requirements addressed:
    /// - Route optimization and planning
    /// - Digital proof of delivery
    func testRouteStatusUpdate() throws {
        // Select route from list
        let routeList = app.collectionViews["RouteListView"]
        let plannedRoute = routeList.cells.element(boundBy: 0)
        let initialStatus = plannedRoute.staticTexts["RouteStatus"].label
        plannedRoute.tap()
        
        // Verify status update buttons
        let routeDetailView = app.otherElements["RouteDetailView"]
        XCTAssertTrue(routeDetailView.buttons["StartRoute"].exists)
        
        // Perform status update action
        routeDetailView.buttons["StartRoute"].tap()
        
        // Verify confirmation dialog
        let confirmDialog = app.alerts["Start Route"]
        XCTAssertTrue(confirmDialog.exists)
        confirmDialog.buttons["Start"].tap()
        
        // Verify status change is reflected
        let updatedStatus = routeDetailView.staticTexts["Status"].label
        XCTAssertNotEqual(initialStatus, updatedStatus)
        
        // Verify list update after navigation back
        app.navigationBars.buttons.element(boundBy: 0).tap()
        let routeNewStatus = plannedRoute.staticTexts["RouteStatus"].label
        XCTAssertNotEqual(initialStatus, routeNewStatus)
        
        // Test offline queuing of updates
        toggleOfflineMode()
        plannedRoute.tap()
        
        routeDetailView.buttons["CompleteRoute"].tap()
        XCTAssertTrue(app.staticTexts["Action queued for sync"].exists)
    }
    
    /// Tests route delivery progress tracking with real-time updates
    /// Requirements addressed:
    /// - Digital proof of delivery
    /// - Real-time data synchronization
    func testRouteDeliveryProgress() throws {
        // Open active route details
        let routeList = app.collectionViews["RouteListView"]
        let activeRoute = routeList.cells.element(matching: .cell, identifier: "InProgressRoute")
        activeRoute.tap()
        
        // Verify delivery list
        let routeDetailView = app.otherElements["RouteDetailView"]
        let deliveryList = routeDetailView.tables["DeliveryList"]
        XCTAssertTrue(deliveryList.exists)
        XCTAssertGreaterThan(deliveryList.cells.count, 0)
        
        // Update delivery status
        let firstDelivery = deliveryList.cells.element(boundBy: 0)
        firstDelivery.tap()
        
        let statusButton = app.buttons["UpdateStatus"]
        XCTAssertTrue(statusButton.exists)
        statusButton.tap()
        
        // Verify progress indicators
        let progressBar = routeDetailView.progressIndicators["RouteProgress"]
        XCTAssertTrue(progressBar.exists)
        
        // Verify route completion state
        let completionStatus = routeDetailView.staticTexts["CompletionStatus"]
        XCTAssertTrue(completionStatus.exists)
        
        // Test offline sync behavior
        toggleOfflineMode()
        firstDelivery.tap()
        statusButton.tap()
        
        XCTAssertTrue(app.staticTexts["Update queued for sync"].exists)
    }
    
    // MARK: - Helper Methods
    
    /// Toggles offline mode for testing
    private func toggleOfflineMode() {
        // Open settings
        app.buttons["SettingsButton"].tap()
        
        // Toggle offline mode
        let offlineSwitch = app.switches["OfflineModeSwitch"]
        XCTAssertTrue(offlineSwitch.waitForExistence(timeout: 5))
        offlineSwitch.tap()
        
        // Return to previous screen
        app.navigationBars.buttons.element(boundBy: 0).tap()
    }
}