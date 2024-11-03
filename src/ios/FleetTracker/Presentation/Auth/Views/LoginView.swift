//
// LoginView.swift
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

/// A SwiftUI view that implements the OAuth 2.0 login screen interface
/// Implements requirements:
/// - Authentication and Authorization (8.1.1 Authentication Methods)
/// - Mobile Applications (1.1 System Overview/Mobile Applications)
/// - Cross-platform compatibility (1.2 Scope/Performance Requirements)
@IBDesignable
public class LoginView: UIView {
    
    // MARK: - Public Properties
    
    public let emailTextField: CustomTextField = {
        let textField = CustomTextField()
        textField.placeholder = "Email"
        textField.keyboardType = .emailAddress
        textField.autocapitalizationType = .none
        textField.autocorrectionType = .no
        textField.returnKeyType = .next
        textField.validationRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        textField.errorMessage = "Please enter a valid email address"
        textField.isRequired = true
        textField.accessibilityIdentifier = "loginEmailTextField"
        return textField
    }()
    
    public let passwordTextField: CustomTextField = {
        let textField = CustomTextField()
        textField.placeholder = "Password"
        textField.isSecureTextEntry = true
        textField.returnKeyType = .done
        textField.validationRegex = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$"
        textField.errorMessage = "Password must be at least 8 characters with letters and numbers"
        textField.isRequired = true
        textField.accessibilityIdentifier = "loginPasswordTextField"
        return textField
    }()
    
    public let loginButton: CustomButton = {
        let button = CustomButton()
        button.setTitle("Log In", for: .normal)
        button.buttonColor = .systemBlue
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        button.isEnabled = false
        button.accessibilityIdentifier = "loginButton"
        return button
    }()
    
    // MARK: - Private Properties
    
    private let errorLabel: UILabel = {
        let label = UILabel()
        label.textColor = .systemRed
        label.font = .systemFont(ofSize: 14)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.isHidden = true
        label.accessibilityIdentifier = "loginErrorLabel"
        return label
    }()
    
