//
// String+Extensions.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify that the email regex pattern matches your organization's specific requirements
// 2. Update phone number validation rules if specific country codes need to be supported
// 3. Review and update XSS prevention patterns in sanitization if needed

import Foundation  // iOS 14.0+

// MARK: - String Extensions
/// Extension providing utility methods for string validation, sanitization, and encoding
/// Addresses requirements from sections 8.2 Data Security and 8.3 Security Protocols
extension String {
    
    // MARK: - Email Validation
    /// Validates if the string is a properly formatted email address using RFC 5322 compliant regex pattern
    /// Requirement: Data validation - Implements string validation for secure data handling
    public var isValidEmail: Bool {
        let emailRegex = "^(?:[\\p{L}0-9!#$%\\&'*+/=?\\^_`{|}~-]+(?:\\.[\\p{L}0-9!#$%\\&'*+/=?\\^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[\\p{L}0-9](?:[a-z0-9-]*[\\p{L}0-9])?\\.)+[\\p{L}0-9](?:[\\p{L}0-9-]*[\\p{L}0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[\\p{L}0-9-]*[\\p{L}0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$"
        
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: self)
    }
    
    // MARK: - Phone Number Validation
    /// Validates if the string is a properly formatted phone number supporting international formats
    /// Requirement: Data validation - Implements string validation for secure data handling
    public var isValidPhoneNumber: Bool {
        // Remove any non-numeric characters
        let digitsOnly = self.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        // Check length constraints (10-15 digits for international numbers)
        guard digitsOnly.count >= 10 && digitsOnly.count <= 15 else {
            return false
        }
        
        // Validate country code if present (must start with + and have 1-3 digits)
        if self.hasPrefix("+") {
            let countryCodeEnd = self.index(self.startIndex, offsetBy: 4)
            let countryCode = self.prefix(upTo: countryCodeEnd)
            if !countryCode.dropFirst().allSatisfy({ $0.isNumber }) {
                return false
            }
        }
        
        return true
    }
    
    // MARK: - Vehicle ID Validation
    /// Validates if the string matches vehicle ID format requirements for fleet management
    /// Requirement: Input validation - Provides methods for validating input strings
    public var isValidVehicleId: Bool {
        // Vehicle ID format: 2 letters followed by 6 numbers (e.g., AB123456)
        guard self.count == 8 else { return false }
        
        let letters = self.prefix(2)
        let numbers = self.suffix(6)
        
        return letters.allSatisfy { $0.isLetter } &&
               numbers.allSatisfy { $0.isNumber }
    }
    
    // MARK: - String Sanitization
    /// Returns a sanitized version of the string removing potentially harmful characters and XSS vectors
    /// Requirement: Input validation - Sanitizing input strings to prevent injection attacks
    public var sanitized: String {
        var sanitized = self
        
        // Remove HTML and script tags
        let scriptPattern = "<script[^>]*>[\\s\\S]*?</script>"
        let htmlPattern = "<[^>]+>"
        sanitized = sanitized.replacingOccurrences(of: scriptPattern, with: "", options: .regularExpression)
        sanitized = sanitized.replacingOccurrences(of: htmlPattern, with: "", options: .regularExpression)
        
        // Remove control characters
        sanitized = sanitized.components(separatedBy: .controlCharacters).joined()
        
        // Escape special characters
        let specialChars = ["&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"]
        for (char, escaped) in specialChars {
            sanitized = sanitized.replacingOccurrences(of: char, with: escaped)
        }
        
        // Trim whitespace
        sanitized = sanitized.trimmingCharacters(in: .whitespacesAndNewlines)
        
        return sanitized
    }
    
    // MARK: - Base64 Encoding/Decoding
    /// Converts string to base64 encoded string for secure data transmission
    /// Requirement: Security and encryption protocols - Implements base64 encoding for secure data transmission
    public var toBase64: String {
        guard let data = self.data(using: .utf8) else { return "" }
        return data.base64EncodedString()
    }
    
    /// Converts base64 encoded string back to regular string with validation
    /// Requirement: Security and encryption protocols - Implements base64 decoding with validation
    public var fromBase64: String? {
        // Validate base64 string format
        let base64Regex = "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$"
        let base64Predicate = NSPredicate(format: "SELF MATCHES %@", base64Regex)
        
        guard base64Predicate.evaluate(with: self),
              let data = Data(base64Encoded: self),
              let decodedString = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return decodedString
    }
}