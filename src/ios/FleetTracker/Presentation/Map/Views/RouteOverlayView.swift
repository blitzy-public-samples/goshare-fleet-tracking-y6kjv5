//
// RouteOverlayView.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify MapKit framework is properly linked in Xcode project
// 2. Ensure minimum iOS deployment target is set to iOS 14.0 or higher
// 3. Configure map styling assets if custom route colors are needed
// 4. Test with different zoom levels to verify waypoint visibility thresholds

import MapKit     // iOS 14.0+
import UIKit      // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Custom map overlay renderer for visualizing delivery routes with real-time progress tracking
/// Requirements addressed:
/// - Interactive mapping using Google Maps Platform (1.1 System Overview/Web Dashboard)
/// - Route optimization and planning capabilities (1.2 Scope/Core Functionality)
/// - Real-time data visualization and analytics (1.1 System Overview/Web Dashboard)
@objc
public class RouteOverlayView: MKOverlayRenderer {
    
    // MARK: - Properties
    
    /// Route data model containing waypoints and status information
    private let route: Route
    
    /// Color used for rendering the route path
    public var routeColor: UIColor
    
    /// Width of the route path line
    public var lineWidth: CGFloat
    
    /// Color used for rendering waypoint markers
    private var waypointColor: UIColor
    
    /// Radius of waypoint markers
    private var waypointRadius: CGFloat
    
    /// Color used for completed route segments
    private var completedSegmentColor: UIColor
    
    /// Minimum zoom scale for showing waypoint markers
    private var zoomScaleThreshold: CGFloat
    
    // MARK: - Initialization
    
    /// Initializes the route overlay renderer with route data and default styling
    /// - Parameters:
    ///   - overlay: Map overlay object
    ///   - route: Route model containing waypoint and progress data
    public init(overlay: MKOverlay, route: Route) {
        self.route = route
        
        // Initialize default styling values
        self.lineWidth = 3.0
        self.waypointRadius = 8.0
        self.zoomScaleThreshold = 0.1
        
        // Configure colors based on route status
        switch route.status {
        case .planned:
            self.routeColor = .systemBlue
            self.waypointColor = .systemBlue
        case .inProgress:
            self.routeColor = .systemGreen
            self.waypointColor = .systemGreen
        case .completed:
            self.routeColor = .systemGray
            self.waypointColor = .systemGray
        case .cancelled:
            self.routeColor = .systemRed
            self.waypointColor = .systemRed
        }
        
        // Set completed segment color to darker green
        self.completedSegmentColor = .systemGreen.withAlphaComponent(0.8)
        
        super.init(overlay: overlay)
    }
    
    // MARK: - Drawing
    
    /// Renders the route path and waypoints with progress indication
    /// - Parameters:
    ///   - context: Graphics context for drawing
    ///   - zoomScale: Current map zoom scale
    ///   - rect: Rectangle to draw in
    public override func draw(_ context: CGContext, zoomScale: MKZoomScale, in rect: CGRect) {
        // Save current graphics state
        context.saveGState()
        
        // Calculate scaled line width and waypoint radius based on zoom scale
        let scaledLineWidth = lineWidth / zoomScale
        let scaledWaypointRadius = waypointRadius / zoomScale
        
        // Draw route path between waypoints
        drawRoutePath(context)
        
        // Draw waypoint markers if zoom scale is above threshold
        if zoomScale >= zoomScaleThreshold {
            drawWaypoints(context)
        }
        
        // Restore graphics state
        context.restoreGState()
    }
    
    /// Draws the path between route waypoints with progress indication
    /// - Parameter context: Graphics context for drawing
    private func drawRoutePath(_ context: CGContext) {
        // Filter valid waypoints
        let validWaypoints = route.waypoints.filter { $0.isValid() }
        guard validWaypoints.count >= 2 else { return }
        
        // Create path for route segments
        let path = CGMutablePath()
        
        // Calculate completed segment ratio
        let completedRatio = Double(route.completedDeliveries) / Double(route.totalDeliveries)
        let completedSegments = Int(Double(validWaypoints.count - 1) * completedRatio)
        
        // Draw incomplete segments
        context.setStrokeColor(routeColor.cgColor)
        context.setLineWidth(lineWidth)
        context.setLineCap(.round)
        context.setLineJoin(.round)
        
        for i in completedSegments..<validWaypoints.count - 1 {
            let startPoint = point(for: validWaypoints[i].coordinate)
            let endPoint = point(for: validWaypoints[i + 1].coordinate)
            
            path.move(to: startPoint)
            path.addLine(to: endPoint)
        }
        
        context.addPath(path)
        context.strokePath()
        
        // Draw completed segments with different color
        context.setStrokeColor(completedSegmentColor.cgColor)
        
        let completedPath = CGMutablePath()
        for i in 0..<completedSegments {
            let startPoint = point(for: validWaypoints[i].coordinate)
            let endPoint = point(for: validWaypoints[i + 1].coordinate)
            
            completedPath.move(to: startPoint)
            completedPath.addLine(to: endPoint)
        }
        
        context.addPath(completedPath)
        context.strokePath()
    }
    
    /// Draws waypoint markers at each location with completion status
    /// - Parameter context: Graphics context for drawing
    private func drawWaypoints(_ context: CGContext) {
        // Filter valid waypoints
        let validWaypoints = route.waypoints.filter { $0.isValid() }
        
        // Calculate completed waypoint index
        let completedIndex = Int(Double(validWaypoints.count) * 
                               (Double(route.completedDeliveries) / Double(route.totalDeliveries)))
        
        for (index, waypoint) in validWaypoints.enumerated() {
            let center = point(for: waypoint.coordinate)
            
            // Set waypoint color based on completion status
            let color = index < completedIndex ? completedSegmentColor : waypointColor
            context.setFillColor(color.cgColor)
            
            // Draw circular marker
            context.addEllipse(in: CGRect(
                x: center.x - waypointRadius,
                y: center.y - waypointRadius,
                width: waypointRadius * 2,
                height: waypointRadius * 2
            ))
            
            // Add drop shadow for depth
            context.setShadow(offset: CGSize(width: 0, height: 1), blur: 2)
            context.fillPath()
            
            // Draw completion indicator if waypoint is completed
            if index < completedIndex {
                context.setStrokeColor(UIColor.white.cgColor)
                context.setLineWidth(1.5)
                
                let checkmarkPath = CGMutablePath()
                checkmarkPath.move(to: CGPoint(x: center.x - 4, y: center.y))
                checkmarkPath.addLine(to: CGPoint(x: center.x - 1, y: center.y + 3))
                checkmarkPath.addLine(to: CGPoint(x: center.x + 4, y: center.y - 2))
                
                context.addPath(checkmarkPath)
                context.strokePath()
            }
        }
    }
}