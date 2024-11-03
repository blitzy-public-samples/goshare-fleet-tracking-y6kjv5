//
// ActiveRouteView.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure location permissions in Info.plist (NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription)
// 2. Enable background location updates in project capabilities
// 3. Set up MapKit entitlements for turn-by-turn navigation
// 4. Verify camera permissions for proof of delivery capture
// 5. Configure push notification entitlements for delivery updates

import SwiftUI      // iOS 14.0+
import MapKit       // iOS 14.0+
import Combine      // iOS 14.0+

/// SwiftUI view that displays and manages the currently active delivery route
/// Requirements addressed:
/// - Real-time GPS tracking with 30-second update intervals (1.2 Scope/Core Functionality)
/// - Digital proof of delivery capabilities (1.2 Scope/Core Functionality)
/// - Route optimization and planning capabilities (1.2 Scope/Core Functionality)
struct ActiveRouteView: View {
    
    // MARK: - Properties
    
    /// Current route being managed
    private let route: Route
    
    /// List of deliveries for the route
    private let deliveries: [Delivery]
    
    /// State for navigation mode
    @State private var isNavigating: Bool = false
    
    /// State for delivery details sheet
    @State private var showingDeliveryDetails: Bool = false
    
    /// Currently selected delivery ID
    @State private var selectedDeliveryId: String?
    
    /// MapView instance for route visualization
    private let mapView: MKMapView
    
    /// Location manager for GPS tracking
    private let locationManager: CLLocationManager
    
    /// Publisher for location updates
    private let locationUpdates = PassthroughSubject<Location, Never>()
    
    /// Cancellable storage for subscribers
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - View State
    
    @State private var routeProgress: Double = 0.0
    @State private var currentSpeed: Double = 0.0
    @State private var estimatedArrival: Date?
    @State private var nextDeliveryDistance: Double = 0.0
    @State private var showingNavigationAlert: Bool = false
    @State private var showingCompletionSheet: Bool = false
    @State private var errorMessage: String?
    
    // MARK: - Initialization
    
    init(route: Route, deliveries: [Delivery]) {
        self.route = route
        self.deliveries = deliveries
        
        // Initialize map view
        self.mapView = MKMapView()
        mapView.showsUserLocation = true
        mapView.userTrackingMode = .followWithHeading
        
        // Initialize location manager
        self.locationManager = CLLocationManager()
        locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        locationManager.distanceFilter = 10 // meters
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        
        setupLocationTracking()
        setupRouteVisualization()
        setupSubscribers()
    }
    
    // MARK: - View Body
    
    var body: some View {
        ZStack {
            // Map container
            MapViewContainer(mapView: mapView)
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                // Route progress header
                routeProgressHeader
                    .padding()
                
                Spacer()
                
                // Delivery list
                deliveryListView
                    .frame(height: 200)
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 4)
                    .padding()
            }
            
            // Navigation controls
            if isNavigating {
                navigationControlsOverlay
            }
            
