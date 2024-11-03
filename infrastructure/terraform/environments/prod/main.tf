# Human Tasks:
# 1. Review and validate all IAM roles and policies before deployment
# 2. Ensure KMS keys are properly configured for encryption
# 3. Verify network CIDR ranges don't conflict with existing infrastructure
# 4. Configure AWS Auth ConfigMap after EKS cluster deployment
# 5. Set up monitoring alerts and dashboards in CloudWatch
# 6. Review and configure backup retention periods based on compliance requirements
# 7. Validate security group rules match security requirements

# Required providers with versions
terraform {
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

  # Requirement: High Availability - Remote state configuration for production
  backend "s3" {
    bucket         = "fleet-tracking-terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "fleet-tracking-terraform-locks-prod"
  }
}

# Requirement: Security Requirements - AWS provider configuration
provider "aws" {
  region  = "us-east-1"
  profile = "production"
}

# Requirement: Security Requirements - Kubernetes provider configuration
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
  token                  = module.eks.cluster_token
}

# Requirement: Network Infrastructure - VPC module for production environment
module "vpc" {
  source = "../../modules/vpc"

  project_name = "fleet-tracking"
  environment  = "prod"
  vpc_cidr     = "10.0.0.0/16"

  # Requirement: High Availability - Multi-AZ deployment
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Requirement: Network Infrastructure - NAT Gateway configuration
  enable_nat_gateway = true
  single_nat_gateway = false
  enable_vpn_gateway = false

  # Requirement: Security Requirements - VPC Flow Logs
  enable_flow_logs         = true
  flow_logs_retention_days = 30

  tags = {
    Environment = "prod"
    ManagedBy   = "terraform"
    Project     = "fleet-tracking"
  }
}

# Requirement: Container Orchestration - EKS cluster for production workloads
module "eks" {
  source = "../../modules/eks"

  cluster_name    = "fleet-tracking-prod"
  cluster_version = "1.24"

  # Requirement: Network Infrastructure - VPC configuration
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  # Requirement: High Availability - Node groups configuration
  node_groups = {
    application = {
      desired_size  = 3
      min_size     = 3
      max_size     = 6
      instance_types = ["t3.large"]
      capacity_type = "ON_DEMAND"
      labels = {
        role = "application"
      }
      taints = []
    }
    monitoring = {
      desired_size  = 2
      min_size     = 2
      max_size     = 4
      instance_types = ["t3.large"]
      capacity_type = "ON_DEMAND"
      labels = {
        role = "monitoring"
      }
      taints = []
    }
  }

  # Requirement: Security Requirements - Cluster encryption configuration
  encryption_config = {
    provider_key_arn = "arn:aws:kms:us-east-1:${data.aws_caller_identity.current.account_id}:key/your-kms-key-id"
    resources        = ["secrets"]
  }

  # Requirement: Security Requirements - Cluster logging
  cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  tags = {
    Environment = "prod"
    ManagedBy   = "terraform"
    Project     = "fleet-tracking"
  }
}

# Requirement: Primary Database - RDS instance for production database
module "rds" {
  source = "../../modules/rds"

  identifier_prefix = "fleet-tracking"
  environment      = "prod"
  
  # Requirement: Performance Requirements - Database configuration
  engine_version        = "14"
  instance_class        = "db.r6g.xlarge"
  allocated_storage     = 100
  max_allocated_storage = 1000

  # Requirement: High Availability - Multi-AZ deployment
  multi_az_enabled = true

  # Requirement: Security Requirements - Backup configuration
  backup_retention_period = 30
  deletion_protection    = true

  # Requirement: Performance Requirements - Monitoring configuration
  performance_insights_enabled = true
  monitoring_interval         = 60

  # Requirement: Network Infrastructure - Network configuration
  vpc_id              = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  allowed_cidr_blocks = [module.vpc.vpc_cidr]

  tags = {
    Environment = "prod"
    ManagedBy   = "terraform"
    Project     = "fleet-tracking"
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Requirement: High Availability - Outputs for reference
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster API server"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = module.rds.db_instance_endpoint
}