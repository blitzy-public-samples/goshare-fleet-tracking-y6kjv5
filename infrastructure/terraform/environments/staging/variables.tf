# Human Tasks:
# 1. Verify AWS region and availability zones match staging environment requirements
# 2. Confirm VPC CIDR range with network team for staging environment
# 3. Review and adjust resource sizing based on staging workload patterns
# 4. Validate backup retention periods meet compliance requirements
# 5. Ensure monitoring configuration aligns with observability requirements

# Requirement: Infrastructure Configuration - Environment identification
variable "environment" {
  description = "Deployment environment identifier"
  type        = string
  default     = "staging"

  validation {
    condition     = var.environment == "staging"
    error_message = "This is a staging-specific configuration file"
  }
}

# Requirement: Infrastructure Configuration - AWS region
variable "aws_region" {
  description = "AWS region for staging environment"
  type        = string
  default     = "us-west-2"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be in the format: us-west-2, eu-central-1, etc."
  }
}

# Requirement: Infrastructure Configuration - Network configuration
variable "vpc_cidr" {
  description = "CIDR block for staging VPC"
  type        = string
  default     = "10.1.0.0/16"
}

# Requirement: High Availability - Multi-AZ deployment
variable "availability_zones" {
  description = "List of availability zones for staging multi-AZ deployment"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

# Requirement: Infrastructure Configuration - EKS cluster configuration
variable "eks_cluster_config" {
  description = "EKS cluster configuration for staging"
  type = object({
    cluster_version       = string
    node_groups = object({
      instance_types     = list(string)
      min_size          = number
      max_size          = number
      desired_size      = number
    })
    enable_private_endpoint = bool
    enable_public_endpoint  = bool
  })
  default = {
    cluster_version = "1.27"
    node_groups = {
      instance_types = ["t3.large"]
      min_size      = 2
      max_size      = 6
      desired_size  = 3
    }
    enable_private_endpoint = true
    enable_public_endpoint  = false
  }
}

# Requirement: Data Storage - RDS configuration
variable "rds_config" {
  description = "RDS PostgreSQL configuration for staging"
  type = object({
    instance_class          = string
    allocated_storage      = number
    multi_az              = bool
    backup_retention_period = number
  })
  default = {
    instance_class          = "db.t3.large"
    allocated_storage      = 100
    multi_az              = true
    backup_retention_period = 7
  }
}

# Requirement: Data Storage - DocumentDB configuration
variable "documentdb_config" {
  description = "DocumentDB configuration for staging location data storage"
  type = object({
    instance_class          = string
    instance_count         = number
    backup_retention_period = number
  })
  default = {
    instance_class          = "db.r5.large"
    instance_count         = 3
    backup_retention_period = 7
  }
}

# Requirement: Data Storage - ElastiCache configuration
variable "elasticache_config" {
  description = "ElastiCache Redis configuration for staging caching layer"
  type = object({
    node_type                  = string
    num_cache_nodes           = number
    automatic_failover_enabled = bool
  })
  default = {
    node_type                  = "cache.r5.large"
    num_cache_nodes           = 2
    automatic_failover_enabled = true
  }
}

# Requirement: Infrastructure Configuration - Monitoring configuration
variable "monitoring_config" {
  description = "Monitoring and alerting configuration for staging environment"
  type = object({
    enable_detailed_monitoring = bool
    log_retention_days        = number
    alarm_evaluation_periods  = number
  })
  default = {
    enable_detailed_monitoring = true
    log_retention_days        = 30
    alarm_evaluation_periods  = 3
  }
}