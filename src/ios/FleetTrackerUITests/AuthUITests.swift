//
// AuthUITests.swift
// FleetTrackerUITests
//
// HUMAN TASKS:
// 1. Configure test OAuth 2.0 credentials in test environment
// 2. Verify VoiceOver accessibility testing is enabled
// 3. Set up test user accounts with different permission levels
// 4. Configure network condition simulation for offline testing
// 5. Validate error messages with UX/localization team

import XCTest      // iOS 14.0+

/// UI test suite for testing OAuth 2.0 + OIDC authentication flows
/// Implements requirements:
/// - Authentication and Authorization (8.1.1 Authentication Methods)
/// - Security Protocols (8.3.1 Network Security)
/// - Mobile Applications (1.1 System Overview/Mobile Applications)
class AuthUITests: XCTestCase {
    
    // MARK: - Properties
    
    private var app: XCUIApplication!
    
    // Test credentials
    private let validEmail = "test.driver@fleettracker.com"
    private let validPassword = "Test123456"
    private let invalidEmail = "invalid@email"
    private let insecurePassword = "weak"
    
    // MARK: - Setup & Teardown
    
    override func setUp() {
        super.setUp()
        
        // Initialize app instance
        app = XCUIApplication()
        
        // Configure test environment
        app.launchArguments = ["UI_TESTING"]
        app.launchEnvironment = [
            "ENVIRONMENT": "TEST",
            "MOCK_AUTH_ENABLED": "true"
        ]
        
        // Launch app
        app.launch()
        
        // Wait for login screen to appear
        let loginView = app.otherElements["loginViewController"]
        XCTAssertTrue(loginView.waitForExistence(timeout: 5))
    }
    
    override func tearDown() {
        // Reset app state
        app.terminate()
        super.tearDown()
    }
    
    // MARK: - Test Cases
    
    /// Tests successful OAuth 2.0 login flow with valid credentials
    /// Requirement: Authentication and Authorization (8.1.1)
    func testSuccessfulLogin() throws {
        // Get UI elements
        let emailField = app.textFields["loginEmailTextField"]
        let passwordField = app.secureTextFields["loginPasswordTextField"]
        let loginButton = app.buttons["loginButton"]
        
        // Verify initial state
        XCTAssertTrue(emailField.exists)
        XCTAssertTrue(passwordField.exists)
        XCTAssertTrue(loginButton.exists)
        XCTAssertFalse(loginButton.isEnabled)
        
        // Enter valid credentials
        emailField.tap()
        emailField.typeText(validEmail)
        
        passwordField.tap()
        passwordField.typeText(validPassword)
        
        // Verify login button is enabled
        XCTAssertTrue(loginButton.isEnabled)
        
        // Attempt login
        loginButton.tap()
        
        // Verify loading indicator appears
        let loadingIndicator = app.activityIndicators["loginLoadingIndicator"]
        XCTAssertTrue(loadingIndicator.exists)
        
        // Wait for dashboard to appear (successful login)
        let dashboardView = app.otherElements["dashboardView"]
        XCTAssertTrue(dashboardView.waitForExistence(timeout: 10))
        
        // Verify login view is dismissed
        XCTAssertFalse(emailField.exists)
    }
    
    /// Tests login validation with invalid email format
    /// Requirements: Security Protocols (8.3.1)
    func testInvalidEmail() throws {
        // Get UI elements
        let emailField = app.textFields["loginEmailTextField"]
        let loginButton = app.buttons["loginButton"]
        
        // Enter invalid email
        emailField.tap()
        emailField.typeText(invalidEmail)
        
        // Tap outside to trigger validation
        app.tap()
        
        // Verify error state
        let errorLabel = app.staticTexts["loginErrorLabel"]
        XCTAssertTrue(errorLabel.exists)
        XCTAssertEqual(errorLabel.label, "Please enter a valid email address")
        
        // Verify login button remains disabled
        XCTAssertFalse(loginButton.isEnabled)
        
        // Verify accessibility announcement
        let predicate = NSPredicate { _, _ in
            return UIAccessibility.isVoiceOverRunning
        }
        
        expectation(for: predicate, evaluatedWith: nil)
        waitForExpectations(timeout: 5)
        
        XCTAssertTrue(errorLabel.isAccessibilityElement)
        XCTAssertEqual(errorLabel.accessibilityLabel, "Login Error")
    }
    
    /// Tests login validation with insecure password
    /// Requirements: Security Protocols (8.3.1)
    func testInvalidPassword() throws {
        // Get UI elements
        let emailField = app.textFields["loginEmailTextField"]
        let passwordField = app.secureTextFields["loginPasswordTextField"]
        let loginButton = app.buttons["loginButton"]
        
        // Enter valid email but insecure password
        emailField.tap()
        emailField.typeText(validEmail)
        
        passwordField.tap()
        passwordField.typeText(insecurePassword)
        
        // Tap outside to trigger validation
        app.tap()
        
        // Verify error state
        let errorLabel = app.staticTexts["loginErrorLabel"]
        XCTAssertTrue(errorLabel.exists)
        XCTAssertEqual(errorLabel.label, "Password must be at least 8 characters with letters and numbers")
        
        // Verify login button remains disabled
        XCTAssertFalse(loginButton.isEnabled)
        
        // Verify accessibility error announcement
        XCTAssertTrue(errorLabel.isAccessibilityElement)
        XCTAssertEqual(errorLabel.accessibilityLabel, "Login Error")
    }
    
    /// Tests OAuth 2.0 authentication failure handling
    /// Requirements: Security Protocols (8.3.1), Authentication and Authorization (8.1.1)
    func testLoginFailure() throws {
        // Configure network failure simulation
        app.launchEnvironment["SIMULATE_AUTH_FAILURE"] = "true"
        
        // Get UI elements
        let emailField = app.textFields["loginEmailTextField"]
        let passwordField = app.secureTextFields["loginPasswordTextField"]
        let loginButton = app.buttons["loginButton"]
        
        // Enter valid credentials
        emailField.tap()
        emailField.typeText(validEmail)
        
        passwordField.tap()
        passwordField.typeText(validPassword)
        
        // Attempt login
        loginButton.tap()
        
        // Verify error alert appears
        let alert = app.alerts["Login Failed"]
        XCTAssertTrue(alert.waitForExistence(timeout: 5))
        
        // Verify error message
        let errorMessage = alert.staticTexts.element
        XCTAssertTrue(errorMessage.exists)
        XCTAssertEqual(errorMessage.label, "Network error. Please try again")
        
        // Dismiss alert
        alert.buttons["OK"].tap()
        
        // Verify we remain on login screen
        XCTAssertTrue(emailField.exists)
        XCTAssertTrue(passwordField.exists)
        
        // Verify accessibility announcement
        XCTAssertTrue(alert.isAccessibilityElement)
        XCTAssertEqual(alert.accessibilityLabel, "Login Failed")
    }
    
    // MARK: - Helper Methods
    
    /// Simulates keyboard return key behavior
    private func simulateReturnKey() {
        let returnButton = app.buttons["Return"]
        if returnButton.exists {
            returnButton.tap()
        }
    }
    
    /// Waits for keyboard to appear
    private func waitForKeyboard() {
        let keyboard = app.keyboards.element
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5))
    }
    
    /// Clears text from a text field
    private func clearTextField(_ textField: XCUIElement) {
        textField.tap()
        textField.press(forDuration: 1.0)
        app.menuItems["Select All"].tap()
        app.menuItems["Cut"].tap()
    }
}