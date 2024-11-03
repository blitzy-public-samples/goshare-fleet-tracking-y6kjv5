//
// ProfileViewController.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Configure OAuth 2.0 client credentials in environment configuration
// 2. Test accessibility features with VoiceOver enabled
// 3. Verify secure token handling across app state transitions
// 4. Test profile view behavior under different network conditions
// 5. Verify proper cleanup of authentication state on logout

import UIKit      // iOS 14.0+
import SwiftUI    // iOS 14.0+
import Combine    // iOS 14.0+

/// UIViewController subclass that manages the user profile interface with OAuth 2.0 authentication support
/// Addresses requirements:
/// - Mobile Applications (1.1 System Overview/Mobile Applications)
/// - Authentication and Authorization (8.1.1 Authentication Methods)
/// - Security Protocols (8.3.1 Network Security)
@objc final class ProfileViewController: UIViewController {
    
    // MARK: - Properties
    
    private var profileView: ProfileView!
    private var authService: AuthService!
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupNavigationBar()
        setupProfileView()
        setupUserObservation()
        setupAccessibility()
        
        // Verify authentication state on view load
        authService.checkAuthState()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Ensure navigation bar is visible
        navigationController?.setNavigationBarHidden(false, animated: animated)
    }
    
    // MARK: - Initialization
    
    override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)
        
        // Initialize dependencies
        authService = AuthService.shared
        setupCommonInit()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupCommonInit()
    }
    
    private func setupCommonInit() {
        // Initialize SwiftUI profile view
        profileView = ProfileView()
        
        // Set navigation title
        title = "Profile"
    }
    
    // MARK: - Setup Methods
    
    private func setupNavigationBar() {
        // Configure navigation bar appearance
        navigationController?.navigationBar.prefersLargeTitles = true
        navigationItem.largeTitleDisplayMode = .always
        
        // Add logout button with secure action
        let logoutButton = UIBarButtonItem(
            title: "Logout",
            style: .plain,
            target: self,
            action: #selector(handleLogout)
        )
        logoutButton.tintColor = .systemRed
        navigationItem.rightBarButtonItem = logoutButton
    }
    
    private func setupProfileView() {
        // Create SwiftUI hosting controller
        let hostingController = UIHostingController(rootView: profileView)
        
        // Add as child view controller
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)
        
        // Setup constraints
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    private func setupUserObservation() {
        // Observe changes in authentication state
        authService.currentUser
            .receive(on: DispatchQueue.main)
            .sink { [weak self] user in
                guard let self = self else { return }
                
                if user == nil {
                    // Handle unauthenticated state
                    self.handleUnauthenticatedState()
                } else {
                    // Verify token validity
                    guard let user = user, user.isTokenValid() else {
                        self.handleInvalidToken()
                        return
                    }
                }
            }
            .store(in: &cancellables)
    }
    
    private func setupAccessibility() {
        // Configure accessibility labels and hints
        view.accessibilityLabel = "Profile Screen"
        view.accessibilityHint = "View and manage your profile information"
        
        // Enable accessibility features
        view.isAccessibilityElement = false
        view.shouldGroupAccessibilityChildren = true
    }
    
    // MARK: - Authentication Handlers
    
    @objc private func handleLogout() {
        // Show confirmation alert
        let alert = UIAlertController(
            title: "Confirm Logout",
            message: "Are you sure you want to log out?",
            preferredStyle: .alert
        )
        
        // Add secure logout action
        let logoutAction = UIAlertAction(title: "Logout", style: .destructive) { [weak self] _ in
            self?.performSecureLogout()
        }
        alert.addAction(logoutAction)
        
        // Add cancel action
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        alert.addAction(cancelAction)
        
        present(alert, animated: true)
    }
    
    private func performSecureLogout() {
        // Perform secure logout with token invalidation
        authService.logout()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.handleLogoutError(error)
                    }
                },
                receiveValue: { [weak self] _ in
                    self?.handleSuccessfulLogout()
                }
            )
            .store(in: &cancellables)
    }
    
    private func handleSuccessfulLogout() {
        // Clear sensitive data
        clearSecureData()
        
        // Navigate to login screen
        navigateToLogin()
    }
    
    private func handleLogoutError(_ error: Error) {
        // Show error alert
        let alert = UIAlertController(
            title: "Logout Error",
            message: "Failed to logout: \(error.localizedDescription)",
            preferredStyle: .alert
        )
        
        let okAction = UIAlertAction(title: "OK", style: .default)
        alert.addAction(okAction)
        
        present(alert, animated: true)
    }
    
    private func handleUnauthenticatedState() {
        // Clear secure data and navigate to login
        clearSecureData()
        navigateToLogin()
    }
    
    private func handleInvalidToken() {
        // Attempt token refresh or logout
        authService.checkAuthState()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isAuthenticated in
                if !isAuthenticated {
                    self?.handleUnauthenticatedState()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Helper Methods
    
    private func clearSecureData() {
        // Clear all sensitive user data and tokens
        authService.currentUser.value?.clearTokens()
        cancellables.removeAll()
    }
    
    private func navigateToLogin() {
        // Navigate to login screen (implementation depends on navigation setup)
        // This should be handled by the parent coordinator/navigation controller
        navigationController?.popToRootViewController(animated: true)
    }
    
    // MARK: - Cleanup
    
    deinit {
        // Ensure proper cleanup of sensitive data
        clearSecureData()
    }
}