//
// AuthServiceTests.swift
// FleetTrackerTests
//
// HUMAN TASKS:
// 1. Configure test OAuth 2.0 client credentials in test environment
// 2. Set up test keychain access group for isolated testing
// 3. Configure mock server endpoints for authentication testing
// 4. Verify test token expiration timings match production settings
// 5. Set up test SSL certificates for secure communication testing

import XCTest    // iOS 14.0+
import Combine   // iOS 14.0+
@testable import FleetTracker

/// Test suite for AuthService OAuth 2.0 + OIDC authentication functionality
/// Tests requirements:
/// - Authentication and Authorization (8.1.1 Authentication Methods)
/// - Security Protocols (8.3.1 Network Security)
/// - Offline Operation Support (1.2 Scope/Performance Requirements)
final class AuthServiceTests: XCTestCase {
    
    // MARK: - Properties
    
    /// System under test - AuthService instance
    private var sut: AuthService!
    
    /// Set of cancellable subscriptions for async operations
    private var cancellables: Set<AnyCancellable>!
    
    // MARK: - Test Lifecycle
    
    override func setUp() {
        super.setUp()
        sut = AuthService.shared
        cancellables = Set<AnyCancellable>()
        
        // Clear any existing authentication state
        let user = User(id: "test", email: "test@example.com", firstName: "Test", lastName: "User", role: "driver")
        user.clearTokens()
        sut.currentUser.send(nil)
    }
    
    override func tearDown() {
        // Clean up authentication state
        let user = sut.currentUser.value
        user?.clearTokens()
        sut.currentUser.send(nil)
        
        // Clear subscriptions
        cancellables.removeAll()
        sut = nil
        
        super.tearDown()
    }
    
    // MARK: - Login Tests
    
