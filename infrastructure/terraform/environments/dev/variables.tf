# Human Tasks:
# 1. Review and validate CIDR ranges with network team
# 2. Confirm instance types meet development workload requirements
# 3. Verify backup retention periods are sufficient for development needs
# 4. Ensure monitoring configuration aligns with development SLAs
# 5. Review and adjust resource limits based on development team size

# Requirement: Development Environment Configuration
# Defines development environment identifier and validation
variable "environment" {
  type        = string
  description = "Development environment identifier"
  default     = "dev"
  
  validation {
    condition     = var.environment == "dev"
    error_message = "This is a development environment configuration file, environment must be 'dev'"
  }
}

# Requirement: Infrastructure Scalability - Network Configuration
# Defines VPC CIDR range for development environment
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for development VPC"
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# Requirement: High Availability - Multi-AZ Configuration
# Defines availability zones for development environment
variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for development environment"
  default     = ["us-west-2a", "us-west-2b"]
  
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least two availability zones must be specified"
  }
}

# Requirement: Infrastructure Scalability - EKS Configuration
# Defines EKS cluster settings for development environment
variable "eks_cluster_config" {
  type = object({
    cluster_version      = string
    node_instance_type  = string
    node_group_min_size = number
    node_group_max_size = number
    node_group_desired_size = number
  })
  description = "EKS cluster configuration for development"
  default = {
    cluster_version      = "1.27"
    node_instance_type  = "t3.medium"
    node_group_min_size = 2
    node_group_max_size = 4
    node_group_desired_size = 2
  }
  
  validation {
    condition     = var.eks_cluster_config.node_group_desired_size >= var.eks_cluster_config.node_group_min_size && var.eks_cluster_config.node_group_desired_size <= var.eks_cluster_config.node_group_max_size
    error_message = "Desired size must be between min and max size"
  }
}

# Requirement: Resource Optimization - RDS Configuration
# Defines RDS settings for development environment
variable "rds_config" {
  type = object({
    instance_class = string
    allocated_storage = number
    max_allocated_storage = number
    multi_az = bool
    backup_retention_period = number
  })
  description = "RDS configuration for development"
  default = {
    instance_class = "db.t3.medium"
    allocated_storage = 50
    max_allocated_storage = 100
    multi_az = false
    backup_retention_period = 3
  }
  
  validation {
    condition     = var.rds_config.max_allocated_storage > var.rds_config.allocated_storage
    error_message = "Max allocated storage must be greater than allocated storage"
  }
}

# Requirement: Resource Optimization - DocumentDB Configuration
# Defines DocumentDB settings for development environment
variable "documentdb_config" {
  type = object({
    instance_class = string
    instance_count = number
    backup_retention_period = number
  })
  description = "DocumentDB configuration for development"
  default = {
    instance_class = "db.t3.medium"
    instance_count = 1
    backup_retention_period = 3
  }
  
  validation {
    condition     = var.documentdb_config.instance_count >= 1
    error_message = "At least one DocumentDB instance is required"
  }
}

# Requirement: Resource Optimization - ElastiCache Configuration
# Defines ElastiCache settings for development environment
variable "elasticache_config" {
  type = object({
    node_type = string
    num_cache_nodes = number
    automatic_failover = bool
  })
  description = "ElastiCache configuration for development"
  default = {
    node_type = "cache.t3.medium"
    num_cache_nodes = 1
    automatic_failover = false
  }
  
  validation {
    condition     = var.elasticache_config.num_cache_nodes >= 1
    error_message = "At least one cache node is required"
  }
}

# Requirement: Infrastructure Scalability - Monitoring Configuration
# Defines monitoring settings for development environment
variable "monitoring_config" {
  type = object({
    retention_days = number
    evaluation_periods = number
    datapoints_required = number
  })
  description = "Monitoring configuration for development"
  default = {
    retention_days = 7
    evaluation_periods = 2
    datapoints_required = 2
  }
  
  validation {
    condition     = var.monitoring_config.datapoints_required <= var.monitoring_config.evaluation_periods
    error_message = "Required datapoints must not exceed evaluation periods"
  }
}