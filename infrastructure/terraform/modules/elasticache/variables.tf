# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate credentials and region
# 2. Review and adjust Redis node type based on performance requirements and load testing results
# 3. Verify that the selected Redis version is compatible with your application requirements
# 4. Configure maintenance and backup windows according to your operational schedule
# 5. Review security group rules and network ACLs for Redis access

# Terraform AWS Provider version >= 4.0.0

# Requirement: Caching Layer - Redis cluster identification
variable "cluster_id" {
  description = "Identifier for the ElastiCache Redis cluster"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.cluster_id))
    error_message = "Cluster ID must contain only lowercase alphanumeric characters and hyphens"
  }
}

# Requirement: Performance Requirements - Instance sizing for high performance
variable "node_type" {
  description = "Instance type for Redis nodes, sized for high performance and concurrent connections"
  type        = string
  default     = "cache.r6g.xlarge"
}

# Requirement: High Availability - Multi-node cluster configuration
variable "num_cache_nodes" {
  description = "Number of cache nodes in the cluster for distributed caching"
  type        = number
  default     = 3

  validation {
    condition     = var.num_cache_nodes >= 2
    error_message = "At least 2 cache nodes are required for high availability"
  }
}

# Requirement: Caching Layer - Redis configuration
variable "parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis6.x"
}

# Requirement: Caching Layer - Redis version
variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "6.2"
}

# Requirement: Caching Layer - Network configuration
variable "port" {
  description = "Port number for Redis connections"
  type        = number
  default     = 6379
}

# Requirement: High Availability - Maintenance scheduling
variable "maintenance_window" {
  description = "Weekly time range for maintenance"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

# Requirement: High Availability - Backup configuration
variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots for data recovery"
  type        = number
  default     = 7
}

# Requirement: High Availability - Backup scheduling
variable "snapshot_window" {
  description = "Daily time range for snapshots"
  type        = string
  default     = "03:00-04:00"
}

# Requirement: High Availability - Change management
variable "apply_immediately" {
  description = "Whether changes should be applied immediately"
  type        = bool
  default     = false
}

# Requirement: High Availability - Version management
variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

# Requirement: High Availability - Data security
variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest for data security"
  type        = bool
  default     = true
}

# Requirement: High Availability - Network security
variable "transit_encryption_enabled" {
  description = "Enable encryption in transit for secure data transmission"
  type        = bool
  default     = true
}

# Requirement: High Availability - Multi-AZ deployment
variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

# Requirement: High Availability - Automatic failover
variable "automatic_failover_enabled" {
  description = "Enable automatic failover with Redis Sentinel"
  type        = bool
  default     = true
}

# Requirement: High Availability - Monitoring and alerts
variable "notification_topic_arn" {
  description = "SNS topic ARN for cluster notifications and alerts"
  type        = string
  default     = ""
}

# Requirement: High Availability - Resource tagging
variable "tags" {
  description = "Tags to be applied to the ElastiCache cluster"
  type        = map(string)
  default     = {}
}

# Imported from VPC module for network configuration
variable "vpc_id" {
  description = "ID of the VPC where the ElastiCache cluster will be deployed"
  type        = string
}

# Imported from VPC module for subnet placement
variable "private_subnet_ids" {
  description = "List of private subnet IDs for ElastiCache cluster deployment"
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least 2 private subnets are required for high availability"
  }
}

# Imported from VPC module for AZ configuration
variable "availability_zones" {
  description = "List of availability zones for multi-AZ deployment"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability"
  }
}