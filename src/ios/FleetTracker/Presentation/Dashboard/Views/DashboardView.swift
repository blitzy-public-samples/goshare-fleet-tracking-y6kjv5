//
// DashboardView.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure MapKit API key in Xcode project settings
// 2. Verify Charts framework is properly linked (version 4.0.0)
// 3. Test offline mode with airplane mode enabled
// 4. Validate map caching settings for offline support
// 5. Review memory usage with large vehicle fleets

import UIKit      // iOS 14.0+
import MapKit     // iOS 14.0+
import Charts     // version 4.0.0

/// Main dashboard view for the Fleet Tracking iOS application
/// Requirements addressed:
/// - Interactive fleet management dashboard with real-time data visualization
/// - Real-time GPS tracking with 30-second update intervals
/// - Analytics and reporting capabilities
/// - Offline operation support
@IBDesignable
public class DashboardView: UIView {
    
    // MARK: - Properties
    
    private let mapView: MKMapView = {
        let map = MKMapView()
        map.translatesAutoresizingMaskIntoConstraints = false
        map.mapType = .standard
        map.showsUserLocation = true
        map.showsCompass = true
        map.showsScale = true
        return map
    }()
    
    private let vehicleStatusCollection: UICollectionView = {
        let layout = UICollectionViewFlowLayout()
        layout.scrollDirection = .horizontal
        layout.minimumInteritemSpacing = 10
        layout.minimumLineSpacing = 10
        layout.itemSize = CGSize(width: 150, height: 100)
        
        let collection = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collection.translatesAutoresizingMaskIntoConstraints = false
        collection.backgroundColor = .systemBackground
        collection.showsHorizontalScrollIndicator = false
        return collection
    }()
    
    private let metricsStackView: UIStackView = {
        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 16
        stack.distribution = .fillEqually
        return stack
    }()
    
    private let refreshButton: CustomButton = {
        let button = CustomButton()
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Refresh", for: .normal)
        button.buttonColor = .systemBlue
        button.cornerRadius = 8
        return button
    }()
    
    private var vehicles: [Vehicle] = []
    private var isLoading: Bool = false {
        didSet {
            refreshButton.isEnabled = !isLoading
            updateLoadingState()
        }
    }
    
    private var isOfflineMode: Bool = false {
        didSet {
            updateOfflineIndicator()
        }
    }
    
    private var lastUpdateTimestamp: Date = Date()
    private let locationManager = LocationManager.shared()
    private let updateInterval: TimeInterval = 30 // 30-second update interval
    private var updateTimer: Timer?
    
