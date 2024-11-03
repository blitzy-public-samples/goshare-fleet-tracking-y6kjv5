//
// ProofOfDeliveryViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure camera usage description in Info.plist:
//    - NSCameraUsageDescription
//    - NSPhotoLibraryUsageDescription
// 2. Configure location usage permissions in Info.plist
// 3. Enable background location updates in project capabilities
// 4. Test offline functionality with airplane mode enabled
// 5. Verify signature capture works on all supported device sizes

import UIKit     // iOS 14.0+
import Combine   // iOS 14.0+

/// View controller managing the proof of delivery capture process with offline support
/// Requirements addressed:
/// - Digital proof of delivery capabilities (1.2 Scope/Core Functionality)
/// - Offline operation support (1.2 Scope/Technical Implementation)
@objc
public class ProofOfDeliveryViewController: UIViewController {
    
    // MARK: - Properties
    
    private let proofView: ProofOfDeliveryView = {
        let view = ProofOfDeliveryView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let deliveryService: DeliveryService
    private let deliveryId: String
    private let recipientName: String
    private var cancellables = Set<AnyCancellable>()
    private var isSubmitting = false
    
    private let loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .large)
        indicator.hidesWhenStopped = true
        indicator.translatesAutoresizingMaskIntoConstraints = false
        return indicator
    }()
    
    // MARK: - Initialization
    
    /// Initializes the view controller with required delivery information
    /// - Parameters:
    ///   - deliveryId: Unique identifier for the delivery
    ///   - recipientName: Name of the person receiving the delivery
    ///   - deliveryService: Service for managing delivery operations
    public init(deliveryId: String, recipientName: String, deliveryService: DeliveryService) {
        self.deliveryId = deliveryId
        self.recipientName = recipientName
        self.deliveryService = deliveryService
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle Methods
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        configureNavigationItems()
        setupProofCapture()
        setupDelegates()
    }
    
    // MARK: - Setup Methods
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "Proof of Delivery"
        
        // Add proof view
        view.addSubview(proofView)
        NSLayoutConstraint.activate([
            proofView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            proofView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            proofView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            proofView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        
        // Add loading indicator
        view.addSubview(loadingIndicator)
        NSLayoutConstraint.activate([
            loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
    
    private func configureNavigationItems() {
        // Add cancel button
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .cancel,
            target: self,
            action: #selector(cancelButtonTapped)
        )
        
        // Add submit button if offline mode
        if proofView.isOfflineMode {
            navigationItem.rightBarButtonItem = UIBarButtonItem(
                title: "Submit",
                style: .done,
                target: self,
                action: #selector(submitProofOfDelivery)
            )
        }
    }
    
    private func setupProofCapture() {
        // Initialize proof capture with delivery information
        proofView.setupProofCapture(
            deliveryId: deliveryId,
            recipientName: recipientName
        )
    }
    
    private func setupDelegates() {
        proofView.delegate = self
    }
    
    // MARK: - Action Methods
    
    @objc private func cancelButtonTapped() {
        // Show confirmation alert before dismissing
        let alert = UIAlertController(
            title: "Cancel Proof Capture",
            message: "Are you sure you want to cancel? Any captured proof will be lost.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "No", style: .cancel))
        alert.addAction(UIAlertAction(title: "Yes", style: .destructive) { [weak self] _ in
            self?.dismiss(animated: true)
        })
        
        present(alert, animated: true)
    }
    
    @objc private func submitProofOfDelivery() {
        guard !isSubmitting else { return }
        isSubmitting = true
        
        // Show loading indicator
        loadingIndicator.startAnimating()
        view.isUserInteractionEnabled = false
        
        // Get current proof data
        guard let proof = proofView.currentProof else {
            handleError(NSError(
                domain: "com.fleettracker.proof",
                code: 400,
                userInfo: [NSLocalizedDescriptionKey: "No proof data available"]
            ))
            return
        }
        
        // Convert proof to dictionary format
        let proofData = proof.toDictionary()
        
        // Submit through delivery service
        let result = deliveryService.submitProofOfDelivery(
            deliveryId: proof.deliveryId,
            signature: proof.signature ?? Data(),
            photos: proof.photos,
            recipientName: proof.recipientName,
            notes: nil
        )
        
        switch result {
        case .success:
            // Update delivery status
            let statusResult = deliveryService.updateDeliveryStatus(
                deliveryId: deliveryId,
                status: .delivered
            )
            
            switch statusResult {
            case .success:
                DispatchQueue.main.async { [weak self] in
                    self?.loadingIndicator.stopAnimating()
                    self?.isSubmitting = false
                    self?.view.isUserInteractionEnabled = true
                    self?.dismiss(animated: true)
                }
                
            case .failure(let error):
                handleError(error)
            }
            
        case .failure(let error):
            handleError(error)
        }
    }
    
    private func handleError(_ error: Error) {
        isSubmitting = false
        loadingIndicator.stopAnimating()
        view.isUserInteractionEnabled = true
        
        // Show error alert with retry option
        let alert = UIAlertController(
            title: "Submission Failed",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        
        // Add retry action if in offline mode
        if proofView.isOfflineMode {
            alert.addAction(UIAlertAction(title: "Retry", style: .default) { [weak self] _ in
                self?.submitProofOfDelivery()
            })
        }
        
        alert.addAction(UIAlertAction(title: "OK", style: .cancel))
        
        present(alert, animated: true)
    }
}

// MARK: - ProofOfDeliveryViewDelegate

extension ProofOfDeliveryViewController: ProofOfDeliveryViewDelegate {
    
    public func didCompleteProofCapture(_ proof: DeliveryProof) {
        submitProofOfDelivery()
    }
    
    public func didFailProofCapture(_ error: Error) {
        handleError(error)
    }
}