//
// RouteService.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify CoreData schema includes Route entity with all required attributes
// 2. Configure background fetch capabilities for sync operations
// 3. Set up proper error logging and monitoring system
// 4. Test offline data handling scenarios
// 5. Verify location tracking permissions in Info.plist

import Foundation  // iOS 14.0+
import Combine    // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Service class managing route operations, optimization, and real-time tracking
/// with offline-first architecture and 30-second update intervals
@objc
@objcMembers
public class RouteService: NSObject, LocationUpdateDelegate {
    
    // MARK: - Properties
    
    /// Shared singleton instance
    public static let shared = RouteService()
    
    /// Repository for route data persistence
    private let repository: RouteRepository
    
    /// Location manager for real-time tracking
    private let locationManager: LocationManager
    
    /// Subject for broadcasting route updates
    private let routeUpdateSubject = PassthroughSubject<Route, Error>()
    
    /// Set to store active subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    /// Current offline mode status
    public private(set) var isOfflineMode: Bool
    
    // MARK: - Initialization
    
    private override init() {
        self.repository = RouteRepository.shared
        self.locationManager = LocationManager.shared()
        self.isOfflineMode = locationManager.isOfflineMode
        
        super.init()
        
        // Set location manager delegate
        locationManager.delegate = self
    }
    
    // MARK: - Route Management
    
    /// Starts a route and begins tracking with 30-second updates
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Offline operation support in mobile applications
    public func startRoute(routeId: String) -> AnyPublisher<Bool, Error> {
        return repository.getRoute(routeId: routeId)
            .flatMap { [weak self] route -> AnyPublisher<Bool, Error> in
                guard let self = self,
                      let route = route,
                      route.status == .planned else {
                    return Fail(error: NSError(domain: "com.fleettracker.route",
                                             code: -1,
                                             userInfo: [NSLocalizedDescriptionKey: "Invalid route or status"]))
                        .eraseToAnyPublisher()
                }
                
                // Start route
                guard route.startRoute() else {
                    return Fail(error: NSError(domain: "com.fleettracker.route",
                                             code: -2,
                                             userInfo: [NSLocalizedDescriptionKey: "Failed to start route"]))
                        .eraseToAnyPublisher()
                }
                
                // Start location tracking
                self.locationManager.startTracking(vehicleId: route.vehicleId)
                
                // Save updated route
                return self.repository.saveRoute(route)
            }
            .eraseToAnyPublisher()
    }
    
    /// Completes a route and stops tracking
    /// Requirements addressed:
    /// - Route optimization and planning capabilities
    /// - Offline operation support
    public func completeRoute(routeId: String) -> AnyPublisher<Bool, Error> {
        return repository.getRoute(routeId: routeId)
            .flatMap { [weak self] route -> AnyPublisher<Bool, Error> in
                guard let self = self,
                      let route = route,
                      route.status == .inProgress else {
                    return Fail(error: NSError(domain: "com.fleettracker.route",
                                             code: -1,
                                             userInfo: [NSLocalizedDescriptionKey: "Invalid route or status"]))
                        .eraseToAnyPublisher()
                }
                
                // Complete route
                guard route.completeRoute() else {
                    return Fail(error: NSError(domain: "com.fleettracker.route",
                                             code: -2,
                                             userInfo: [NSLocalizedDescriptionKey: "Failed to complete route"]))
                        .eraseToAnyPublisher()
                }
                
                // Stop location tracking
                self.locationManager.stopTracking()
                
                // Save updated route
                return self.repository.saveRoute(route)
            }
            .eraseToAnyPublisher()
    }
    
