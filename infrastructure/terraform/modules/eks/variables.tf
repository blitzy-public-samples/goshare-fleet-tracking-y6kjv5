# Human Tasks:
# 1. Review and adjust node group instance types based on workload requirements
# 2. Verify KMS key ARN for cluster encryption if using custom key
# 3. Confirm IAM permissions for EKS cluster creation and management
# 4. Review and adjust logging configuration based on compliance requirements

# Terraform AWS Provider version >= 4.0.0

# Requirement: Container Orchestration - Cluster naming and identification
variable "cluster_name" {
  description = "Name of the EKS cluster for the Live Fleet Tracking System"
  type        = string

  validation {
    condition     = length(var.cluster_name) <= 100 && length(var.cluster_name) > 0
    error_message = "Cluster name must be between 1 and 100 characters"
  }
}

# Requirement: Container Orchestration - Kubernetes version management
variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster, must be compatible with system requirements"
  type        = string
  default     = "1.27"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.cluster_version))
    error_message = "Cluster version must be in the format X.Y"
  }
}

# Requirement: Network Infrastructure - VPC configuration
variable "vpc_id" {
  description = "ID of the VPC where EKS cluster will be deployed, must be properly configured for container networking"
  type        = string
}

# Requirement: High Availability - Multi-AZ deployment
variable "private_subnet_ids" {
  description = "List of private subnet IDs for EKS node groups, must be spread across multiple AZs for high availability"
  type        = list(string)
}

# Requirement: Container Orchestration - Node group configuration
variable "node_groups" {
  description = "Map of EKS node group configurations including instance types, scaling parameters, and Kubernetes labels/taints"
  type = map(object({
    instance_types = list(string)
    scaling_config = object({
      desired_size = number
      min_size     = number
      max_size     = number
    })
    labels = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))

  validation {
    condition     = alltrue([for ng in var.node_groups : ng.scaling_config.min_size <= ng.scaling_config.desired_size && ng.scaling_config.desired_size <= ng.scaling_config.max_size])
    error_message = "Node group scaling configuration must have min_size <= desired_size <= max_size"
  }
}

# Requirement: Security - Private endpoint configuration
variable "enable_private_endpoint" {
  description = "Enable private API server endpoint for enhanced security"
  type        = bool
  default     = true
}

# Requirement: Security - Public endpoint configuration
variable "enable_public_endpoint" {
  description = "Enable public API server endpoint, should be disabled in production for security"
  type        = bool
  default     = false
}

# Requirement: Security - Cluster encryption configuration
variable "encryption_config" {
  description = "EKS cluster encryption configuration for securing sensitive data"
  type = object({
    provider_key_arn = string
    resources        = list(string)
  })
  default = {
    provider_key_arn = ""
    resources        = ["secrets"]
  }
}

# Requirement: Container Orchestration - Cluster logging
variable "cluster_log_types" {
  description = "List of control plane logging types to enable for audit and monitoring"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

# Requirement: Container Orchestration - Resource tagging
variable "tags" {
  description = "Tags to apply to all EKS resources for resource management and cost allocation"
  type        = map(string)
  default     = {}
}