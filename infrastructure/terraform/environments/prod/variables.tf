# Human Tasks:
# 1. Verify AWS KMS key ARN for encryption configuration
# 2. Confirm subnet CIDR ranges with network team
# 3. Review instance types and sizes with capacity planning team
# 4. Validate backup retention periods with compliance team
# 5. Ensure monitoring settings meet SLA requirements

# Requirement: Production Infrastructure - Environment identification
variable "environment" {
  type        = string
  description = "Production environment identifier"
  default     = "prod"
  validation {
    condition     = var.environment == "prod"
    error_message = "This is a production-only configuration file"
  }
}

# Requirement: Production Infrastructure - AWS region configuration
variable "aws_region" {
  type        = string
  description = "AWS region for production deployment"
  default     = "us-east-1"
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be in the format: us-east-1, eu-central-1, etc."
  }
}

# Requirement: High Availability - Multi-AZ deployment configuration
variable "availability_zones" {
  type        = list(string)
  description = "Production AZs for multi-AZ deployment"
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
  validation {
    condition     = length(var.availability_zones) >= 3
    error_message = "Production requires at least 3 availability zones for high availability"
  }
}

# Requirement: Production Infrastructure - Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for production VPC"
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# Requirement: Production Infrastructure - EKS cluster configuration
variable "eks_cluster_version" {
  type        = string
  description = "Kubernetes version for production EKS cluster"
  default     = "1.27"
  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.eks_cluster_version))
    error_message = "Cluster version must be in the format X.Y"
  }
}

# Requirement: Production Infrastructure - EKS node group configuration
variable "eks_node_groups" {
  type = map(object({
    instance_types = list(string)
    scaling_config = object({
      desired_size = number
      min_size     = number
      max_size     = number
    })
    labels = map(string)
  }))
  description = "Production EKS node group configurations"
  default = {
    general = {
      instance_types = ["t3.xlarge"]
      scaling_config = {
        desired_size = 5
        min_size     = 3
        max_size     = 10
      }
      labels = {
        environment = "prod"
        role       = "general"
      }
    }
  }
}

# Requirement: Data Storage - RDS configuration
variable "rds_instance_class" {
  type        = string
  description = "RDS instance class for production PostgreSQL"
  default     = "db.r5.xlarge"
}

variable "rds_allocated_storage" {
  type        = number
  description = "Allocated storage for production RDS in GB"
  default     = 500
  validation {
    condition     = var.rds_allocated_storage >= 100
    error_message = "Production RDS requires at least 100GB of storage"
  }
}

variable "rds_max_allocated_storage" {
  type        = number
  description = "Maximum storage limit for production RDS in GB"
  default     = 2000
  validation {
    condition     = var.rds_max_allocated_storage > var.rds_allocated_storage
    error_message = "Maximum storage must be greater than allocated storage"
  }
}

# Requirement: Data Storage - DocumentDB configuration
variable "documentdb_instance_class" {
  type        = string
  description = "DocumentDB instance class for production MongoDB"
  default     = "db.r5.xlarge"
}

# Requirement: Data Storage - ElastiCache configuration
variable "elasticache_node_type" {
  type        = string
  description = "ElastiCache node type for production Redis"
  default     = "cache.r5.xlarge"
}

# Requirement: System Performance - Backup configuration
variable "backup_retention_days" {
  type        = number
  description = "Backup retention period for production in days"
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 30
    error_message = "Production backup retention must be at least 30 days"
  }
}

# Requirement: High Availability - Multi-AZ deployment
variable "enable_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for production"
  default     = true
  validation {
    condition     = var.enable_multi_az == true
    error_message = "Multi-AZ deployment is required for production environment"
  }
}

# Requirement: System Performance - Encryption configuration
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption for all production resources"
  default     = true
  validation {
    condition     = var.enable_encryption == true
    error_message = "Encryption must be enabled for production environment"
  }
}

# Requirement: System Performance - Monitoring configuration
variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds"
  default     = 30
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60"
  }
}