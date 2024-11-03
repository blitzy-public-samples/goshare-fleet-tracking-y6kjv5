# Human Tasks:
# 1. Review and validate that all sensitive outputs are properly marked
# 2. Ensure that the outputs align with the security requirements for external system access
# 3. Verify that the output values are being used correctly in dependent configurations
# 4. Confirm that the exposed infrastructure details meet compliance requirements

# Required provider versions
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Requirement: Cloud Infrastructure - VPC and Network Configuration Outputs
output "vpc_id" {
  description = "ID of the created VPC for network isolation"
  value       = module.vpc.vpc_id
}

output "vpc_private_subnet_ids" {
  description = "List of private subnet IDs in the VPC for application deployment"
  value       = module.vpc.private_subnet_ids
}

output "vpc_database_subnet_ids" {
  description = "List of database subnet IDs in the VPC for data tier isolation"
  value       = module.vpc.database_subnet_ids
}

# Requirement: High Availability - EKS Cluster Configuration Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint URL of the EKS cluster API server for Kubernetes access"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster for resource identification"
  value       = module.eks.cluster_name
}

output "eks_cluster_id" {
  description = "Unique identifier of the EKS cluster"
  value       = module.eks.cluster_id
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster for network access control"
  value       = module.eks.cluster_security_group_id
}

# Requirement: Data Storage - Database Configuration Outputs
output "rds_primary_endpoint" {
  description = "Connection endpoint for the primary PostgreSQL RDS instance"
  value       = module.rds.db_instance_endpoint
}

output "rds_security_group_id" {
  description = "Security group ID controlling access to RDS instances"
  value       = module.rds.db_security_group_id
}

output "rds_subnet_group_id" {
  description = "Subnet group ID for RDS instances deployment"
  value       = module.rds.db_subnet_group_id
}

# Requirement: Data Storage - NoSQL and Cache Configuration Outputs
output "documentdb_endpoint" {
  description = "Connection endpoint for the DocumentDB cluster for location and event data"
  value       = module.documentdb.endpoint
}

output "elasticache_endpoint" {
  description = "Configuration endpoint for the Redis ElastiCache cluster for caching and real-time data"
  value       = module.elasticache.configuration_endpoint
}

output "s3_bucket_name" {
  description = "Name of the created S3 bucket for file storage including POD images"
  value       = module.s3.bucket_name
}

# Requirement: Security - Consolidated Infrastructure Output Object
output "infrastructure_outputs" {
  description = "Consolidated infrastructure details for external system consumption"
  value = {
    vpc_id                = module.vpc.vpc_id
    vpc_private_subnet_ids = module.vpc.private_subnet_ids
    vpc_database_subnet_ids = module.vpc.database_subnet_ids
    eks_cluster_endpoint  = module.eks.cluster_endpoint
    database_endpoints = {
      postgresql = module.rds.db_instance_endpoint
      documentdb = module.documentdb.endpoint
      redis      = module.elasticache.configuration_endpoint
    }
    security_group_ids = {
      eks_cluster = module.eks.cluster_security_group_id
      rds        = module.rds.db_security_group_id
    }
  }
}