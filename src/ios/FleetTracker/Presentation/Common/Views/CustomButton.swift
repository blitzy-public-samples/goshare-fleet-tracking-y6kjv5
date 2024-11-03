//
// CustomButton.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify haptic feedback settings in device capabilities
// 2. Test accessibility features with VoiceOver enabled
// 3. Validate button states on different iOS versions (14.0+)
// 4. Review memory impact of button shadow animations

import UIKit      // iOS 14.0+

/// A customizable UIButton subclass that provides consistent styling and interactive behavior
/// Addresses requirements:
/// - Native iOS UI components with consistent styling and behavior
/// - Consistent UI behavior and appearance across iOS devices
@IBDesignable
public class CustomButton: UIButton {
    
    // MARK: - Public Properties
    
    @IBInspectable public var cornerRadius: CGFloat = 8.0 {
        didSet {
            setupAppearance()
        }
    }
    
    @IBInspectable public var buttonColor: UIColor = .systemBlue {
        didSet {
            setupAppearance()
        }
    }
    
    @IBInspectable public var highlightedColor: UIColor = .systemBlue.withAlphaComponent(0.8) {
        didSet {
            setupAppearance()
        }
    }
    
    @IBInspectable public var shadowRadius: CGFloat = 4.0 {
        didSet {
            setupAppearance()
        }
    }
    
    @IBInspectable public var shadowOpacity: CGFloat = 0.2 {
        didSet {
            setupAppearance()
        }
    }
    
    public override var isEnabled: Bool {
        didSet {
            updateState(state)
        }
    }
    
    public override var isAccessibilityElement: Bool {
        get { true }
        set { super.isAccessibilityElement = newValue }
    }
    
    public override var accessibilityTraits: UIAccessibilityTraits {
        get { .button }
        set { super.accessibilityTraits = newValue }
    }
    
    // MARK: - Private Properties
    
    private let defaultContentInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
    private let pressedScale: CGFloat = 0.98
    private let defaultBorderWidth: CGFloat = 1.0
    
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
        setupAppearance()
        setupTouchHandlers()
        setupAccessibility()
        contentEdgeInsets = defaultContentInsets
    }
    
    // MARK: - Setup Methods
    
    private func setupAppearance() {
        // Apply corner radius using UIView extension
        roundCorners(radius: cornerRadius, corners: .allCorners)
        
        // Set default background colors for states
        backgroundColor = buttonColor
        
        // Configure shadow properties using UIView extension
        addShadow(
            radius: shadowRadius,
            opacity: shadowOpacity,
            offset: 2.0,
            color: .black
        )
        
        // Add default border
        addBorder(width: defaultBorderWidth, color: buttonColor)
        
        // Ensure proper content layout
        clipsToBounds = false
        layer.masksToBounds = false
    }
    
    private func setupTouchHandlers() {
        // Add touch handlers for visual feedback
        addTarget(self, action: #selector(handleTouchDown), for: [.touchDown, .touchDragEnter])
        addTarget(self, action: #selector(handleTouchUp), for: [.touchUpInside, .touchDragExit, .touchCancel])
    }
    
    private func setupAccessibility() {
        isAccessibilityElement = true
        accessibilityTraits = .button
    }
    
    // MARK: - State Management
    
    private func updateState(_ state: UIControl.State) {
        UIView.animate(withDuration: 0.2) { [weak self] in
            guard let self = self else { return }
            
            switch state {
            case .normal:
                self.backgroundColor = self.buttonColor
                self.alpha = 1.0
                self.addShadow(
                    radius: self.shadowRadius,
                    opacity: self.shadowOpacity,
                    offset: 2.0,
                    color: .black
                )
                
            case .highlighted:
                self.backgroundColor = self.highlightedColor
                self.addShadow(
                    radius: self.shadowRadius * 0.8,
                    opacity: self.shadowOpacity * 0.8,
                    offset: 1.0,
                    color: .black
                )
                
            case .disabled:
                self.backgroundColor = self.buttonColor.withAlphaComponent(0.5)
                self.alpha = 0.7
                self.addShadow(
                    radius: self.shadowRadius * 0.5,
                    opacity: self.shadowOpacity * 0.5,
                    offset: 1.0,
                    color: .black
                )
                
            default:
                break
            }
        }
        
        // Update accessibility state
        accessibilityLabel = isEnabled ? titleLabel?.text : "\(titleLabel?.text ?? "") (Disabled)"
    }
    
    // MARK: - Touch Handlers
    
    @objc private func handleTouchDown() {
        // Scale down button for press effect
        UIView.animate(withDuration: 0.2) { [weak self] in
            self?.transform = CGAffineTransform(scaleX: self?.pressedScale ?? 1.0, y: self?.pressedScale ?? 1.0)
        }
        
        // Update shadow for pressed state
        addShadow(
            radius: shadowRadius * 0.8,
            opacity: shadowOpacity * 0.8,
            offset: 1.0,
            color: .black
        )
        
        // Apply highlighted state
        updateState(.highlighted)
        
        // Trigger haptic feedback if enabled
        let feedbackGenerator = UIImpactFeedbackGenerator(style: .light)
        feedbackGenerator.prepare()
        feedbackGenerator.impactOccurred()
    }
    
    @objc private func handleTouchUp() {
        // Restore original scale with animation
        UIView.animate(withDuration: 0.2) { [weak self] in
            self?.transform = .identity
        }
        
        // Reset shadow properties
        addShadow(
            radius: shadowRadius,
            opacity: shadowOpacity,
            offset: 2.0,
            color: .black
        )
        
        // Apply normal state
        updateState(.normal)
        
        // Update accessibility announcement
        UIAccessibility.post(notification: .announcement, argument: "\(titleLabel?.text ?? "") activated")
    }
    
    // MARK: - Layout
    
    public override func layoutSubviews() {
        super.layoutSubviews()
        setupAppearance()
    }
    
    public override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        setupAppearance()
    }
}