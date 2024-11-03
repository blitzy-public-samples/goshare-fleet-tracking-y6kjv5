# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate credentials and region
# 2. Verify that the AWS account has sufficient permissions for VPC creation
# 3. Review and adjust CIDR ranges based on your specific network design requirements
# 4. Confirm availability zones are valid for your chosen AWS region

# Terraform AWS Provider version >= 4.0.0

# Requirement: Network Infrastructure - Defines variables for AWS VPC infrastructure
variable "project_name" {
  description = "Name of the project used for resource naming and tagging in the Live Fleet Tracking System"
  type        = string

  validation {
    condition     = length(var.project_name) > 0
    error_message = "Project name cannot be empty"
  }
}

# Requirement: Network Infrastructure - Environment-specific configurations
variable "environment" {
  description = "Deployment environment name (dev, staging, prod) for environment-specific configurations"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Requirement: Network Infrastructure - VPC CIDR allocation
variable "vpc_cidr" {
  description = "CIDR block for the VPC, must be large enough to accommodate all microservices and future scaling"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# Requirement: High Availability - Multi-AZ deployment configuration
variable "availability_zones" {
  description = "List of AWS availability zones for multi-AZ deployment to ensure high availability"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability"
  }
}

# Requirement: Network Infrastructure - DNS configuration
variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC for service discovery"
  type        = bool
  default     = true
}

# Requirement: Network Infrastructure - DNS support
variable "enable_dns_support" {
  description = "Enable DNS support in the VPC for internal DNS resolution"
  type        = bool
  default     = true
}

# Requirement: Network Infrastructure - NAT Gateway configuration
variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet internet access, required for container image pulls and external API access"
  type        = bool
  default     = true
}

# Requirement: High Availability - NAT Gateway redundancy
variable "single_nat_gateway" {
  description = "Use a single NAT Gateway instead of one per AZ (not recommended for production)"
  type        = bool
  default     = false
}

# Requirement: Network Security - VPC Flow Logs configuration
variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs for network traffic monitoring and security analysis"
  type        = bool
  default     = true
}

# Requirement: Network Security - Flow Logs retention
variable "flow_logs_retention_days" {
  description = "Number of days to retain VPC Flow Logs for security auditing and compliance"
  type        = number
  default     = 30

  validation {
    condition     = var.flow_logs_retention_days >= 0
    error_message = "Flow logs retention days must be non-negative"
  }
}

# Requirement: Network Infrastructure - Resource tagging
variable "tags" {
  description = "Additional tags for VPC resources for resource management and cost allocation"
  type        = map(string)
  default     = {}
}