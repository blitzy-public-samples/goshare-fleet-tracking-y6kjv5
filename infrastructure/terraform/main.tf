# Human Tasks:
# 1. Create and configure the S3 bucket for Terraform state storage
# 2. Create the DynamoDB table for state locking
# 3. Review and validate all module configurations
# 4. Ensure proper IAM permissions for Terraform execution
# 5. Configure AWS credentials and authentication
# 6. Verify network CIDR ranges don't conflict with existing infrastructure

# Requirement: Cloud Infrastructure - Terraform configuration and state management
terraform {
  required_version = ">= 1.0.0"

  # Requirement: High Availability - Remote state configuration
  backend "s3" {
    bucket         = "fleet-tracking-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Requirement: Cloud Infrastructure - AWS provider configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "fleet-tracking-system"
      ManagedBy   = "terraform"
    }
  }
}

# Requirement: High Availability - VPC module for multi-AZ networking
module "vpc" {
  source = "./modules/vpc"

  environment            = var.environment
  project_name          = var.project_name
  vpc_cidr              = "10.0.0.0/16"
  availability_zones    = ["us-west-2a", "us-west-2b", "us-west-2c"]
  enable_dns_hostnames  = true
  enable_dns_support    = true
  enable_nat_gateway    = true
  single_nat_gateway    = false
  enable_flow_logs      = true
  flow_logs_retention_days = 30
}

# Requirement: Container Orchestration - EKS cluster configuration
module "eks" {
  source = "./modules/eks"

  cluster_name          = "${var.project_name}-${var.environment}-eks"
  cluster_version       = "1.24"
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  enable_private_endpoint = true
  enable_public_endpoint  = true

  node_groups = {
    default = {
      desired_size = 3
      min_size     = 2
      max_size     = 5
      instance_types = ["t3.medium"]
      labels = {
        role = "application"
      }
    }
  }
}

# Requirement: Data Storage - RDS PostgreSQL configuration
module "rds" {
  source = "./modules/rds"

  instance_class         = "db.t3.medium"
  subnet_ids            = module.vpc.database_subnet_ids
  multi_az              = true
  backup_retention_period = 7
  storage_encrypted     = true
}

# Requirement: Data Storage - DocumentDB configuration
module "documentdb" {
  source = "./modules/documentdb"

  cluster_size         = 3
  subnet_ids          = module.vpc.database_subnet_ids
  instance_class      = "db.r5.medium"
  storage_encrypted   = true
}

# Requirement: Data Storage - ElastiCache Redis configuration
module "elasticache" {
  source = "./modules/elasticache"

  node_type                  = "cache.t3.medium"
  subnet_ids                = module.vpc.database_subnet_ids
  num_cache_nodes           = 3
  automatic_failover_enabled = true
}

# Requirement: Data Storage - S3 bucket configuration
module "s3" {
  source = "./modules/s3"

  bucket_name         = "${var.project_name}-${var.environment}-storage"
  versioning_enabled  = true
  encryption_enabled  = true
  lifecycle_rules = {
    enabled         = true
    transition_days = 90
    storage_class   = "STANDARD_IA"
  }
}

# Requirement: Cloud Infrastructure - VPC outputs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.vpc.vpc_id
}

# Requirement: Container Orchestration - EKS outputs
output "eks_cluster_endpoint" {
  description = "Endpoint URL of the EKS cluster"
  value       = module.eks.cluster_endpoint
}

# Requirement: Data Storage - RDS outputs
output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = module.rds.endpoint
}

# Requirement: Data Storage - DocumentDB outputs
output "documentdb_endpoint" {
  description = "Endpoint of the DocumentDB cluster"
  value       = module.documentdb.endpoint
}

# Requirement: Data Storage - ElastiCache outputs
output "elasticache_endpoint" {
  description = "Configuration endpoint for the ElastiCache cluster"
  value       = module.elasticache.configuration_endpoint
}

# Requirement: Data Storage - S3 outputs
output "s3_bucket_name" {
  description = "Name of the created S3 bucket"
  value       = module.s3.bucket_name
}