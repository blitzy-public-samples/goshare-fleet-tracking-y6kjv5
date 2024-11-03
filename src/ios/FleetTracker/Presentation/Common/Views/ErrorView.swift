//
// ErrorView.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify accessibility labels are properly localized
// 2. Test VoiceOver functionality with different error messages
// 3. Verify dynamic type scaling works correctly
// 4. Test error view animations on all supported iOS devices

import UIKit      // iOS 14.0+

/// A custom UIView that displays error messages with animations and styling, supporting accessibility and dynamic type
/// Addresses requirements:
/// - Native iOS UI components with consistent error handling and user feedback
/// - Consistent error display across iOS devices
@IBDesignable
class ErrorView: UIView {
    
    // MARK: - Properties
    
    private let messageLabel: UILabel = {
        let label = UILabel()
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .systemRed
        label.adjustsFontForContentSizeCategory = true
        label.font = .preferredFont(forTextStyle: .body)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .systemRed
        imageView.image = UIImage(systemName: "exclamationmark.triangle.fill")
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()
    
    private let contentStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    /// The current error message being displayed
    public var errorMessage: String = "" {
        didSet {
            messageLabel.text = errorMessage
            updateAccessibility()
        }
    }
    
    /// Default duration for auto-hiding the error view
    public var defaultDuration: TimeInterval = 3.0
    
    // MARK: - Initialization
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    // MARK: - Setup
    
    /// Configures the initial UI components and layout
    private func setupUI() {
        // Configure background and styling
        backgroundColor = .systemBackground
        layer.cornerRadius = 8
        layer.borderWidth = 1
        layer.borderColor = UIColor.systemRed.cgColor
        
        // Add shadow for depth
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 2)
        layer.shadowRadius = 4
        layer.shadowOpacity = 0.1
        
        // Setup stack view hierarchy
        addSubview(contentStack)
        contentStack.addArrangedSubview(iconImageView)
        contentStack.addArrangedSubview(messageLabel)
        
        // Configure auto layout constraints
        NSLayoutConstraint.activate([
            contentStack.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16),
            
            iconImageView.heightAnchor.constraint(equalToConstant: 24),
            iconImageView.widthAnchor.constraint(equalToConstant: 24)
        ])
        
        // Configure initial accessibility
        setupAccessibility()
    }
    
    // MARK: - Accessibility
    
    private func setupAccessibility() {
        isAccessibilityElement = true
        accessibilityTraits = .staticText
        accessibilityLabel = "Error"
        accessibilityHint = "Displays error message"
    }
    
    private func updateAccessibility() {
        accessibilityValue = errorMessage
        UIAccessibility.post(notification: .announcement, argument: errorMessage)
    }
    
    // MARK: - Public Methods
    
    /// Displays the error view with animation
    /// - Parameters:
    ///   - message: The error message to display
    ///   - duration: Optional duration after which the error view will auto-hide
    public func show(message: String, duration: TimeInterval? = nil) {
        errorMessage = message
        
        // Ensure view is visible
        isHidden = false
        
        // Animate appearance
        fadeIn(duration: 0.3) { [weak self] in
            // Shake to draw attention
            self?.shake()
            
            // Auto-hide if duration is specified
            if let duration = duration ?? self?.defaultDuration {
                DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                    self?.hide()
                }
            }
        }
    }
    
    /// Hides the error view with animation
    public func hide() {
        fadeOut(duration: 0.3) { [weak self] in
            self?.isHidden = true
            self?.errorMessage = ""
        }
    }
    
    // MARK: - Layout
    
    override func layoutSubviews() {
        super.layoutSubviews()
        
        // Update shadow path for better performance
        layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: layer.cornerRadius).cgPath
    }
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        // Update colors for dark mode changes
        layer.borderColor = UIColor.systemRed.cgColor
    }
}