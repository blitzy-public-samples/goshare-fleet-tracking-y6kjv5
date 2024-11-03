//
// UIView+Extensions.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure UIKit is properly linked in the project
// 2. Verify shadow rendering performance on target devices
// 3. Test animations on all supported iOS versions (14.0+)

import UIKit      // iOS 14.0+

// MARK: - UIView Extensions
/// Extension providing common UI operations and styling functionality for UIView
/// Addresses requirements: Native iOS UI components with consistent styling and behavior
extension UIView {
    
    /// Adds a customizable shadow to the UIView with performance optimization through rasterization
    /// - Parameters:
    ///   - radius: The blur radius (in points) used to render the shadow
    ///   - opacity: The opacity of the shadow (0.0 - 1.0)
    ///   - offset: The offset (in points) of the shadow from the view
    ///   - color: The color of the shadow
    public func addShadow(radius: CGFloat, opacity: CGFloat, offset: CGFloat, color: UIColor) {
        // Configure layer shadow radius for depth effect
        layer.shadowRadius = radius
        
        // Set shadow opacity for visibility level
        layer.shadowOpacity = Float(opacity)
        
        // Apply shadow offset for directional lighting effect
        layer.shadowOffset = CGSize(width: 0, height: offset)
        
        // Set shadow color for theme consistency
        layer.shadowColor = color.cgColor
        
        // Enable rasterization for performance optimization
        layer.shouldRasterize = true
        layer.rasterizationScale = UIScreen.main.scale
    }
    
    /// Applies rounded corners to specific corners of the UIView using bezier path
    /// - Parameters:
    ///   - radius: The radius of the rounded corners
    ///   - corners: The corners to be rounded (e.g., .topLeft, .bottomRight)
    public func roundCorners(radius: CGFloat, corners: UIRectCorner) {
        // Create bezier path with specified corners and radius
        let path = UIBezierPath(
            roundedRect: bounds,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        
        // Create shape layer with path dimensions
        let maskLayer = CAShapeLayer()
        maskLayer.path = path.cgPath
        
        // Apply mask to view's layer for corner clipping
        layer.mask = maskLayer
    }
    
    /// Adds a customizable border to the UIView with specified width and color
    /// - Parameters:
    ///   - width: The width of the border
    ///   - color: The color of the border
    public func addBorder(width: CGFloat, color: UIColor) {
        // Configure layer border width for visibility
        layer.borderWidth = width
        
        // Set border color for theme consistency
        layer.borderColor = color.cgColor
    }
    
    /// Animates the view's opacity from 0 to 1 with customizable duration and completion handler
    /// - Parameters:
    ///   - duration: The duration of the fade animation (in seconds)
    ///   - completion: Optional closure to be executed when the animation completes
    public func fadeIn(duration: TimeInterval = 0.3, completion: (() -> Void)? = nil) {
        // Set initial alpha to 0 for fade start
        alpha = 0
        
        // Animate alpha to 1 using UIView animation
        UIView.animate(
            withDuration: duration,
            animations: { [weak self] in
                self?.alpha = 1
            },
            completion: { _ in
                // Execute completion handler if provided after animation
                completion?()
            }
        )
    }
    
    /// Animates the view's opacity from 1 to 0 with customizable duration and completion handler
    /// - Parameters:
    ///   - duration: The duration of the fade animation (in seconds)
    ///   - completion: Optional closure to be executed when the animation completes
    public func fadeOut(duration: TimeInterval = 0.3, completion: (() -> Void)? = nil) {
        // Set initial alpha to 1 for fade start
        alpha = 1
        
        // Animate alpha to 0 using UIView animation
        UIView.animate(
            withDuration: duration,
            animations: { [weak self] in
                self?.alpha = 0
            },
            completion: { _ in
                // Execute completion handler if provided after animation
                completion?()
            }
        )
    }
    
    /// Applies a shake animation to the view for error feedback using Core Animation
    public func shake() {
        // Create shake transform animation with translation values
        let animation = CAKeyframeAnimation(keyPath: "transform.translation.x")
        animation.timingFunction = CAMediaTimingFunction(name: .linear)
        animation.duration = 0.6
        animation.values = [-20.0, 20.0, -20.0, 20.0, -10.0, 10.0, -5.0, 5.0, 0.0]
        
        // Apply animation to view's layer with timing function
        layer.add(animation, forKey: "shake")
        
        // Auto-reverse the animation for smooth effect
        animation.autoreverses = true
        
        // Remove animation after completion
        DispatchQueue.main.asyncAfter(deadline: .now() + animation.duration) { [weak self] in
            self?.layer.removeAnimation(forKey: "shake")
        }
    }
}