            // Error message
            if let error = errorMessage {
                errorBanner(message: error)
            }
        }
        .sheet(isPresented: $showingDeliveryDetails) {
            if let deliveryId = selectedDeliveryId,
               let delivery = deliveries.first(where: { $0.id == deliveryId }) {
                deliveryDetailsSheet(delivery: delivery)
            }
        }
        .alert(isPresented: $showingNavigationAlert) {
            navigationAlert
        }
        .sheet(isPresented: $showingCompletionSheet) {
            routeCompletionSheet
        }
        .onAppear {
            startLocationUpdates()
        }
        .onDisappear {
            stopLocationUpdates()
        }
    }
    
    // MARK: - Subviews
    
    private var routeProgressHeader: some View {
        VStack(spacing: 8) {
            // Progress bar
            ProgressView(value: routeProgress)
                .progressViewStyle(LinearProgressViewStyle())
            
            HStack {
                // Completed deliveries counter
                Text("\(route.completedDeliveries)/\(route.totalDeliveries) Deliveries")
                    .font(.subheadline)
                
                Spacer()
                
                // ETA
                if let eta = estimatedArrival {
                    Text("ETA: \(eta, style: .time)")
                        .font(.subheadline)
                }
            }
            
            // Current speed when navigating
            if isNavigating {
                Text("Speed: \(Int(currentSpeed)) km/h")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 4)
    }
    
    private var deliveryListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(deliveries, id: \.id) { delivery in
                    deliveryCard(delivery: delivery)
                }
            }
            .padding()
        }
    }
    
    private func deliveryCard(delivery: Delivery) -> some View {
        Button(action: {
            selectedDeliveryId = delivery.id
            showingDeliveryDetails = true
        }) {
            HStack {
                // Status indicator
                Circle()
                    .fill(statusColor(for: delivery.status))
                    .frame(width: 12, height: 12)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(delivery.address)
                        .font(.headline)
                        .lineLimit(1)
                    
                    if delivery.status == .inTransit {
                        Text("\(Int(nextDeliveryDistance)) km away")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Action button based on status
                CustomButton(
                    buttonColor: actionButtonColor(for: delivery.status),
                    isEnabled: canUpdateDelivery(delivery)
                ) {
                    handleDeliveryAction(delivery)
                }
                .frame(width: 100)
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(8)
        }
    }
    
    private var navigationControlsOverlay: some View {
        VStack {
            Spacer()
            
            HStack {
                // Stop navigation button
                CustomButton(
                    buttonColor: .red,
                    cornerRadius: 8,
                    shadowRadius: 4
                ) {
                    showingNavigationAlert = true
                }
                .frame(width: 120)
                
                Spacer()
                
                // Next delivery button
                if let nextDelivery = nextPendingDelivery() {
                    CustomButton(
                        buttonColor: .blue,
                        cornerRadius: 8,
                        shadowRadius: 4
                    ) {
                        navigateToDelivery(nextDelivery)
                    }
                    .frame(width: 120)
                }
            }
            .padding()
        }
    }
    
    private func deliveryDetailsSheet(delivery: Delivery) -> some View {
        VStack {
            // Delivery details header
            Text("Delivery Details")
                .font(.title)
                .padding()
            
            // Address and status
            Group {
                Text(delivery.address)
                    .font(.headline)
                
                Text("Status: \(delivery.status.rawValue)")
                    .foregroundColor(statusColor(for: delivery.status))
            }
            .padding(.horizontal)
            
            // Proof of delivery section if delivered
            if delivery.status == .delivered,
               let proof = delivery.proof {
                proofOfDeliveryView(proof: proof)
            }
            
            // Action buttons
            HStack {
                CustomButton(
                    buttonColor: .red,
                    cornerRadius: 8,
                    shadowRadius: 4
                ) {
                    showingDeliveryDetails = false
                }
                
                if canUpdateDelivery(delivery) {
                    CustomButton(
                        buttonColor: .blue,
                        cornerRadius: 8,
                        shadowRadius: 4
                    ) {
                        handleDeliveryAction(delivery)
                    }
                }
            }
            .padding()
        }
    }
    
    private var navigationAlert: Alert {
        Alert(
            title: Text("Stop Navigation"),
            message: Text("Are you sure you want to stop navigation?"),
            primaryButton: .destructive(Text("Stop")) {
                stopNavigation()
            },
            secondaryButton: .cancel()
        )
    }
    
    private var routeCompletionSheet: some View {
        VStack {
            Text("Route Completed!")
                .font(.title)
                .padding()
            
            // Route statistics
            Group {
                Text("Total Deliveries: \(route.totalDeliveries)")
                Text("Total Distance: \(Int(route.estimatedDistance)) km")
                if let startTime = route.startTime,
                   let endTime = route.endTime {
                    Text("Duration: \(formatDuration(from: startTime, to: endTime))")
                }
            }
            .padding(.horizontal)
            
            CustomButton(
                buttonColor: .blue,
                cornerRadius: 8,
                shadowRadius: 4
            ) {
                showingCompletionSheet = false
            }
            .padding()
        }
    }
    
    private func errorBanner(message: String) -> some View {
        VStack {
            Text(message)
                .foregroundColor(.white)
                .padding()
                .background(Color.red)
                .cornerRadius(8)
                .padding()
            
            Spacer()
        }
    }
    
    // MARK: - Location Tracking
    
    private func setupLocationTracking() {
        // Request location permissions
        locationManager.requestAlwaysAuthorization()
        
        // Configure location updates publisher
        NotificationCenter.default
            .publisher(for: .CLLocationManagerDidUpdateLocations)
            .compactMap { notification -> Location? in
                guard let locations = notification.userInfo?["locations"] as? [CLLocation],
                      let latest = locations.last else { return nil }
                
                return Location(
                    coordinate: CLLocationCoordinate2D(
                        latitude: latest.coordinate.latitude,
                        longitude: latest.coordinate.longitude
                    )
                )
            }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] location in
                self?.handleLocationUpdate(location)
            }
            .store(in: &cancellables)
    }
    
    private func startLocationUpdates() {
        locationManager.startUpdatingLocation()
        
        // Start periodic updates timer (30-second intervals)
        Timer.publish(every: 30, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updateRouteProgress()
            }
            .store(in: &cancellables)
    }
    
    private func stopLocationUpdates() {
        locationManager.stopUpdatingLocation()
        cancellables.removeAll()
    }
    
    private func handleLocationUpdate(_ location: Location) {
        // Update route waypoints
        var updatedWaypoints = route.waypoints
        updatedWaypoints.append(location)
        route.updateWaypoints(updatedWaypoints)
        
        // Update map annotations
        updateMapAnnotations()
        
        // Calculate distance to next delivery
        if let nextDelivery = nextPendingDelivery(),
           let deliveryLocation = nextDelivery.deliveryLocation {
            nextDeliveryDistance = calculateDistance(
                from: location,
                to: deliveryLocation
            )
        }
        
        // Update current speed
        if let speed = locationManager.location?.speed {
            currentSpeed = max(0, speed * 3.6) // Convert m/s to km/h
        }
        
        // Publish location update
        locationUpdates.send(location)
    }
    
    // MARK: - Route Management
    
    private func setupRouteVisualization() {
        // Add route overlay to map
        let coordinates = route.waypoints.map { $0.coordinate }
        let polyline = MKPolyline(coordinates: coordinates, count: coordinates.count)
        mapView.addOverlay(polyline)
        
        // Add delivery annotations
        for delivery in deliveries {
            if let location = delivery.deliveryLocation {
                let annotation = MKPointAnnotation()
                annotation.coordinate = location.coordinate
                annotation.title = delivery.address
                annotation.subtitle = delivery.status.rawValue
                mapView.addAnnotation(annotation)
            }
        }
        
        // Set initial map region
        if let firstLocation = route.waypoints.first?.coordinate {
            let region = MKCoordinateRegion(
                center: firstLocation,
                latitudinalMeters: 1000,
                longitudinalMeters: 1000
            )
            mapView.setRegion(region, animated: true)
        }
    }
    
    private func updateMapAnnotations() {
        mapView.removeAnnotations(mapView.annotations)
        mapView.removeOverlays(mapView.overlays)
        
        // Re-add route overlay and delivery annotations
        setupRouteVisualization()
    }
    
    private func startNavigation() {
        guard !isNavigating else { return }
        
        if route.startRoute() {
            isNavigating = true
            
            // Configure turn-by-turn navigation
            if let nextDelivery = nextPendingDelivery(),
               let deliveryLocation = nextDelivery.deliveryLocation {
                let destination = MKMapItem(placemark: MKPlacemark(coordinate: deliveryLocation.coordinate))
                destination.name = nextDelivery.address
                
                MKMapItem.openMaps(
                    with: [destination],
                    launchOptions: [
                        MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
                    ]
                )
            }
        } else {
            errorMessage = "Failed to start route"
        }
    }
    
    private func stopNavigation() {
        isNavigating = false
        mapView.userTrackingMode = .none
    }
    
    private func updateRouteProgress() {
        // Calculate progress based on completed deliveries
        routeProgress = Double(route.completedDeliveries) / Double(route.totalDeliveries)
        
        // Update ETA
        if let startTime = route.startTime {
            let averageTimePerDelivery = route.estimatedDuration / Double(route.totalDeliveries)
            let remainingDeliveries = Double(route.totalDeliveries - route.completedDeliveries)
            let estimatedRemainingTime = remainingDeliveries * averageTimePerDelivery
            
            estimatedArrival = Date(timeInterval: estimatedRemainingTime, since: startTime)
        }
        
        // Check for route completion
        if route.completedDeliveries == route.totalDeliveries {
            handleRouteCompletion()
        }
    }
    
    private func handleRouteCompletion() {
        if route.completeRoute() {
            stopNavigation()
            showingCompletionSheet = true
        }
    }
    
    // MARK: - Delivery Management
    
    private func handleDeliveryAction(_ delivery: Delivery) {
        switch delivery.status {
        case .pending:
            delivery.updateStatus(.inTransit)
            navigateToDelivery(delivery)
            
        case .inTransit:
            selectedDeliveryId = delivery.id
            showingDeliveryDetails = true
            
        default:
            break
        }
        
        route.updateDeliveryProgress(deliveryId: delivery.id, status: delivery.status)
        updateMapAnnotations()
    }
    
    private func navigateToDelivery(_ delivery: Delivery) {
        guard let location = delivery.deliveryLocation else { return }
        
        let region = MKCoordinateRegion(
            center: location.coordinate,
            latitudinalMeters: 1000,
            longitudinalMeters: 1000
        )
        mapView.setRegion(region, animated: true)
        
        if !isNavigating {
            startNavigation()
        }
    }
    
    private func nextPendingDelivery() -> Delivery? {
        return deliveries.first { $0.status == .pending }
    }
    
    private func canUpdateDelivery(_ delivery: Delivery) -> Bool {
        switch delivery.status {
        case .pending:
            return true
        case .inTransit:
            return true
        default:
            return false
        }
    }
    
    // MARK: - Helper Functions
    
    private func statusColor(for status: DeliveryStatus) -> Color {
        switch status {
        case .pending:
            return .yellow
        case .inTransit:
            return .blue
        case .delivered:
            return .green
        case .failed:
            return .red
        case .cancelled:
            return .gray
        }
    }
    
    private func actionButtonColor(for status: DeliveryStatus) -> UIColor {
        switch status {
        case .pending:
            return .systemBlue
        case .inTransit:
            return .systemGreen
        default:
            return .systemGray
        }
    }
    
    private func calculateDistance(from: Location, to: Location) -> Double {
        let fromLocation = CLLocation(
            latitude: from.coordinate.latitude,
            longitude: from.coordinate.longitude
        )
        let toLocation = CLLocation(
            latitude: to.coordinate.latitude,
            longitude: to.coordinate.longitude
        )
        return fromLocation.distance(from: toLocation) / 1000 // Convert to kilometers
    }
    
    private func formatDuration(from start: Date, to end: Date) -> String {
        let duration = end.timeIntervalSince(start)
        let hours = Int(duration) / 3600
        let minutes = Int(duration) / 60 % 60
        return String(format: "%02d:%02d", hours, minutes)
    }
    
    // MARK: - Subscribers Setup
    
    private func setupSubscribers() {
        // Subscribe to location updates
        locationUpdates
            .throttle(for: .seconds(30), scheduler: DispatchQueue.main, latest: true)
            .sink { [weak self] location in
                self?.handleLocationUpdate(location)
            }
            .store(in: &cancellables)
        
        // Subscribe to delivery status changes
        NotificationCenter.default
            .publisher(for: NSNotification.Name("RouteDeliveryProgressUpdated"))
            .sink { [weak self] _ in
                self?.updateRouteProgress()
            }
            .store(in: &cancellables)
    }
}

// MARK: - MapView Container

private struct MapViewContainer: UIViewRepresentable {
    let mapView: MKMapView
    
    func makeUIView(context: Context) -> MKMapView {
        mapView
    }
    
    func updateUIView(_ uiView: MKMapView, context: Context) {
        // Updates handled by parent view
    }
}