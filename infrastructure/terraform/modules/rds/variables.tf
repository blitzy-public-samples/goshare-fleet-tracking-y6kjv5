# Human Tasks:
# 1. Review and adjust the default values for allocated_storage and max_allocated_storage based on your specific data growth projections
# 2. Confirm the backup_window and maintenance_window timings align with your organization's maintenance schedule
# 3. Verify that the monitoring_interval meets your operational monitoring requirements
# 4. Ensure the allowed_cidr_blocks list is properly configured for your network security requirements

# Requirement: Primary Database Configuration - PostgreSQL 14 database configuration variables
variable "identifier_prefix" {
  description = "Prefix for RDS resource identifiers"
  type        = string
  default     = "fleet-tracking"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "engine_version" {
  description = "PostgreSQL engine version as specified in technical requirements"
  type        = string
  default     = "14.7"
}

variable "parameter_group_family" {
  description = "PostgreSQL parameter group family matching engine version"
  type        = string
  default     = "postgres14"
}

variable "db_instance_class" {
  description = "RDS instance class based on environment and performance requirements"
  type        = string
  default     = "db.t3.medium"
}

# Requirement: Primary Database Configuration - Storage configuration for fleet tracking data
variable "allocated_storage" {
  description = "Initial allocated storage in GB for fleet tracking data"
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "Maximum storage limit for autoscaling in GB to handle fleet growth"
  type        = number
  default     = 1000
}

# Requirement: High Availability Setup - Multi-AZ deployment configuration
variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment for 99.9% uptime requirement"
  type        = bool
  default     = true
}

# Requirement: Primary Database Configuration - Backup and maintenance settings
variable "backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Preferred backup window during off-peak hours"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window following backup window"
  type        = string
  default     = "Mon:04:00-Mon:05:00"
}

# Requirement: Performance Monitoring - Database monitoring configuration
variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds for performance tracking"
  type        = number
  default     = 60
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights for database performance monitoring"
  type        = bool
  default     = true
}

# Requirement: Database Security - Security configuration variables
variable "deletion_protection" {
  description = "Enable deletion protection for data safety"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to the database"
  type        = list(string)
  default     = []
}

# Requirement: Database Security - Network configuration from VPC module
variable "private_subnet_ids" {
  description = "List of private subnet IDs from VPC module for secure database deployment"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID from VPC module where RDS will be deployed"
  type        = string
}