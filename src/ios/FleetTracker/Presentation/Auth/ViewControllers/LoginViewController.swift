//
// LoginViewController.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Configure OAuth 2.0 client credentials in environment configuration
// 2. Test accessibility features with VoiceOver enabled
// 3. Verify secure keyboard handling for password field
// 4. Test login flow with different network conditions
// 5. Validate error states and messages with UX team

import UIKit      // iOS 14.0+
import Combine    // iOS 14.0+

/// View controller responsible for handling OAuth 2.0 + OIDC user authentication
/// Implements requirements:
/// - Authentication and Authorization (8.1.1 Authentication Methods)
/// - Mobile Applications (1.1 System Overview/Mobile Applications)
/// - Security Protocols (8.3.1 Network Security)
public class LoginViewController: UIViewController {
    
    // MARK: - Properties
    
    private let loginView: LoginView = {
        let view = LoginView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let loadingView: LoadingView = {
        let view = LoadingView(message: "Authenticating...")
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Lifecycle
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupActions()
        setupKeyboardHandling()
        setupAuthSubscription()
        configureAccessibility()
    }
    
    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Configure navigation bar for login screen
        configureNavigationBar()
    }
    
    // MARK: - Setup Methods
    
    private func setupUI() {
        // Configure view background
        view.backgroundColor = .systemBackground
        
        // Add login view
        view.addSubview(loginView)
        
        // Setup constraints
        NSLayoutConstraint.activate([
            loginView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            loginView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            loginView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            loginView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    private func setupActions() {
        // Configure login button action
        loginView.loginButton.addTarget(
            self,
            action: #selector(handleLogin),
            for: .touchUpInside
        )
    }
    
    private func setupKeyboardHandling() {
        // Register for keyboard notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
        
        // Add tap gesture to dismiss keyboard
        let tapGesture = UITapGestureRecognizer(
            target: self,
            action: #selector(dismissKeyboard)
        )
        view.addGestureRecognizer(tapGesture)
    }
    
    private func setupAuthSubscription() {
        // Subscribe to authentication state changes
        AuthService.shared.currentUser
            .receive(on: DispatchQueue.main)
            .sink { [weak self] user in
                if user != nil {
                    self?.handleSuccessfulLogin()
                }
            }
            .store(in: &cancellables)
    }
    
    private func configureAccessibility() {
        // Set accessibility identifiers
        view.accessibilityIdentifier = "loginViewController"
        
        // Configure accessibility traits
        view.accessibilityTraits = .updatesFrequently
        
        // Set accessibility label
        view.accessibilityLabel = "Login Screen"
    }
    
    private func configureNavigationBar() {
        // Configure navigation bar appearance
        navigationController?.navigationBar.prefersLargeTitles = true
        navigationItem.largeTitleDisplayMode = .always
        title = "Login"
        
        // Hide back button
        navigationItem.hidesBackButton = true
        
        // Configure navigation bar style
        navigationController?.navigationBar.tintColor = .systemBlue
    }
    
    // MARK: - Action Handlers
    
    @objc private func handleLogin() {
        // Show loading view
        showLoading()
        
        // Get credentials from text fields
        guard let email = loginView.emailTextField.text,
              let password = loginView.passwordTextField.text else {
            hideLoading()
            return
        }
        
        // Attempt login with OAuth 2.0
        AuthService.shared.login(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.hideLoading()
                    
                    if case .failure(let error) = completion {
                        self?.handleLoginError(error)
                    }
                },
                receiveValue: { [weak self] _ in
                    self?.hideLoading()
                }
            )
            .store(in: &cancellables)
    }
    
    @objc private func keyboardWillShow(_ notification: Notification) {
        guard let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else {
            return
        }
        
        // Adjust scroll view content inset
        let insets = UIEdgeInsets(
            top: 0,
            left: 0,
            bottom: keyboardFrame.height,
            right: 0
        )
        
        // Animate content adjustment
        UIView.animate(withDuration: 0.3) {
            self.loginView.transform = CGAffineTransform(
                translationX: 0,
                y: -keyboardFrame.height/2
            )
        }
    }
    
    @objc private func keyboardWillHide(_ notification: Notification) {
        // Reset view transform
        UIView.animate(withDuration: 0.3) {
            self.loginView.transform = .identity
        }
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    // MARK: - Helper Methods
    
    private func showLoading() {
        // Add and configure loading view
        view.addSubview(loadingView)
        
        NSLayoutConstraint.activate([
            loadingView.topAnchor.constraint(equalTo: view.topAnchor),
            loadingView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            loadingView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            loadingView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        loadingView.show()
        
        // Disable user interaction
        loginView.isUserInteractionEnabled = false
    }
    
    private func hideLoading() {
        // Hide loading view
        loadingView.hide()
        
        // Re-enable user interaction
        loginView.isUserInteractionEnabled = true
    }
    
    private func handleLoginError(_ error: Error) {
        // Configure error alert
        let alert = UIAlertController(
            title: "Login Failed",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(
            title: "OK",
            style: .default
        ))
        
        // Present error alert
        present(alert, animated: true)
        
        // Announce error for accessibility
        UIAccessibility.post(
            notification: .announcement,
            argument: "Login failed: \(error.localizedDescription)"
        )
    }
    
    private func handleSuccessfulLogin() {
        // Navigate to main app interface
        // Note: Navigation logic should be handled by coordinator pattern
        // or navigation service in production code
        dismiss(animated: true)
    }
    
    // MARK: - Cleanup
    
    deinit {
        // Remove keyboard observers
        NotificationCenter.default.removeObserver(self)
        
        // Clear cancellables
        cancellables.removeAll()
    }
}