# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate permissions for S3 bucket creation
# 2. Review and adjust the backup retention days default value based on specific environment needs
# 3. Verify that the bucket naming convention follows organization standards

# Requirement: File Storage Configuration (4.4.3 Data Storage)
variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket to be created for storing fleet tracking system files"
  
  validation {
    condition     = length(var.bucket_name) > 3 && length(var.bucket_name) < 63
    error_message = "Bucket name must be between 3 and 63 characters long"
  }
}

# Requirement: File Storage Configuration (4.4.3 Data Storage)
variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, prod) for the fleet tracking system"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Requirement: Backup Strategy Configuration (A.1.3 Backup Strategy Matrix)
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backup files as per system backup strategy matrix"
  default     = 90 # Default 90-day retention for system logs and configuration data
  
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 3650
    error_message = "Backup retention days must be between 1 and 3650"
  }
}

# Requirement: File Storage Configuration (4.4.3 Data Storage)
variable "enable_versioning" {
  type        = bool
  description = "Enable versioning for the S3 bucket to maintain file version history"
  default     = true
}

# Requirement: Security Configuration (8.2 Data Security)
variable "enable_encryption" {
  type        = bool
  description = "Enable AES-256 server-side encryption for the S3 bucket as per security requirements"
  default     = true
}

# Requirement: File Storage Configuration (4.4.3 Data Storage)
variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to the S3 bucket for resource management and cost allocation"
  default     = {}
}

# Requirement: Backup Strategy Configuration (A.1.3 Backup Strategy Matrix)
variable "lifecycle_rules_enabled" {
  type        = bool
  description = "Enable lifecycle rules for automated file transitions and deletions"
  default     = true
}

# Requirement: Backup Strategy Configuration (A.1.3 Backup Strategy Matrix)
variable "enable_glacier_transition" {
  type        = bool
  description = "Enable transition to Glacier storage class for long-term archival"
  default     = true
}