    private let loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .medium)
        indicator.hidesWhenStopped = true
        indicator.accessibilityIdentifier = "loginLoadingIndicator"
        return indicator
    }()
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    public override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }
    
    private func commonInit() {
        setupUI()
        setupConstraints()
        setupActions()
        setupAccessibility()
        subscribeToAuthService()
    }
    
    // MARK: - Setup Methods
    
    private func setupUI() {
        backgroundColor = .systemBackground
        
        // Add subviews
        [emailTextField, passwordTextField, loginButton, errorLabel, loadingIndicator].forEach {
            addSubview($0)
            $0.translatesAutoresizingMaskIntoConstraints = false
        }
        
        // Configure text field delegates
        emailTextField.delegate = self
        passwordTextField.delegate = self
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Email text field
            emailTextField.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 32),
            emailTextField.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 24),
            emailTextField.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -24),
            emailTextField.heightAnchor.constraint(equalToConstant: 48),
            
            // Password text field
            passwordTextField.topAnchor.constraint(equalTo: emailTextField.bottomAnchor, constant: 16),
            passwordTextField.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 24),
            passwordTextField.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -24),
            passwordTextField.heightAnchor.constraint(equalToConstant: 48),
            
            // Error label
            errorLabel.topAnchor.constraint(equalTo: passwordTextField.bottomAnchor, constant: 16),
            errorLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 24),
            errorLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -24),
            
            // Login button
            loginButton.topAnchor.constraint(equalTo: errorLabel.bottomAnchor, constant: 24),
            loginButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 24),
            loginButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -24),
            loginButton.heightAnchor.constraint(equalToConstant: 48),
            
            // Loading indicator
            loadingIndicator.centerXAnchor.constraint(equalTo: centerXAnchor),
            loadingIndicator.topAnchor.constraint(equalTo: loginButton.bottomAnchor, constant: 16)
        ])
    }
    
    private func setupActions() {
        // Add login button action
        loginButton.addTarget(self, action: #selector(handleLogin), for: .touchUpInside)
        
        // Add text field change handlers
        emailTextField.addTarget(self, action: #selector(textFieldDidChange), for: .editingChanged)
        passwordTextField.addTarget(self, action: #selector(textFieldDidChange), for: .editingChanged)
    }
    
    private func setupAccessibility() {
        // Configure accessibility grouping
        accessibilityElements = [emailTextField, passwordTextField, loginButton, errorLabel]
        
        // Set accessibility labels
        emailTextField.accessibilityLabel = "Email Address"
        passwordTextField.accessibilityLabel = "Password"
        loginButton.accessibilityLabel = "Log In"
        errorLabel.accessibilityLabel = "Login Error"
        
        // Set accessibility hints
        emailTextField.accessibilityHint = "Enter your email address"
        passwordTextField.accessibilityHint = "Enter your password"
        loginButton.accessibilityHint = "Double tap to log in"
    }
    
    private func subscribeToAuthService() {
        // Subscribe to current user changes
        AuthService.shared.currentUser
            .receive(on: DispatchQueue.main)
            .sink { [weak self] user in
                self?.handleAuthStateChange(user: user)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Action Handlers
    
    @objc private func handleLogin() {
        guard validateInputs() else {
            showError(message: "Please correct the errors above")
            return
        }
        
        // Show loading state
        setLoading(true)
        
        // Attempt login
        AuthService.shared.login(
            email: emailTextField.text ?? "",
            password: passwordTextField.text ?? ""
        )
        .sink(
            receiveCompletion: { [weak self] completion in
                self?.setLoading(false)
                
                if case .failure(let error) = completion {
                    self?.handleLoginError(error)
                }
            },
            receiveValue: { [weak self] _ in
                self?.clearError()
                self?.clearInputs()
            }
        )
        .store(in: &cancellables)
    }
    
    @objc private func textFieldDidChange(_ textField: UITextField) {
        validateInputs()
    }
    
    // MARK: - Helper Methods
    
    private func validateInputs() -> Bool {
        let isEmailValid = emailTextField.validate()
        let isPasswordValid = passwordTextField.validate()
        
        loginButton.isEnabled = isEmailValid && isPasswordValid
        return loginButton.isEnabled
    }
    
    private func handleLoginError(_ error: Error) {
        let errorMessage: String
        
        switch error {
        case AuthService.AuthError.invalidCredentials:
            errorMessage = "Invalid email or password"
        case AuthService.AuthError.networkError:
            errorMessage = "Network error. Please try again"
        default:
            errorMessage = "An error occurred. Please try again"
        }
        
        showError(message: errorMessage)
    }
    
    private func handleAuthStateChange(user: User?) {
        if user != nil {
            clearError()
            clearInputs()
        }
    }
    
    private func showError(message: String) {
        errorLabel.text = message
        errorLabel.isHidden = false
        
        // Announce error for accessibility
        UIAccessibility.post(notification: .announcement, argument: message)
        
        // Shake animation for error feedback
        shake()
    }
    
    private func clearError() {
        errorLabel.text = nil
        errorLabel.isHidden = true
    }
    
    private func clearInputs() {
        emailTextField.text = nil
        passwordTextField.text = nil
        validateInputs()
    }
    
    private func setLoading(_ loading: Bool) {
        loginButton.isEnabled = !loading
        [emailTextField, passwordTextField].forEach { $0.isEnabled = !loading }
        
        if loading {
            loadingIndicator.startAnimating()
            
            // Announce loading state for accessibility
            UIAccessibility.post(notification: .announcement, argument: "Logging in")
        } else {
            loadingIndicator.stopAnimating()
        }
    }
}

// MARK: - UITextFieldDelegate

extension LoginView: UITextFieldDelegate {
    
    public func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case emailTextField:
            passwordTextField.becomeFirstResponder()
        case passwordTextField:
            textField.resignFirstResponder()
            if loginButton.isEnabled {
                handleLogin()
            }
        default:
            break
        }
        return true
    }
    
    public func textFieldDidEndEditing(_ textField: UITextField) {
        validateInputs()
    }
}