//
// LoadingView.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify activity indicator style matches app theme
// 2. Test loading view on different screen sizes
// 3. Validate animation performance on target devices
// 4. Ensure accessibility labels are properly set

import UIKit      // iOS 14.0+

/// A reusable loading view component that displays an activity indicator with optional text message
/// Addresses requirements:
/// - Native iOS UI components with consistent user experience
/// - Visual feedback for operations taking longer than 500ms
public class LoadingView: UIView {
    
    // MARK: - Properties
    
    private let activityIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .large)
        indicator.translatesAutoresizingMaskIntoConstraints = false
        indicator.color = .white
        return indicator
    }()
    
    private let messageLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.textColor = .white
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 16, weight: .medium)
        label.numberOfLines = 0
        return label
    }()
    
    private let containerView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        view.layer.cornerRadius = 12
        return view
    }()
    
    private var message: String?
    
    // MARK: - Initialization
    
    /// Initializes the loading view with an optional message
    /// - Parameter message: Optional text message to display below the activity indicator
    public init(message: String? = nil) {
        self.message = message
        super.init(frame: .zero)
        setupUI()
        
        // Set initial alpha to 0 for fade in animation
        alpha = 0
        
        // Configure accessibility
        isAccessibilityElement = true
        accessibilityLabel = message ?? "Loading"
        accessibilityTraits = .updatesFrequently
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - UI Setup
    
    /// Configures the visual appearance and layout of the loading view
    private func setupUI() {
        // Add and configure container view
        addSubview(containerView)
        containerView.addSubview(activityIndicator)
        
        // Configure message label if message is provided
        if let message = message {
            containerView.addSubview(messageLabel)
            messageLabel.text = message
        }
        
        // Apply auto-layout constraints
        NSLayoutConstraint.activate([
            // Container view constraints
            containerView.centerXAnchor.constraint(equalTo: centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: centerYAnchor),
            containerView.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor, multiplier: 0.7),
            containerView.heightAnchor.constraint(greaterThanOrEqualToConstant: 100),
            
            // Activity indicator constraints
            activityIndicator.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            activityIndicator.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 24)
        ])
        
        // Add message label constraints if message exists
        if message != nil {
            NSLayoutConstraint.activate([
                messageLabel.topAnchor.constraint(equalTo: activityIndicator.bottomAnchor, constant: 16),
                messageLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 16),
                messageLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),
                messageLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -24)
            ])
        } else {
            // If no message, adjust container bottom constraint
            activityIndicator.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -24).isActive = true
        }
    }
    
    // MARK: - Public Methods
    
    /// Displays the loading view with a fade animation
    public func show() {
        // Start activity indicator animation
        activityIndicator.startAnimating()
        
        // Ensure view is brought to front of hierarchy
        superview?.bringSubviewToFront(self)
        
        // Fade in the view using UIView extension
        fadeIn(duration: 0.3)
    }
    
    /// Hides the loading view with a fade animation
    public func hide() {
        // Fade out the view using UIView extension
        fadeOut(duration: 0.3) { [weak self] in
            // Stop activity indicator animation
            self?.activityIndicator.stopAnimating()
            
            // Remove from superview after animation completion
            self?.removeFromSuperview()
        }
    }
    
    /// Updates the loading message text with optional animation
    /// - Parameter message: New message text to display
    public func updateMessage(_ message: String) {
        // Update message label text
        messageLabel.text = message
        self.message = message
        
        // Update accessibility label
        accessibilityLabel = message
        
        // Animate changes if view is visible
        if alpha > 0 {
            UIView.animate(withDuration: 0.2) {
                self.layoutIfNeeded()
            }
        }
    }
}