    /// Optimizes route waypoints for efficiency
    /// Requirements addressed:
    /// - Route optimization and planning capabilities for delivery fleet
    public func optimizeRoute(routeId: String) -> AnyPublisher<Route, Error> {
        return repository.getRoute(routeId: routeId)
            .flatMap { [weak self] route -> AnyPublisher<Route, Error> in
                guard let self = self,
                      let route = route else {
                    return Fail(error: NSError(domain: "com.fleettracker.route",
                                             code: -1,
                                             userInfo: [NSLocalizedDescriptionKey: "Route not found"]))
                        .eraseToAnyPublisher()
                }
                
                // Calculate optimal waypoint order
                let optimizedWaypoints = self.calculateOptimalWaypoints(route.waypoints)
                
                // Update route waypoints
                route.updateWaypoints(optimizedWaypoints)
                
                // Save optimized route
                return self.repository.saveRoute(route)
                    .flatMap { success -> AnyPublisher<Route, Error> in
                        if success {
                            return Just(route)
                                .setFailureType(to: Error.self)
                                .eraseToAnyPublisher()
                        } else {
                            return Fail(error: NSError(domain: "com.fleettracker.route",
                                                     code: -2,
                                                     userInfo: [NSLocalizedDescriptionKey: "Failed to save optimized route"]))
                                .eraseToAnyPublisher()
                        }
                    }
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Updates route progress based on completed deliveries
    /// Requirements addressed:
    /// - Real-time GPS tracking
    /// - Offline operation support
    public func updateRouteProgress(routeId: String, deliveryId: String, status: DeliveryStatus) -> AnyPublisher<Route, Error> {
        return repository.getRoute(routeId: routeId)
            .flatMap { [weak self] route -> AnyPublisher<Route, Error> in
                guard let self = self,
                      let route = route else {
                    return Fail(error: NSError(domain: "com.fleettracker.route",
                                             code: -1,
                                             userInfo: [NSLocalizedDescriptionKey: "Route not found"]))
                        .eraseToAnyPublisher()
                }
                
                // Update delivery progress
                route.updateDeliveryProgress(deliveryId: deliveryId, status: status)
                
                // Save updated route
                return self.repository.saveRoute(route)
                    .flatMap { success -> AnyPublisher<Route, Error> in
                        if success {
                            return Just(route)
                                .setFailureType(to: Error.self)
                                .eraseToAnyPublisher()
                        } else {
                            return Fail(error: NSError(domain: "com.fleettracker.route",
                                                     code: -2,
                                                     userInfo: [NSLocalizedDescriptionKey: "Failed to save route progress"]))
                                .eraseToAnyPublisher()
                        }
                    }
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - LocationUpdateDelegate
    
    /// Handles location updates for active route
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    public func didUpdateLocation(_ location: Location) {
        guard let currentRoute = getCurrentActiveRoute() else {
            return
        }
        
        // Update route with new location
        var updatedWaypoints = currentRoute.waypoints
        updatedWaypoints.append(location)
        currentRoute.updateWaypoints(updatedWaypoints)
        
        // Save route update
        _ = repository.saveRoute(currentRoute)
            .sink(receiveCompletion: { _ in },
                  receiveValue: { [weak self] success in
                if success {
                    self?.routeUpdateSubject.send(currentRoute)
                }
            })
            .store(in: &cancellables)
    }
    
    /// Handles location update failures and offline mode
    public func didFailWithError(_ error: Error) {
        // Update offline mode status
        isOfflineMode = locationManager.isOfflineMode
        
        // Notify observers of error
        routeUpdateSubject.send(completion: .failure(error))
    }
    
    // MARK: - Private Helpers
    
    /// Retrieves current active route
    private func getCurrentActiveRoute() -> Route? {
        // Implementation would retrieve active route from repository
        // This is a placeholder that should be implemented
        return nil
    }
    
    /// Calculates optimal waypoint order using nearest neighbor algorithm
    private func calculateOptimalWaypoints(_ waypoints: [Location]) -> [Location] {
        guard waypoints.count > 2 else {
            return waypoints
        }
        
        var optimized: [Location] = []
        var remaining = waypoints
        
        // Start with first waypoint
        optimized.append(remaining.removeFirst())
        
        // Add nearest neighbor until all waypoints are used
        while !remaining.isEmpty {
            let current = optimized.last!
            if let (nextIndex, _) = remaining.enumerated()
                .min(by: { a, b in
                    let distA = calculateDistance(from: current, to: a.element)
                    let distB = calculateDistance(from: current, to: b.element)
                    return distA < distB
                }) {
                optimized.append(remaining.remove(at: nextIndex))
            }
        }
        
        return optimized
    }
    
    /// Calculates distance between two locations
    private func calculateDistance(from: Location, to: Location) -> CLLocationDistance {
        let fromLocation = CLLocation(latitude: from.coordinate.latitude,
                                    longitude: from.coordinate.longitude)
        let toLocation = CLLocation(latitude: to.coordinate.latitude,
                                  longitude: to.coordinate.longitude)
        return fromLocation.distance(from: toLocation)
    }
}