    // MARK: - Initialization
    
    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupLocationTracking()
        setupCollectionView()
        setupRefreshControl()
        setupNotifications()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
        setupLocationTracking()
        setupCollectionView()
        setupRefreshControl()
        setupNotifications()
    }
    
    // MARK: - Setup Methods
    
    private func setupUI() {
        // Add and configure map view
        addSubview(mapView)
        NSLayoutConstraint.activate([
            mapView.topAnchor.constraint(equalTo: topAnchor),
            mapView.leadingAnchor.constraint(equalTo: leadingAnchor),
            mapView.trailingAnchor.constraint(equalTo: trailingAnchor),
            mapView.heightAnchor.constraint(equalTo: heightAnchor, multiplier: 0.6)
        ])
        
        // Add and configure vehicle status collection
        addSubview(vehicleStatusCollection)
        NSLayoutConstraint.activate([
            vehicleStatusCollection.topAnchor.constraint(equalTo: mapView.bottomAnchor, constant: 16),
            vehicleStatusCollection.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            vehicleStatusCollection.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            vehicleStatusCollection.heightAnchor.constraint(equalToConstant: 100)
        ])
        
        // Add and configure metrics stack view
        addSubview(metricsStackView)
        NSLayoutConstraint.activate([
            metricsStackView.topAnchor.constraint(equalTo: vehicleStatusCollection.bottomAnchor, constant: 16),
            metricsStackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            metricsStackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16)
        ])
        
        // Add and configure refresh button
        addSubview(refreshButton)
        NSLayoutConstraint.activate([
            refreshButton.topAnchor.constraint(equalTo: metricsStackView.bottomAnchor, constant: 16),
            refreshButton.centerXAnchor.constraint(equalTo: centerXAnchor),
            refreshButton.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16),
            refreshButton.widthAnchor.constraint(equalToConstant: 120)
        ])
        
        refreshButton.addTarget(self, action: #selector(refreshDashboard), for: .touchUpInside)
    }
    
    private func setupMapView() {
        // Configure map view delegate and settings
        mapView.delegate = self
        mapView.showsUserLocation = true
        
        // Setup offline map tile caching
        let cache = URLCache(memoryCapacity: 50 * 1024 * 1024,  // 50MB memory cache
                           diskCapacity: 100 * 1024 * 1024,      // 100MB disk cache
                           directory: nil)
        URLSession.shared.configuration.urlCache = cache
        
        // Set initial region to show all vehicles
        updateMapRegion()
    }
    
    private func setupVehicleStatusCollection() {
        // Register cell types
        vehicleStatusCollection.register(UICollectionViewCell.self, forCellWithReuseIdentifier: "VehicleStatusCell")
        vehicleStatusCollection.dataSource = self
        vehicleStatusCollection.delegate = self
        
        // Setup refresh control for pull to refresh
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(self, action: #selector(refreshDashboard), for: .valueChanged)
        vehicleStatusCollection.refreshControl = refreshControl
    }
    
    private func setupLocationTracking() {
        // Start location manager with 30-second update interval
        locationManager.delegate = self
        startLocationUpdates()
    }
    
    private func setupRefreshControl() {
        // Configure auto-refresh timer for 30-second intervals
        updateTimer = Timer.scheduledTimer(withTimeInterval: updateInterval, repeats: true) { [weak self] _ in
            self?.refreshDashboard()
        }
        updateTimer?.tolerance = 5 // Allow 5-second tolerance for battery optimization
    }
    
    private func setupNotifications() {
        // Observe application state changes for offline mode
        NotificationCenter.default.addObserver(self,
                                             selector: #selector(handleApplicationStateChange),
                                             name: UIApplication.didBecomeActiveNotification,
                                             object: nil)
        
        NotificationCenter.default.addObserver(self,
                                             selector: #selector(handleConnectivityChange),
                                             name: NSNotification.Name("ConnectivityStatusChanged"),
                                             object: nil)
    }
    
    // MARK: - Public Methods
    
    /// Updates vehicle locations on the map with offline support
    /// Requirement: Real-time GPS tracking with 30-second update intervals
    public func updateVehicleLocations(_ updatedVehicles: [Vehicle]) {
        vehicles = updatedVehicles
        
        // Update map annotations
        let currentAnnotations = mapView.annotations.filter { !($0 is MKUserLocation) }
        mapView.removeAnnotations(currentAnnotations)
        
        for vehicle in vehicles {
            if let location = vehicle.currentLocation {
                let annotation = MKPointAnnotation()
                annotation.coordinate = CLLocationCoordinate2D(
                    latitude: location.latitude,
                    longitude: location.longitude
                )
                annotation.title = vehicle.registrationNumber
                annotation.subtitle = vehicle.status.rawValue
                mapView.addAnnotation(annotation)
            }
        }
        
        // Update vehicle status collection
        vehicleStatusCollection.reloadData()
        
        // Update metrics
        updateMetricsDisplay()
        
        // Update timestamp
        lastUpdateTimestamp = Date()
        
        // Handle offline state
        isOfflineMode = locationManager.isOfflineMode
    }
    
    /// Refreshes all dashboard components with offline support
    /// Requirements addressed:
    /// - Interactive fleet management dashboard
    /// - Offline operation support
    @objc public func refreshDashboard() {
        guard !isLoading else { return }
        
        isLoading = true
        
        // Check offline mode
        isOfflineMode = locationManager.isOfflineMode
        
        // Update UI elements
        updateMapView()
        updateVehicleStatusCollection()
        updateMetricsDisplay()
        
        // Reset loading state
        isLoading = false
        refreshButton.isEnabled = true
        vehicleStatusCollection.refreshControl?.endRefreshing()
    }
    
    // MARK: - Private Methods
    
    private func startLocationUpdates() {
        // Start location tracking with 30-second intervals
        locationManager.startTracking(vehicleId: "dashboard")
    }
    
    private func updateMapView() {
        // Update vehicle annotations
        let currentAnnotations = mapView.annotations.filter { !($0 is MKUserLocation) }
        mapView.removeAnnotations(currentAnnotations)
        
        for vehicle in vehicles {
            if let location = vehicle.currentLocation {
                let annotation = MKPointAnnotation()
                annotation.coordinate = CLLocationCoordinate2D(
                    latitude: location.latitude,
                    longitude: location.longitude
                )
                annotation.title = vehicle.registrationNumber
                annotation.subtitle = vehicle.status.rawValue
                mapView.addAnnotation(annotation)
            }
        }
        
        updateMapRegion()
    }
    
    private func updateVehicleStatusCollection() {
        vehicleStatusCollection.reloadData()
    }
    
    private func updateMetricsDisplay() {
        // Clear existing metrics
        metricsStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        // Calculate and display metrics
        let totalVehicles = vehicles.count
        let activeVehicles = vehicles.filter { $0.status == .inUse }.count
        let offlineVehicles = vehicles.filter { $0.isOffline }.count
        
        addMetricView(title: "Total Vehicles", value: "\(totalVehicles)")
        addMetricView(title: "Active Vehicles", value: "\(activeVehicles)")
        addMetricView(title: "Offline Vehicles", value: "\(offlineVehicles)")
    }
    
    private func addMetricView(title: String, value: String) {
        let metricView = UIView()
        metricView.backgroundColor = .secondarySystemBackground
        metricView.layer.cornerRadius = 8
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 14, weight: .medium)
        titleLabel.textColor = .secondaryLabel
        
        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.font = .systemFont(ofSize: 24, weight: .bold)
        valueLabel.textColor = .label
        
        metricView.addSubview(titleLabel)
        metricView.addSubview(valueLabel)
        
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        valueLabel.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: metricView.topAnchor, constant: 8),
            titleLabel.leadingAnchor.constraint(equalTo: metricView.leadingAnchor, constant: 8),
            titleLabel.trailingAnchor.constraint(equalTo: metricView.trailingAnchor, constant: -8),
            
            valueLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            valueLabel.leadingAnchor.constraint(equalTo: metricView.leadingAnchor, constant: 8),
            valueLabel.trailingAnchor.constraint(equalTo: metricView.trailingAnchor, constant: -8),
            valueLabel.bottomAnchor.constraint(equalTo: metricView.bottomAnchor, constant: -8)
        ])
        
        metricsStackView.addArrangedSubview(metricView)
    }
    
    private func updateMapRegion() {
        guard !vehicles.isEmpty else { return }
        
        var coordinates: [CLLocationCoordinate2D] = []
        for vehicle in vehicles {
            if let location = vehicle.currentLocation {
                coordinates.append(CLLocationCoordinate2D(
                    latitude: location.latitude,
                    longitude: location.longitude
                ))
            }
        }
        
        if !coordinates.isEmpty {
            let region = MKCoordinateRegion(
                coordinates: coordinates,
                latitudinalMeters: 5000,
                longitudinalMeters: 5000
            )
            mapView.setRegion(region, animated: true)
        }
    }
    
    private func updateLoadingState() {
        refreshButton.isEnabled = !isLoading
        if isLoading {
            // Add loading indicator if needed
            let spinner = UIActivityIndicatorView(style: .medium)
            spinner.startAnimating()
            refreshButton.addSubview(spinner)
        } else {
            // Remove loading indicator
            refreshButton.subviews.forEach { if $0 is UIActivityIndicatorView { $0.removeFromSuperview() } }
        }
    }
    
    private func updateOfflineIndicator() {
        // Update UI to show offline mode status
        let offlineIndicator = UIView()
        offlineIndicator.backgroundColor = isOfflineMode ? .systemYellow : .systemGreen
        offlineIndicator.layer.cornerRadius = 4
        
        addSubview(offlineIndicator)
        offlineIndicator.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            offlineIndicator.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            offlineIndicator.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            offlineIndicator.widthAnchor.constraint(equalToConstant: 8),
            offlineIndicator.heightAnchor.constraint(equalToConstant: 8)
        ])
    }
    
    // MARK: - Notification Handlers
    
    @objc private func handleApplicationStateChange() {
        refreshDashboard()
    }
    
    @objc private func handleConnectivityChange(_ notification: Notification) {
        if let isOffline = notification.userInfo?["isOffline"] as? Bool {
            isOfflineMode = isOffline
            refreshDashboard()
        }
    }
}

