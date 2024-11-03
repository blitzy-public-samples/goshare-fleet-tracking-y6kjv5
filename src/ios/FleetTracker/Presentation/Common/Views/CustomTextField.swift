//
// CustomTextField.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify Interface Builder integration for @IBDesignable properties
// 2. Test validation behavior with different regex patterns
// 3. Verify accessibility labels are properly set for VoiceOver support
// 4. Test error state animations on all supported iOS devices

import UIKit      // iOS 14.0+

/// A custom UITextField implementation that provides consistent styling and validation
/// Addresses requirements:
/// - Native iOS UI components with consistent styling and behavior
/// - Input fields for delivery confirmation and documentation
/// - Cross-platform compatibility across iOS devices
@IBDesignable
public class CustomTextField: UITextField {
    
    // MARK: - IBInspectable Properties
    
    @IBInspectable public var borderColor: UIColor = .systemGray4 {
        didSet {
            setupStyle()
        }
    }
    
    @IBInspectable public var borderWidth: CGFloat = 1.0 {
        didSet {
            setupStyle()
        }
    }
    
    @IBInspectable public var cornerRadius: CGFloat = 8.0 {
        didSet {
            setupStyle()
        }
    }
    
    @IBInspectable public var placeholderColor: UIColor = .systemGray {
        didSet {
            updatePlaceholderStyle()
        }
    }
    
    @IBInspectable public var validationRegex: String? {
        didSet {
            validate()
        }
    }
    
    @IBInspectable public var errorMessage: String = "Invalid input" {
        didSet {
            updateAccessibilityHint()
        }
    }
    
    // MARK: - Public Properties
    
    public var isValid: Bool = true {
        didSet {
            updateAccessibilityState()
        }
    }
    
    public var textPadding: UIEdgeInsets = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
    
    public var isRequired: Bool = false {
        didSet {
            updateAccessibilityHint()
        }
    }
    
    // MARK: - Private Properties
    
    private let errorLabel: UILabel = {
        let label = UILabel()
        label.textColor = .systemRed
        label.font = .systemFont(ofSize: 12)
        label.alpha = 0
        label.numberOfLines = 0
        return label
    }()
    
    // MARK: - Initialization
    
    override public init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required public init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }
    
    private func commonInit() {
        setupStyle()
        setupErrorLabel()
        addTargets()
        updateAccessibilityHint()
    }
    
    // MARK: - Setup Methods
    
    private func setupStyle() {
        // Apply corner radius using UIView+Extensions
        roundCorners(radius: cornerRadius, corners: .allCorners)
        
        // Apply border using UIView+Extensions
        addBorder(width: borderWidth, color: borderColor)
        
        // Configure background and text colors
        backgroundColor = .systemBackground
        textColor = .label
        
        // Update placeholder style
        updatePlaceholderStyle()
    }
    
    private func setupErrorLabel() {
        // Add error label to view hierarchy
        addSubview(errorLabel)
        errorLabel.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            errorLabel.topAnchor.constraint(equalTo: bottomAnchor, constant: 4),
            errorLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            errorLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4)
        ])
    }
    
    private func addTargets() {
        // Add editing changed target for real-time validation
        addTarget(self, action: #selector(textFieldDidChange), for: .editingChanged)
        
        // Add editing began/ended targets for visual feedback
        addTarget(self, action: #selector(textFieldDidBeginEditing), for: .editingDidBegin)
        addTarget(self, action: #selector(textFieldDidEndEditing), for: .editingDidEnd)
    }
    
    // MARK: - Public Methods
    
    /// Validates the current text input against the validation regex if provided
    /// - Returns: Boolean indicating whether the input is valid
    @discardableResult
    public func validate() -> Bool {
        guard let text = text else {
            isValid = !isRequired
            return isValid
        }
        
        if text.isEmpty {
            isValid = !isRequired
        } else if let regex = validationRegex {
            isValid = NSPredicate(format: "SELF MATCHES %@", regex).evaluate(with: text)
        } else {
            isValid = true
        }
        
        isValid ? clearError() : showError()
        return isValid
    }
    
    // MARK: - Private Methods
    
    private func showError() {
        // Change border color to error state
        addBorder(width: borderWidth, color: .systemRed)
        
        // Show error message with animation
        errorLabel.text = errorMessage
        UIView.animate(withDuration: 0.3) {
            self.errorLabel.alpha = 1
        }
        
        // Trigger shake animation using UIView+Extensions
        shake()
        
        // Update accessibility
        updateAccessibilityState()
    }
    
    private func clearError() {
        // Restore default border color
        addBorder(width: borderWidth, color: borderColor)
        
        // Hide error message with animation
        UIView.animate(withDuration: 0.3) {
            self.errorLabel.alpha = 0
        }
        
        // Update accessibility
        updateAccessibilityState()
    }
    
    private func updatePlaceholderStyle() {
        if let placeholder = placeholder {
            attributedPlaceholder = NSAttributedString(
                string: placeholder,
                attributes: [.foregroundColor: placeholderColor]
            )
        }
    }
    
    private func updateAccessibilityState() {
        accessibilityLabel = placeholder
        accessibilityTraits = isValid ? .none : .notEnabled
        accessibilityValue = text
    }
    
    private func updateAccessibilityHint() {
        var hint = ""
        if isRequired {
            hint += "Required. "
        }
        if !isValid {
            hint += errorMessage
        }
        accessibilityHint = hint
    }
    
    // MARK: - Target Actions
    
    @objc private func textFieldDidChange() {
        validate()
    }
    
    @objc private func textFieldDidBeginEditing() {
        // Highlight border when editing begins
        addBorder(width: borderWidth * 1.5, color: tintColor)
    }
    
    @objc private func textFieldDidEndEditing() {
        // Restore border when editing ends
        validate()
    }
    
    // MARK: - Layout
    
    override public func textRect(forBounds bounds: CGRect) -> CGRect {
        bounds.inset(by: textPadding)
    }
    
    override public func editingRect(forBounds bounds: CGRect) -> CGRect {
        bounds.inset(by: textPadding)
    }
    
    override public func placeholderRect(forBounds bounds: CGRect) -> CGRect {
        bounds.inset(by: textPadding)
    }
    
    override public func layoutSubviews() {
        super.layoutSubviews()
        roundCorners(radius: cornerRadius, corners: .allCorners)
    }
}