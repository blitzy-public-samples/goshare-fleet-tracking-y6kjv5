# Human Tasks:
# 1. Review and adjust default values based on specific environment requirements
# 2. Validate CIDR ranges with network team
# 3. Confirm instance types align with budget constraints
# 4. Verify backup retention periods meet compliance requirements
# 5. Ensure multi-AZ settings match high availability needs

# Requirement: Cloud Infrastructure - AWS region configuration
variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-west-2"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be in the format: us-west-2, eu-central-1, etc."
  }
}

# Requirement: Cloud Infrastructure - Environment configuration
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Requirement: Cloud Infrastructure - Project naming
variable "project_name" {
  description = "Name of the project for resource tagging and identification"
  type        = string
  default     = "fleet-tracking"
}

# Requirement: High Availability - Network configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC network configuration"
  type        = string
  default     = "10.0.0.0/16"
}

# Requirement: High Availability - Multi-AZ deployment
variable "availability_zones" {
  description = "List of AWS availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

# Requirement: Container Orchestration - EKS node configuration
variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS node groups by environment"
  type        = map(string)
  default = {
    dev     = "t3.medium"
    staging = "t3.large"
    prod    = "t3.xlarge"
  }
}

# Requirement: Container Orchestration - EKS scaling configuration
variable "eks_node_group_sizes" {
  description = "EKS node group auto-scaling configuration by environment"
  type        = map(object({
    min_size     = number
    max_size     = number
    desired_size = number
  }))
  default = {
    dev = {
      min_size     = 2
      max_size     = 4
      desired_size = 2
    }
    staging = {
      min_size     = 2
      max_size     = 6
      desired_size = 3
    }
    prod = {
      min_size     = 3
      max_size     = 10
      desired_size = 5
    }
  }
}

# Requirement: Data Storage - RDS instance configuration
variable "rds_instance_classes" {
  description = "PostgreSQL RDS instance classes by environment"
  type        = map(string)
  default = {
    dev     = "db.t3.medium"
    staging = "db.t3.large"
    prod    = "db.r5.xlarge"
  }
}

# Requirement: Data Storage - DocumentDB configuration
variable "documentdb_instance_classes" {
  description = "MongoDB-compatible DocumentDB instance classes by environment"
  type        = map(string)
  default = {
    dev     = "db.t3.medium"
    staging = "db.r5.large"
    prod    = "db.r5.xlarge"
  }
}

# Requirement: Data Storage - ElastiCache configuration
variable "elasticache_node_types" {
  description = "Redis ElastiCache node types by environment"
  type        = map(string)
  default = {
    dev     = "cache.t3.medium"
    staging = "cache.r5.large"
    prod    = "cache.r5.xlarge"
  }
}

# Requirement: Data Storage - Backup configuration
variable "backup_retention_days" {
  description = "Database backup retention period in days by environment"
  type        = map(number)
  default = {
    dev     = 3
    staging = 7
    prod    = 30
  }
}

# Requirement: High Availability - Multi-AZ deployment configuration
variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment for high availability by environment"
  type        = map(bool)
  default = {
    dev     = false
    staging = true
    prod    = true
  }
}