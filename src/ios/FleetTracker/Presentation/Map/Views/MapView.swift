//
// MapView.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure MapKit, CoreLocation frameworks are properly linked in Xcode project
// 2. Verify minimum iOS deployment target is set to iOS 14.0 or higher
// 3. Configure location usage descriptions in Info.plist:
//    - NSLocationWhenInUseUsageDescription
//    - NSLocationAlwaysAndWhenInUseUsageDescription
// 4. Add required map assets to Assets.xcassets
// 5. Configure offline map tile caching settings
// 6. Test map performance with large number of annotations

import MapKit     // iOS 14.0+
import UIKit      // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Custom map view component for real-time vehicle tracking and route visualization
/// Requirements addressed:
/// - Real-time GPS tracking with 30-second update intervals (1.2 Scope/Core Functionality)
/// - Interactive mapping using Google Maps Platform (1.2 Scope/Core Functionality)
/// - Route optimization and planning (1.2 Scope/Core Functionality)
/// - Offline operation support (1.2 Scope/Technical Implementation)
@IBDesignable
class MapView: MKMapView {
    
    // MARK: - Properties
    
    /// Collection of active map annotations
    private let activeAnnotations: NSHashTable<MKAnnotation> = NSHashTable.weakObjects()
    
    /// Collection of active map overlays
    private let activeOverlays: NSHashTable<MKOverlay> = NSHashTable.weakObjects()
    
    /// Current vehicle location
    private var currentLocation: CLLocationCoordinate2D?
    
    /// Flag indicating if real-time tracking is enabled
    private var isTrackingEnabled: Bool = false {
        didSet {
            if isTrackingEnabled {
                LocationManager.shared().startTracking(vehicleId: currentVehicleId ?? "")
            } else {
                LocationManager.shared().stopTracking()
            }
        }
    }
    
    /// Current vehicle identifier being tracked
    private var currentVehicleId: String?
    
    /// Flag indicating if offline mode is active
    public var isOfflineMode: Bool {
        return LocationManager.shared().isOfflineMode
    }
    
    // MARK: - Initialization
    
    /// Initializes the map view with required configuration
    /// - Parameter frame: Initial frame for the view
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupMapView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupMapView()
    }
    
    // MARK: - Setup
    
    /// Configures initial map view settings and offline mode
    private func setupMapView() {
        // Configure map settings
        mapType = .standard
        showsUserLocation = true
        isRotateEnabled = true
        isZoomEnabled = true
        isPitchEnabled = true
        
        // Set delegate
        delegate = self
        
        // Configure location manager delegate
        LocationManager.shared().delegate = self
        
        // Configure gesture recognizers
        let longPressGesture = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress(_:)))
        addGestureRecognizer(longPressGesture)
        
        // Configure offline tile caching
        if let cache = URLCache.shared {
            cache.memoryCapacity = 50 * 1024 * 1024  // 50 MB memory cache
            cache.diskCapacity = 100 * 1024 * 1024   // 100 MB disk cache
        }
        
        // Set initial region to a reasonable default
        let initialRegion = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
            span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
        )
        setRegion(initialRegion, animated: false)
    }
    
    // MARK: - Public Methods
    
    /// Updates vehicle location marker on map with offline support
    /// - Parameters:
    ///   - coordinate: New vehicle coordinates
    ///   - vehicleId: Vehicle identifier
    public func updateVehicleLocation(coordinate: CLLocationCoordinate2D, vehicleId: String) {
        // Store current vehicle ID
        currentVehicleId = vehicleId
        
        // Find existing vehicle annotation or create new one
        let annotation: MKPointAnnotation
        if let existing = activeAnnotations.allObjects.first(where: { ($0 as? MKPointAnnotation)?.title == vehicleId }) as? MKPointAnnotation {
            annotation = existing
        } else {
            annotation = MKPointAnnotation()
            annotation.title = vehicleId
            activeAnnotations.add(annotation)
            addAnnotation(annotation)
        }
        
        // Update annotation position with animation
        UIView.animate(withDuration: 0.3) {
            annotation.coordinate = coordinate
        }
        
        // Update current location
        currentLocation = coordinate
        
        // Cache location data for offline use
        if isOfflineMode {
            let locationData = [
                "vehicleId": vehicleId,
                "latitude": coordinate.latitude,
                "longitude": coordinate.longitude,
                "timestamp": Date().timeIntervalSince1970
            ] as [String : Any]
            
            UserDefaults.standard.set(locationData, forKey: "lastKnownLocation_\(vehicleId)")
        }
    }
    
    /// Displays route path and delivery locations with progress tracking
    /// - Parameter route: Route to display
    public func displayRoute(_ route: Route) {
        // Clear existing route overlays
        removeOverlays(activeOverlays.allObjects)
        activeOverlays.removeAllObjects()
        
        // Create route overlay
        let routeOverlay = MKPolyline(coordinates: route.waypoints.map { $0.coordinate }, count: route.waypoints.count)
        activeOverlays.add(routeOverlay)
        addOverlay(routeOverlay)
        
        // Add delivery location annotations
        route.deliveries.forEach { delivery in
            let annotation = DeliveryAnnotationView(annotation: nil, reuseIdentifier: "DeliveryAnnotation")
            annotation.delivery = delivery
            activeAnnotations.add(annotation)
            addAnnotation(annotation)
        }
        
        // Fit map region to route bounds with padding
        let routeBounds = route.waypoints.reduce(MKMapRect.null) { rect, waypoint in
            let point = MKMapPoint(waypoint.coordinate)
            let pointRect = MKMapRect(x: point.x, y: point.y, width: 0, height: 0)
            return rect.union(pointRect)
        }
        
        setVisibleMapRect(routeBounds, edgePadding: UIEdgeInsets(top: 50, left: 50, bottom: 50, right: 50), animated: true)
        
        // Cache route data for offline access
        if isOfflineMode {
            let routeData = try? JSONEncoder().encode(route)
            UserDefaults.standard.set(routeData, forKey: "cachedRoute_\(route.id)")
        }
    }
    
    /// Removes all annotations and overlays
    public func clearMap() {
        // Remove all annotations
        removeAnnotations(annotations)
        activeAnnotations.removeAllObjects()
        
        // Remove all overlays
        removeOverlays(overlays)
        activeOverlays.removeAllObjects()
        
        // Clear cached offline data
        if isOfflineMode {
            UserDefaults.standard.removeObject(forKey: "lastKnownLocation_\(currentVehicleId ?? "")")
            UserDefaults.standard.removeObject(forKey: "cachedRoute_\(currentVehicleId ?? "")")
        }
    }
    
    // MARK: - Private Methods
    
    /// Handles long press gesture for map interaction
    /// - Parameter gesture: Long press gesture recognizer
    @objc private func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
        guard gesture.state == .began else { return }
        
        let point = gesture.location(in: self)
        let coordinate = convert(point, toCoordinateFrom: self)
        
        // Handle long press action (e.g., add waypoint, show info)
    }
}

