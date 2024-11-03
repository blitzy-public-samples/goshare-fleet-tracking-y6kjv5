# Human Tasks:
# 1. Ensure that any module consuming these outputs has proper IAM permissions to describe VPC resources
# 2. Verify that the CIDR blocks exposed through outputs align with your network security requirements
# 3. Review that the subnet IDs are being correctly referenced in dependent resources like EKS, RDS, and DocumentDB

# Requirement: Network Infrastructure - Exposes VPC infrastructure components for integration with other AWS services
output "vpc_id" {
  description = "ID of the created VPC for reference in other AWS resource configurations"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the created VPC for network planning and security group configurations"
  value       = aws_vpc.main.cidr_block
}

# Requirement: High Availability - Provides access to multi-AZ subnet configurations for redundant deployments
output "public_subnet_ids" {
  description = "List of IDs of public subnets for load balancer and bastion host deployment"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets for application and service deployment"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of IDs of database subnets for RDS and DocumentDB deployment"
  value       = aws_subnet.database[*].id
}

# Requirement: Network Security - Exposes network segmentation details for security group configurations
output "public_subnet_cidrs" {
  description = "List of CIDR blocks of public subnets for network planning and security rules"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "List of CIDR blocks of private subnets for internal network security configuration"
  value       = aws_subnet.private[*].cidr_block
}

output "database_subnet_cidrs" {
  description = "List of CIDR blocks of database subnets for data tier security configuration"
  value       = aws_subnet.database[*].cidr_block
}

# Requirement: High Availability - Enables proper planning for multi-AZ deployments
output "availability_zones" {
  description = "List of availability zones used for multi-AZ deployment planning"
  value       = aws_subnet.public[*].availability_zone
}