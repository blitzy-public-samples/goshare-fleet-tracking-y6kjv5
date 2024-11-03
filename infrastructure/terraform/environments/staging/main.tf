# Human Tasks:
# 1. Verify AWS account ID in allowed_account_ids matches your staging account
# 2. Ensure S3 bucket for Terraform state exists and has versioning enabled
# 3. Configure DynamoDB table for state locking with proper permissions
# 4. Review and validate CIDR ranges for VPC and subnets
# 5. Verify EKS cluster version compatibility with your applications
# 6. Review RDS instance class and storage settings for cost optimization

# Required provider versions
terraform {
  required_version = ">=1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  # Requirement: Infrastructure as Code - Remote state configuration
  backend "s3" {
    bucket         = "fleet-tracking-terraform-state-staging"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock-staging"
  }
}

# Requirement: Infrastructure as Code - AWS provider configuration
provider "aws" {
  region              = "us-east-1"
  allowed_account_ids = ["staging_account_id"]
  
  default_tags {
    tags = {
      Environment = "staging"
      ManagedBy   = "terraform"
      Project     = "fleet-tracking"
    }
  }
}

# Requirement: High Availability - VPC with multi-AZ networking
module "vpc" {
  source = "../../modules/vpc"

  project_name    = "fleet-tracking"
  environment     = "staging"
  vpc_cidr        = "10.1.0.0/16"
  
  # Multi-AZ configuration for high availability
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  # Network configuration
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  # Security and monitoring
  enable_flow_logs         = true
  flow_logs_retention_days = 30

  tags = {
    Environment = "staging"
    ManagedBy   = "terraform"
  }
}

# Requirement: Container Orchestration - EKS cluster configuration
module "eks" {
  source = "../../modules/eks"

  cluster_name    = "fleet-tracking-staging"
  cluster_version = "1.24"
  
  # Network configuration
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  
  # Endpoint access configuration
  enable_private_endpoint = true
  enable_public_endpoint = true

  # Encryption configuration
  encryption_config = {
    provider_key_arn = "arn:aws:kms:us-east-1:${data.aws_caller_identity.current.account_id}:key/mrk-xxxxx"
    resources        = ["secrets"]
  }

  # Logging configuration
  cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # Node group configuration
  node_groups = {
    application = {
      scaling_config = {
        desired_size = 3
        min_size     = 2
        max_size     = 5
      }
      instance_types = ["t3.large"]
      labels = {
        environment = "staging"
        role       = "application"
      }
      taints = []
    }
  }

  tags = {
    Environment = "staging"
    ManagedBy   = "terraform"
  }
}

# Requirement: Primary Database - RDS PostgreSQL configuration
module "rds" {
  source = "../../modules/rds"

  identifier_prefix = "fleet-tracking"
  environment      = "staging"
  
  # Database configuration
  engine_version         = "14"
  parameter_group_family = "postgres14"
  db_instance_class      = "db.t3.large"
  
  # Storage configuration
  allocated_storage     = 100
  max_allocated_storage = 500
  
  # High availability configuration
  multi_az_enabled = true
  
  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  # Monitoring configuration
  monitoring_interval          = 60
  performance_insights_enabled = true
  
  # Security configuration
  deletion_protection = true
  
  # Network configuration
  vpc_id              = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  allowed_cidr_blocks = [module.vpc.vpc_cidr_block]

  tags = {
    Environment = "staging"
    ManagedBy   = "terraform"
  }
}

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}

# Requirement: Infrastructure as Code - Output values for reference
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_id" {
  description = "The ID of the EKS cluster"
  value       = module.eks.cluster_id
}

output "rds_endpoint" {
  description = "The endpoint for the RDS instance"
  value       = module.rds.db_instance_endpoint
}

output "rds_subnet_group_id" {
  description = "The ID of the RDS subnet group"
  value       = module.rds.db_subnet_group_id
}