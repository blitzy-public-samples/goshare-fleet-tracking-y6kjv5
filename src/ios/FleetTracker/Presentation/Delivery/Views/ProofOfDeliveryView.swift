//
// ProofOfDeliveryView.swift
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

import UIKit          // iOS 14.0+
import AVFoundation   // iOS 14.0+

/// Protocol for handling proof of delivery capture events including offline scenarios
@objc public protocol ProofOfDeliveryViewDelegate: AnyObject {
    /// Called when proof capture is completed successfully
    func didCompleteProofCapture(_ proof: DeliveryProof)
    
    /// Called when proof capture fails
    func didFailProofCapture(_ error: Error)
}

/// A view that manages the capture and display of delivery proof elements
/// Requirement: Digital proof of delivery capabilities for mobile applications
@IBDesignable
public class ProofOfDeliveryView: UIView {
    
    // MARK: - Public Properties
    
    /// Current proof being captured
    public private(set) var currentProof: DeliveryProof?
    
    /// Delegate to handle proof capture events
    public weak var delegate: ProofOfDeliveryViewDelegate?
    
    /// Indicates if the view is operating in offline mode
    public private(set) var isOfflineMode: Bool = false
    
    // MARK: - Private Properties
    
    private let containerStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.distribution = .fill
        stack.alignment = .fill
        return stack
    }()
    
    private let signatureView: UIView = {
        let view = UIView()
        view.backgroundColor = .systemBackground
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.systemGray4.cgColor
        view.layer.cornerRadius = 8
        return view
    }()
    
    private let photoPreviewView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.backgroundColor = .systemGray6
        imageView.layer.cornerRadius = 8
        imageView.clipsToBounds = true
        return imageView
    }()
    
    private let barcodeResultLabel: UILabel = {
        let label = UILabel()
        label.textAlignment = .center
        label.textColor = .secondaryLabel
        label.font = .systemFont(ofSize: 14)
        label.numberOfLines = 0
        return label
    }()
    
    private let captureSignatureButton = CustomButton()
    private let capturePhotoButton = CustomButton()
    private let scanBarcodeButton = CustomButton()
    private let submitButton = CustomButton()
    
    private var captureSession: AVCaptureSession?
    private var isCapturingSignature: Bool = false
    
    // MARK: - Initialization
    
    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    // MARK: - Setup Methods
    
    private func setupUI() {
        // Add container stack view
        addSubview(containerStack)
        containerStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            containerStack.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            containerStack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            containerStack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            containerStack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16)
        ])
        
        // Configure signature view
        containerStack.addArrangedSubview(signatureView)
        signatureView.heightAnchor.constraint(equalTo: heightAnchor, multiplier: 0.3).isActive = true
        
        // Configure photo preview
        containerStack.addArrangedSubview(photoPreviewView)
        photoPreviewView.heightAnchor.constraint(equalTo: heightAnchor, multiplier: 0.25).isActive = true
        
        // Configure barcode label
        containerStack.addArrangedSubview(barcodeResultLabel)
        
        // Configure capture buttons
        setupCaptureButtons()
        
        // Check offline mode status
        isOfflineMode = LocationManager.shared().isOfflineMode
    }
    
    private func setupCaptureButtons() {
        // Configure signature button
        captureSignatureButton.setTitle("Capture Signature", for: .normal)
        captureSignatureButton.buttonColor = .systemBlue
        captureSignatureButton.addTarget(self, action: #selector(captureSignature), for: .touchUpInside)
        containerStack.addArrangedSubview(captureSignatureButton)
        
        // Configure photo button
        capturePhotoButton.setTitle("Take Photo", for: .normal)
        capturePhotoButton.buttonColor = .systemGreen
        capturePhotoButton.addTarget(self, action: #selector(capturePhoto), for: .touchUpInside)
        containerStack.addArrangedSubview(capturePhotoButton)
        
        // Configure barcode button
        scanBarcodeButton.setTitle("Scan Barcode", for: .normal)
        scanBarcodeButton.buttonColor = .systemIndigo
        scanBarcodeButton.addTarget(self, action: #selector(scanBarcode), for: .touchUpInside)
        containerStack.addArrangedSubview(scanBarcodeButton)
        
        // Configure submit button
        submitButton.setTitle("Submit Proof", for: .normal)
        submitButton.buttonColor = .systemOrange
        submitButton.addTarget(self, action: #selector(submitProof), for: .touchUpInside)
        submitButton.isEnabled = false
        containerStack.addArrangedSubview(submitButton)
    }
    
    // MARK: - Public Methods
    
    /// Configures the view for a new proof of delivery capture
    /// - Parameters:
    ///   - deliveryId: Associated delivery identifier
    ///   - recipientName: Name of the person receiving the delivery
    public func setupProofCapture(deliveryId: String, recipientName: String) {
        // Get current location for verification
        guard let location = LocationManager.shared().locationManager?.location else {
            delegate?.didFailProofCapture(NSError(
                domain: "com.fleettracker.proof",
                code: 404,
                userInfo: [NSLocalizedDescriptionKey: "Location not available"]
            ))
            return
        }
        
        // Create new proof instance
        currentProof = DeliveryProof(
            deliveryId: deliveryId,
            type: .signature,
            recipientName: recipientName,
            verificationLocation: Location(location: location, vehicleId: "")
        )
        
        // Reset UI elements
        signatureView.layer.sublayers?.removeAll()
        photoPreviewView.image = nil
        barcodeResultLabel.text = nil
        
        // Enable capture buttons
        captureSignatureButton.isEnabled = true
        capturePhotoButton.isEnabled = true
        scanBarcodeButton.isEnabled = true
        submitButton.isEnabled = false
        
        // Update offline mode status
        isOfflineMode = LocationManager.shared().isOfflineMode
        updateOfflineModeUI()
    }
    
    // MARK: - Capture Methods
    
    @objc private func captureSignature() {
        isCapturingSignature = true
        
        // Configure signature view for capture
        let drawingLayer = CAShapeLayer()
        drawingLayer.strokeColor = UIColor.black.cgColor
        drawingLayer.lineWidth = 2
        drawingLayer.fillColor = nil
        signatureView.layer.addSublayer(drawingLayer)
        
        // Add pan gesture recognizer
        let panGesture = UIPanGestureRecognizer(target: self, action: #selector(handleSignaturePan(_:)))
        signatureView.addGestureRecognizer(panGesture)
        
        captureSignatureButton.setTitle("Done Signing", for: .normal)
        captureSignatureButton.buttonColor = .systemGray
    }
    
    @objc private func capturePhoto() {
        // Check camera authorization
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            guard granted else {
                DispatchQueue.main.async {
                    self?.delegate?.didFailProofCapture(NSError(
                        domain: "com.fleettracker.proof",
                        code: 403,
                        userInfo: [NSLocalizedDescriptionKey: "Camera access denied"]
                    ))
                }
                return
            }
            
            DispatchQueue.main.async {
                self?.setupCameraCapture()
            }
        }
    }
    
    @objc private func scanBarcode() {
        // Configure barcode scanning session
        guard let captureDevice = AVCaptureDevice.default(for: .video) else {
            delegate?.didFailProofCapture(NSError(
                domain: "com.fleettracker.proof",
                code: 404,
                userInfo: [NSLocalizedDescriptionKey: "Camera not available"]
            ))
            return
        }
        
        do {
            let input = try AVCaptureDeviceInput(device: captureDevice)
            captureSession = AVCaptureSession()
            captureSession?.addInput(input)
            
            let metadataOutput = AVCaptureMetadataOutput()
            captureSession?.addOutput(metadataOutput)
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr, .ean13, .ean8, .code128]
            
            // Setup preview layer
            let previewLayer = AVCaptureVideoPreviewLayer(session: captureSession!)
            previewLayer.frame = photoPreviewView.bounds
            previewLayer.videoGravity = .resizeAspectFill
            photoPreviewView.layer.addSublayer(previewLayer)
            
            captureSession?.startRunning()
        } catch {
            delegate?.didFailProofCapture(error)
        }
    }
    
    @objc private func submitProof() {
        guard let proof = currentProof else { return }
        
        // Validate required elements
        guard proof.signature != nil || !proof.photos.isEmpty || proof.barcode != nil else {
            delegate?.didFailProofCapture(NSError(
                domain: "com.fleettracker.proof",
                code: 400,
                userInfo: [NSLocalizedDescriptionKey: "No proof elements captured"]
            ))
            return
        }
        
        // Update offline status before submission
        isOfflineMode = LocationManager.shared().isOfflineMode
        
        // Notify delegate of completion
        delegate?.didCompleteProofCapture(proof)
        
        // Reset view state
        resetCaptureState()
    }
    
    // MARK: - Helper Methods
    
    @objc private func handleSignaturePan(_ gesture: UIPanGestureRecognizer) {
        guard isCapturingSignature else { return }
        
        let location = gesture.location(in: signatureView)
        
        switch gesture.state {
        case .began:
            let path = UIBezierPath()
            path.move(to: location)
            (signatureView.layer.sublayers?.last as? CAShapeLayer)?.path = path.cgPath
            
        case .changed:
            guard let shapeLayer = signatureView.layer.sublayers?.last as? CAShapeLayer,
                  let path = shapeLayer.path else { return }
            
            let bezierPath = UIBezierPath(cgPath: path)
            bezierPath.addLine(to: location)
            shapeLayer.path = bezierPath.cgPath
            
        case .ended:
            // Convert signature to image data
            UIGraphicsBeginImageContextWithOptions(signatureView.bounds.size, false, 0)
            signatureView.drawHierarchy(in: signatureView.bounds, afterScreenUpdates: true)
            let signatureImage = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
            
            if let imageData = signatureImage?.pngData() {
                currentProof?.addSignature(imageData)
                submitButton.isEnabled = true
            }
            
            isCapturingSignature = false
            captureSignatureButton.setTitle("Capture Signature", for: .normal)
            captureSignatureButton.buttonColor = .systemBlue
            
        default:
            break
        }
    }
    
    private func setupCameraCapture() {
        guard let captureDevice = AVCaptureDevice.default(for: .video) else { return }
        
        do {
            let input = try AVCaptureDeviceInput(device: captureDevice)
            captureSession = AVCaptureSession()
            captureSession?.addInput(input)
            
            let output = AVCapturePhotoOutput()
            captureSession?.addOutput(output)
            
            // Setup preview layer
            let previewLayer = AVCaptureVideoPreviewLayer(session: captureSession!)
            previewLayer.frame = photoPreviewView.bounds
            previewLayer.videoGravity = .resizeAspectFill
            photoPreviewView.layer.addSublayer(previewLayer)
            
            captureSession?.startRunning()
        } catch {
            delegate?.didFailProofCapture(error)
        }
    }
    
    private func resetCaptureState() {
        captureSession?.stopRunning()
        captureSession = nil
        
        signatureView.layer.sublayers?.removeAll()
        photoPreviewView.image = nil
        barcodeResultLabel.text = nil
        
        isCapturingSignature = false
        currentProof = nil
        
        captureSignatureButton.setTitle("Capture Signature", for: .normal)
        captureSignatureButton.buttonColor = .systemBlue
        submitButton.isEnabled = false
    }
    
    private func updateOfflineModeUI() {
        let offlineIndicator = isOfflineMode ? " (Offline)" : ""
        submitButton.setTitle("Submit Proof\(offlineIndicator)", for: .normal)
        submitButton.buttonColor = isOfflineMode ? .systemGray : .systemOrange
    }
}

// MARK: - AVCaptureMetadataOutputObjectsDelegate

extension ProofOfDeliveryView: AVCaptureMetadataOutputObjectsDelegate {
    public func metadataOutput(_ output: AVCaptureMetadataOutput,
                              didOutput metadataObjects: [AVMetadataObject],
                              from connection: AVCaptureConnection) {
        // Handle barcode detection
        if let metadataObject = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
           let barcodeValue = metadataObject.stringValue {
            
            captureSession?.stopRunning()
            captureSession = nil
            
            currentProof?.addBarcode(barcodeValue)
            barcodeResultLabel.text = "Barcode: \(barcodeValue)"
            submitButton.isEnabled = true
        }
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension ProofOfDeliveryView: AVCapturePhotoCaptureDelegate {
    public func photoOutput(_ output: AVCapturePhotoOutput,
                          didFinishProcessingPhoto photo: AVCapturePhoto,
                          error: Error?) {
        guard let imageData = photo.fileDataRepresentation() else { return }
        
        currentProof?.addPhoto(imageData)
        
        if let image = UIImage(data: imageData) {
            photoPreviewView.image = image
            submitButton.isEnabled = true
        }
        
        captureSession?.stopRunning()
        captureSession = nil
    }
}