    /// Tests successful OAuth 2.0 + OIDC login flow
    /// Verifies requirement: Authentication and Authorization (8.1.1)
    func testLoginSuccess() {
        // Given
        let email = "test@example.com"
        let password = "securePassword123"
        let expectation = XCTestExpectation(description: "Login successful")
        var resultUser: User?
        var resultError: Error?
        
        // When
        sut.login(email: email, password: password)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        resultError = error
                    }
                    expectation.fulfill()
                },
                receiveValue: { user in
                    resultUser = user
                }
            )
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        XCTAssertNil(resultError, "Login should not produce an error")
        XCTAssertNotNil(resultUser, "Login should return a valid user")
        XCTAssertEqual(resultUser?.email, email, "Returned user should have correct email")
        XCTAssertNotNil(sut.currentUser.value, "Current user should be set after login")
        XCTAssertTrue(resultUser?.loadTokens() ?? false, "Tokens should be stored securely")
        XCTAssertTrue(resultUser?.isTokenValid() ?? false, "Stored tokens should be valid")
    }
    
    /// Tests login failure scenarios with invalid credentials
    /// Verifies requirement: Security Protocols (8.3.1)
    func testLoginFailure() {
        // Given
        let email = "invalid@example.com"
        let password = "wrongPassword"
        let expectation = XCTestExpectation(description: "Login fails with invalid credentials")
        var resultError: Error?
        
        // When
        sut.login(email: email, password: password)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        resultError = error
                    }
                    expectation.fulfill()
                },
                receiveValue: { _ in }
            )
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        XCTAssertNotNil(resultError, "Invalid credentials should produce an error")
        XCTAssertNil(sut.currentUser.value, "Current user should remain nil after failed login")
        
        // Verify no tokens were stored
        let user = User(id: "test", email: email, firstName: "Test", lastName: "User", role: "driver")
        XCTAssertFalse(user.loadTokens(), "No tokens should be stored after failed login")
    }
    
    // MARK: - Logout Tests
    
    /// Tests successful logout flow and token cleanup
    /// Verifies requirements: Authentication and Authorization (8.1.1), Security Protocols (8.3.1)
    func testLogoutSuccess() {
        // Given
        let user = User(id: "test", email: "test@example.com", firstName: "Test", lastName: "User", role: "driver")
        _ = user.saveTokens(
            accessToken: "validAccessToken",
            refreshToken: "validRefreshToken",
            expirationDate: Date().addingTimeInterval(3600)
        )
        sut.currentUser.send(user)
        
        let expectation = XCTestExpectation(description: "Logout successful")
        var resultError: Error?
        
        // When
        sut.logout()
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        resultError = error
                    }
                    expectation.fulfill()
                },
                receiveValue: { _ in }
            )
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        XCTAssertNil(resultError, "Logout should not produce an error")
        XCTAssertNil(sut.currentUser.value, "Current user should be nil after logout")
        XCTAssertFalse(user.loadTokens(), "Tokens should be cleared after logout")
    }
    
    // MARK: - Token Refresh Tests
    
    /// Tests automatic OAuth token refresh mechanism
    /// Verifies requirements: Authentication and Authorization (8.1.1), Offline Operation Support (1.2)
    func testTokenRefresh() {
        // Given
        let user = User(id: "test", email: "test@example.com", firstName: "Test", lastName: "User", role: "driver")
        _ = user.saveTokens(
            accessToken: "expiredAccessToken",
            refreshToken: "validRefreshToken",
            expirationDate: Date().addingTimeInterval(-3600) // Expired token
        )
        sut.currentUser.send(user)
        
        let expectation = XCTestExpectation(description: "Token refresh successful")
        var authState = false
        
        // When
        sut.checkAuthState()
            .sink { state in
                authState = state
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        XCTAssertTrue(authState, "Auth state should be valid after token refresh")
        XCTAssertTrue(user.isTokenValid(), "New token should be valid")
        XCTAssertNotNil(sut.currentUser.value, "User should remain authenticated")
    }
    
    // MARK: - Auth State Tests
    
    /// Tests authentication state verification and token validation
    /// Verifies requirements: Authentication and Authorization (8.1.1), Security Protocols (8.3.1)
    func testAuthStateCheck() {
        // Test valid authentication state
        let validUser = User(id: "test", email: "test@example.com", firstName: "Test", lastName: "User", role: "driver")
        _ = validUser.saveTokens(
            accessToken: "validAccessToken",
            refreshToken: "validRefreshToken",
            expirationDate: Date().addingTimeInterval(3600)
        )
        sut.currentUser.send(validUser)
        
        let validExpectation = XCTestExpectation(description: "Valid auth state check")
        var validState = false
        
        sut.checkAuthState()
            .sink { state in
                validState = state
                validExpectation.fulfill()
            }
            .store(in: &cancellables)
        
        wait(for: [validExpectation], timeout: 5.0)
        XCTAssertTrue(validState, "Auth state should be valid with current tokens")
        
        // Test expired token scenario
        let expiredUser = User(id: "test2", email: "test2@example.com", firstName: "Test", lastName: "User", role: "driver")
        _ = expiredUser.saveTokens(
            accessToken: "expiredAccessToken",
            refreshToken: "validRefreshToken",
            expirationDate: Date().addingTimeInterval(-3600)
        )
        sut.currentUser.send(expiredUser)
        
        let expiredExpectation = XCTestExpectation(description: "Expired token auth state check")
        var expiredState = false
        
        sut.checkAuthState()
            .sink { state in
                expiredState = state
                expiredExpectation.fulfill()
            }
            .store(in: &cancellables)
        
        wait(for: [expiredExpectation], timeout: 5.0)
        XCTAssertTrue(expiredState, "Auth state should be valid after token refresh")
        
        // Test missing token scenario
        let invalidUser = User(id: "test3", email: "test3@example.com", firstName: "Test", lastName: "User", role: "driver")
        invalidUser.clearTokens()
        sut.currentUser.send(invalidUser)
        
        let invalidExpectation = XCTestExpectation(description: "Invalid auth state check")
        var invalidState = false
        
        sut.checkAuthState()
            .sink { state in
                invalidState = state
                invalidExpectation.fulfill()
            }
            .store(in: &cancellables)
        
        wait(for: [invalidExpectation], timeout: 5.0)
        XCTAssertFalse(invalidState, "Auth state should be invalid with missing tokens")
    }
}