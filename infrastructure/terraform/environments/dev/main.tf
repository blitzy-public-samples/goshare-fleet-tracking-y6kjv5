# Human Tasks:
# 1. Create the S3 bucket "fleet-tracking-terraform-state-dev" for Terraform state
# 2. Create the DynamoDB table "terraform-state-lock-dev" for state locking
# 3. Configure AWS credentials with appropriate permissions
# 4. Review and validate CIDR ranges for VPC configuration
# 5. Verify resource sizing matches development environment requirements
# 6. Ensure proper IAM roles and policies are in place for EKS

# Requirement: Development Environment Infrastructure - Terraform configuration and state management
terraform {
  required_version = ">= 1.0.0"

  # Requirement: Development Environment Infrastructure - Remote state configuration
  backend "s3" {
    bucket         = "fleet-tracking-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = var.aws_region
    encrypt        = true
    dynamodb_table = "terraform-state-lock-dev"
  }
}

# Requirement: Development Environment Infrastructure - AWS provider configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    Environment = "dev"
    Project     = "fleet-tracking-system"
    ManagedBy   = "terraform"
  }
}

# Requirement: Development Environment Infrastructure - VPC configuration
module "vpc" {
  source = "../../modules/vpc"

  environment              = "dev"
  project_name            = var.project_name
  vpc_cidr                = "10.0.0.0/16"
  availability_zones      = ["us-west-2a", "us-west-2b"]
  enable_dns_hostnames    = true
  enable_dns_support      = true
  enable_nat_gateway      = true
  single_nat_gateway      = true # Cost optimization for dev environment
  enable_flow_logs        = true
  flow_logs_retention_days = 7
}

# Requirement: Container Orchestration - EKS cluster configuration
module "eks" {
  source = "../../modules/eks"

  cluster_name            = "${var.project_name}-dev-eks"
  cluster_version        = "1.24"
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  enable_private_endpoint = true
  enable_public_endpoint  = true

  node_groups = {
    default = {
      desired_size  = var.eks_node_group_sizes["dev"].desired_size
      min_size     = var.eks_node_group_sizes["dev"].min_size
      max_size     = var.eks_node_group_sizes["dev"].max_size
      instance_type = var.eks_node_instance_types["dev"]
    }
  }
}

# Requirement: Data Storage Configuration - RDS PostgreSQL configuration
module "rds" {
  source = "../../modules/rds"

  instance_class          = var.rds_instance_classes["dev"]
  subnet_ids             = module.vpc.database_subnet_ids
  multi_az               = var.enable_multi_az["dev"]
  backup_retention_period = var.backup_retention_days["dev"]
  storage_encrypted      = true
}

# Requirement: Data Storage Configuration - DocumentDB configuration
module "documentdb" {
  source = "../../modules/documentdb"

  cluster_size          = 1 # Single node for dev environment
  subnet_ids           = module.vpc.database_subnet_ids
  instance_class       = var.documentdb_instance_classes["dev"]
  storage_encrypted    = true
}

# Requirement: Data Storage Configuration - ElastiCache Redis configuration
module "elasticache" {
  source = "../../modules/elasticache"

  node_type                   = var.elasticache_node_types["dev"]
  subnet_ids                 = module.vpc.database_subnet_ids
  num_cache_nodes            = 1 # Single node for dev environment
  automatic_failover_enabled = false # Disabled for dev environment
}

# Requirement: Data Storage Configuration - S3 bucket configuration
module "s3" {
  source = "../../modules/s3"

  bucket_name          = "${var.project_name}-dev-storage"
  versioning_enabled   = true
  encryption_enabled   = true
  lifecycle_rules = {
    enabled          = true
    transition_days  = 30
    storage_class    = "STANDARD_IA"
  }
}

# Requirement: Development Environment Infrastructure - Output configurations
output "vpc_id" {
  description = "ID of the development VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint URL of the development EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "Endpoint of the development RDS instance"
  value       = module.rds.endpoint
}

output "documentdb_endpoint" {
  description = "Endpoint of the development DocumentDB cluster"
  value       = module.documentdb.endpoint
}

output "elasticache_endpoint" {
  description = "Configuration endpoint for the development ElastiCache cluster"
  value       = module.elasticache.configuration_endpoint
}

output "s3_bucket_name" {
  description = "Name of the development S3 bucket"
  value       = module.s3.bucket_name
}