// MARK: - MKMapViewDelegate

extension DashboardView: MKMapViewDelegate {
    public func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        guard !annotation.isKind(of: MKUserLocation.self) else { return nil }
        
        let identifier = "VehicleAnnotation"
        var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier)
        
        if annotationView == nil {
            annotationView = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
            annotationView?.canShowCallout = true
            
            // Add right callout accessory view
            let button = UIButton(type: .detailDisclosure)
            annotationView?.rightCalloutAccessoryView = button
        } else {
            annotationView?.annotation = annotation
        }
        
        // Customize annotation appearance based on vehicle status
        if let markerView = annotationView as? MKMarkerAnnotationView,
           let vehicle = vehicles.first(where: { $0.registrationNumber == annotation.title }) {
            switch vehicle.status {
            case .available:
                markerView.markerTintColor = .systemGreen
            case .inUse:
                markerView.markerTintColor = .systemBlue
            case .maintenance:
                markerView.markerTintColor = .systemOrange
            case .outOfService:
                markerView.markerTintColor = .systemRed
            }
            
            if vehicle.isOffline {
                markerView.glyphImage = UIImage(systemName: "wifi.slash")
            }
        }
        
        return annotationView
    }
}

// MARK: - UICollectionViewDataSource

extension DashboardView: UICollectionViewDataSource {
    public func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return vehicles.count
    }
    
    public func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "VehicleStatusCell", for: indexPath)
        
        let vehicle = vehicles[indexPath.item]
        
        // Configure cell appearance
        cell.backgroundColor = .secondarySystemBackground
        cell.layer.cornerRadius = 8
        
        // Add vehicle information labels
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 4
        stackView.alignment = .leading
        
        let registrationLabel = UILabel()
        registrationLabel.text = vehicle.registrationNumber
        registrationLabel.font = .systemFont(ofSize: 16, weight: .bold)
        
        let statusLabel = UILabel()
        statusLabel.text = vehicle.status.rawValue
        statusLabel.font = .systemFont(ofSize: 14)
        statusLabel.textColor = .secondaryLabel
        
        stackView.addArrangedSubview(registrationLabel)
        stackView.addArrangedSubview(statusLabel)
        
        // Add offline indicator if needed
        if vehicle.isOffline {
            let offlineLabel = UILabel()
            offlineLabel.text = "Offline"
            offlineLabel.font = .systemFont(ofSize: 12)
            offlineLabel.textColor = .systemYellow
            stackView.addArrangedSubview(offlineLabel)
        }
        
        cell.contentView.addSubview(stackView)
        stackView.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 8),
            stackView.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 8),
            stackView.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -8),
            stackView.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -8)
        ])
        
        return cell
    }
}

// MARK: - LocationUpdateDelegate

extension DashboardView: LocationUpdateDelegate {
    public func didUpdateLocation(_ location: Location) {
        // Update relevant vehicle location
        if let vehicleId = location.vehicleId,
           let index = vehicles.firstIndex(where: { $0.id == vehicleId }) {
            vehicles[index].updateLocation(location)
            updateVehicleLocations(vehicles)
        }
    }
    
    public func didFailWithError(_ error: Error) {
        // Handle location update errors
        print("Location update failed: \(error.localizedDescription)")
        isOfflineMode = locationManager.isOfflineMode
    }
}