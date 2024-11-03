# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate permissions for DocumentDB
# 2. Configure AWS KMS key for storage encryption if not using default AWS managed key
# 3. Review and adjust default values based on environment-specific requirements
# 4. Ensure VPC and subnet configurations are properly set up for DocumentDB deployment

# AWS Provider version ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Requirement: Location Data Storage (4.4.3 Data Storage)
# MongoDB-compatible database configuration for storing location and event data
variable "cluster_identifier" {
  description = "Identifier for the DocumentDB cluster"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_identifier))
    error_message = "Cluster identifier must start with a letter and only contain alphanumeric characters and hyphens"
  }
}

# Requirement: High Availability (4.5 Scalability Architecture)
variable "instance_class" {
  description = "Instance class for DocumentDB cluster nodes"
  type        = string
  default     = "db.r5.large"
}

# Requirement: High Availability (4.5 Scalability Architecture)
# Multi-AZ deployment configuration for DocumentDB cluster
variable "cluster_size" {
  description = "Number of instances in the DocumentDB cluster for high availability"
  type        = number
  default     = 3
  validation {
    condition     = var.cluster_size >= 3
    error_message = "Cluster size must be at least 3 for high availability"
  }
}

variable "engine_version" {
  description = "DocumentDB engine version for MongoDB compatibility"
  type        = string
  default     = "4.0.0"
}

variable "master_username" {
  description = "Username for the master DB user"
  type        = string
  sensitive   = true
}

variable "master_password" {
  description = "Password for the master DB user"
  type        = string
  sensitive   = true
}

# Requirement: High Availability (4.5 Scalability Architecture)
variable "backup_retention_period" {
  description = "Number of days to retain backups for disaster recovery"
  type        = number
  default     = 7
  validation {
    condition     = var.backup_retention_period >= 7
    error_message = "Backup retention period must be at least 7 days"
  }
}

variable "preferred_backup_window" {
  description = "Daily time range during which automated backups are created"
  type        = string
  default     = "03:00-04:00"
}

# Requirement: Data Security (8.2 Data Security/8.2.1 Encryption Standards)
variable "storage_encrypted" {
  description = "Enable storage encryption using KMS for data security"
  type        = bool
  default     = true
  validation {
    condition     = var.storage_encrypted == true
    error_message = "Storage encryption must be enabled for security compliance"
  }
}

variable "port" {
  description = "Port on which DocumentDB accepts connections"
  type        = number
  default     = 27017
}

# Requirement: High Availability (4.5 Scalability Architecture)
variable "vpc_id" {
  description = "VPC ID where DocumentDB cluster will be created for network isolation"
  type        = string
}

# Requirement: High Availability (4.5 Scalability Architecture)
variable "subnet_ids" {
  description = "List of subnet IDs across multiple AZs for high availability"
  type        = list(string)
}

# Requirement: Data Security (8.2 Data Security/8.2.1 Encryption Standards)
variable "vpc_security_group_ids" {
  description = "List of VPC security group IDs for network access control"
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the DocumentDB cluster"
  type        = list(string)
  default     = []
}

variable "apply_immediately" {
  description = "Apply changes immediately or during maintenance window"
  type        = bool
  default     = false
}

variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades for security patches"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when destroying the cluster"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to all resources for resource management"
  type        = map(string)
  default     = {}
}