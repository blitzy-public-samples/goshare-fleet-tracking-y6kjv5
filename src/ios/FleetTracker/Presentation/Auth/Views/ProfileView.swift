//
// ProfileView.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Configure OAuth 2.0 client credentials in environment configuration
// 2. Test accessibility features with VoiceOver enabled
// 3. Verify form validation rules match backend requirements
// 4. Test profile updates across different network conditions

import SwiftUI     // iOS 14.0+
import Combine     // iOS 14.0+

/// SwiftUI view for displaying and managing user profile information with OAuth 2.0 authentication
/// Addresses requirements:
/// - Mobile Applications (1.1 System Overview/Mobile Applications)
/// - Authentication and Authorization (8.1.1 Authentication Methods)
/// - Security Protocols (8.3.1 Network Security)
struct ProfileView: View {
    
    // MARK: - Properties
    
    @StateObject private var authService = AuthService.shared
    @State private var isEditing: Bool = false
    @State private var showingLogoutAlert: Bool = false
    @State private var showingErrorAlert: Bool = false
    @State private var errorMessage: String = ""
    
    // Edited profile fields
    @State private var editedFirstName: String = ""
    @State private var editedLastName: String = ""
    @State private var editedPhoneNumber: String = ""
    
    // Animation properties
    private let animationDuration: Double = 0.3
    private let cornerRadius: CGFloat = 12
    private let shadowRadius: CGFloat = 4
    private let shadowOpacity: CGFloat = 0.2
    
    // MARK: - Body
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Profile Header
                profileHeader
                    .padding(.top, 20)
                
                // Profile Information
                profileInformation
                    .padding(.horizontal)
                
                // Action Buttons
                actionButtons
                    .padding(.horizontal)
                    .padding(.top, 20)
            }
            .padding(.bottom, 30)
        }
        .background(Color(.systemBackground))
        .onAppear {
            loadUserData()
            checkAuthState()
        }
        .alert(isPresented: $showingLogoutAlert) {
            Alert(
                title: Text("Confirm Logout"),
                message: Text("Are you sure you want to log out?"),
                primaryButton: .destructive(Text("Logout")) {
                    handleLogout()
                },
                secondaryButton: .cancel()
            )
        }
        .alert("Error", isPresented: $showingErrorAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }
    
    // MARK: - Profile Header View
    
    private var profileHeader: some View {
        VStack(spacing: 16) {
            // Profile Image
            Image(systemName: "person.circle.fill")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 100, height: 100)
                .foregroundColor(.blue)
                .accessibilityLabel("Profile picture")
            
            // User Role Badge
            Text(authService.currentUser.value?.role.capitalized ?? "")
                .font(.subheadline)
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.blue)
                .clipShape(Capsule())
                .accessibilityLabel("User role")
        }
    }
    
    // MARK: - Profile Information View
    
    private var profileInformation: some View {
        VStack(spacing: 20) {
            // First Name
            profileField(
                title: "First Name",
                value: authService.currentUser.value?.firstName ?? "",
                editedValue: $editedFirstName,
                isEditing: isEditing
            )
            
            // Last Name
            profileField(
                title: "Last Name",
                value: authService.currentUser.value?.lastName ?? "",
                editedValue: $editedLastName,
                isEditing: isEditing
            )
            
            // Email
            profileField(
                title: "Email",
                value: authService.currentUser.value?.email ?? "",
                isEditable: false
            )
            
            // Phone Number
            profileField(
                title: "Phone Number",
                value: authService.currentUser.value?.phoneNumber ?? "",
                editedValue: $editedPhoneNumber,
                isEditing: isEditing,
                keyboardType: .phonePad
            )
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(Color(.systemBackground))
                .shadow(radius: shadowRadius, x: 0, y: 2)
        )
    }
    
    // MARK: - Action Buttons View
    
    private var actionButtons: some View {
        VStack(spacing: 16) {
            // Edit/Save Button
            CustomButton(
                title: isEditing ? "Save Changes" : "Edit Profile",
                action: {
                    if isEditing {
                        saveChanges()
                    } else {
                        isEditing = true
                    }
                },
                buttonColor: .blue,
                cornerRadius: cornerRadius,
                shadowRadius: shadowRadius,
                shadowOpacity: shadowOpacity
            )
            
            // Cancel Button (when editing)
            if isEditing {
                CustomButton(
                    title: "Cancel",
                    action: {
                        isEditing = false
                        loadUserData()
                    },
                    buttonColor: .gray,
                    cornerRadius: cornerRadius,
                    shadowRadius: shadowRadius,
                    shadowOpacity: shadowOpacity
                )
            }
            
            // Logout Button
            CustomButton(
                title: "Logout",
                action: { showingLogoutAlert = true },
                buttonColor: .red,
                cornerRadius: cornerRadius,
                shadowRadius: shadowRadius,
                shadowOpacity: shadowOpacity
            )
        }
    }
    
    // MARK: - Profile Field View
    
    private func profileField(
        title: String,
        value: String,
        editedValue: Binding<String>? = nil,
        isEditing: Bool = false,
        isEditable: Bool = true,
        keyboardType: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.gray)
            
            if isEditing && isEditable {
                TextField(title, text: editedValue ?? .constant(""))
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(keyboardType)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
            } else {
                Text(value)
                    .font(.body)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title): \(value)")
    }
    
    // MARK: - Helper Methods
    
    /// Loads current authenticated user data into editable fields
    private func loadUserData() {
        guard let user = authService.currentUser.value else { return }
        
        editedFirstName = user.firstName
        editedLastName = user.lastName
        editedPhoneNumber = user.phoneNumber ?? ""
    }
    
    /// Validates and saves edited profile information
    private func saveChanges() {
        // Validate required fields
        guard !editedFirstName.isEmpty,
              !editedLastName.isEmpty else {
            errorMessage = "First name and last name are required"
            showingErrorAlert = true
            return
        }
        
        // Validate phone number format if provided
        if !editedPhoneNumber.isEmpty {
            let phoneRegex = "^\\+?[1-9]\\d{1,14}$"
            let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
            guard phonePredicate.evaluate(with: editedPhoneNumber) else {
                errorMessage = "Invalid phone number format"
                showingErrorAlert = true
                return
            }
        }
        
        // TODO: Implement profile update API call
        // For now, just exit editing mode
        isEditing = false
    }
    
    /// Handles secure user logout with OAuth token invalidation
    private func handleLogout() {
        _ = authService.logout()
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .failure(let error):
                        errorMessage = error.localizedDescription
                        showingErrorAlert = true
                    case .finished:
                        break
                    }
                },
                receiveValue: { _ in }
            )
    }
    
    /// Checks current authentication state
    private func checkAuthState() {
        _ = authService.checkAuthState()
            .sink { isAuthenticated in
                if !isAuthenticated {
                    // Handle unauthenticated state
                    // Navigation would be handled by parent view
                }
            }
    }
}

// MARK: - Custom Button View

private struct CustomButton: View {
    let title: String
    let action: () -> Void
    let buttonColor: Color
    let cornerRadius: CGFloat
    let shadowRadius: CGFloat
    let shadowOpacity: CGFloat
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(buttonColor)
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
                .shadow(radius: shadowRadius, x: 0, y: 2)
        }
        .accessibilityLabel(title)
        .accessibilityHint("Double tap to \(title.lowercased())")
    }
}

// MARK: - Preview Provider

struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView()
    }
}