// MARK: - MKMapViewDelegate

extension MapView: MKMapViewDelegate {
    
    /// Provides custom annotation views
    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        // Skip user location annotation
        if annotation is MKUserLocation {
            return nil
        }
        
        // Handle delivery annotations
        if let delivery = annotation as? DeliveryAnnotationView {
            let identifier = "DeliveryAnnotation"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? DeliveryAnnotationView
            
            if annotationView == nil {
                annotationView = DeliveryAnnotationView(annotation: annotation, reuseIdentifier: identifier)
            }
            
            annotationView?.configure(delivery: delivery.delivery!)
            return annotationView
        }
        
        // Handle vehicle annotations
        if annotation.title == currentVehicleId {
            let identifier = "VehicleAnnotation"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier)
            
            if annotationView == nil {
                annotationView = MKAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                annotationView?.image = UIImage(named: "vehicle_marker")
                annotationView?.canShowCallout = true
            }
            
            return annotationView
        }
        
        return nil
    }
    
    /// Provides custom overlay renderers
    func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
        if let route = overlay as? MKPolyline {
            let renderer = RouteOverlayView(overlay: overlay, route: Route())  // Pass appropriate route object
            renderer.lineWidth = 3.0
            renderer.routeColor = .systemBlue
            return renderer
        }
        return MKOverlayRenderer(overlay: overlay)
    }
}

// MARK: - LocationUpdateDelegate

extension MapView: LocationUpdateDelegate {
    
    /// Handles real-time location updates with 30-second interval validation
    func didUpdateLocation(_ location: CLLocation) {
        guard let vehicleId = currentVehicleId else { return }
        
        // Validate update interval (30 seconds)
        if let lastUpdate = UserDefaults.standard.object(forKey: "lastLocationUpdate_\(vehicleId)") as? Date {
            let interval = Date().timeIntervalSince(lastUpdate)
            guard interval >= 30.0 else { return }
        }
        
        // Update map with new location
        updateVehicleLocation(coordinate: location.coordinate, vehicleId: vehicleId)
        
        // Store update timestamp
        UserDefaults.standard.set(Date(), forKey: "lastLocationUpdate_\(vehicleId)")
    }
    
    /// Handles location update failures
    func didFailWithError(_ error: Error) {
        // Handle error (e.g., show alert, switch to offline mode)
        print("Location update failed: \(error.localizedDescription)")
    }
}