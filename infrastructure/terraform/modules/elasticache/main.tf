# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate permissions for ElastiCache management
# 2. Configure auth_token with a strong password in the environment's tfvars file
# 3. Verify VPC private subnets have appropriate route table configurations for ElastiCache access
# 4. Review and adjust Redis parameter group settings based on workload requirements
# 5. Configure backup retention and maintenance windows according to operational schedule

# AWS Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Requirement: Caching Layer - Local variables for resource naming and configuration
locals {
  cluster_name = "${var.project_name}-${var.environment}-redis"
  default_tags = {
    Environment = var.environment
    Service     = "fleet-tracking"
    ManagedBy   = "terraform"
    Project     = var.project_name
  }
  # Requirement: Real-time Processing - Redis parameter group settings optimized for fleet tracking
  redis_params = {
    maxmemory-policy                    = "volatile-lru"
    notify-keyspace-events             = "Ex"
    maxmemory-samples                  = "5"
    timeout                            = "300"
    tcp-keepalive                      = "60"
    maxmemory-percent                  = "75"
    client-output-buffer-limit-normal  = "0 0 0"
    client-output-buffer-limit-pubsub  = "32mb 8mb 60"
  }
}

# Requirement: High Availability - Data source for VPC information
data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "vpc/terraform.tfstate"
    region = var.aws_region
  }
}

# Requirement: High Availability - Subnet group for multi-AZ deployment
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.cluster_name}-subnet-group"
  subnet_ids = data.terraform_remote_state.vpc.outputs.private_subnet_ids
  tags       = local.default_tags
}

# Requirement: Real-time Processing - Parameter group for Redis configuration
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis6.x"
  name        = "${local.cluster_name}-params"
  description = "Redis parameter group for fleet tracking system"
  
  dynamic "parameter" {
    for_each = local.redis_params
    content {
      name  = parameter.key
      value = parameter.value
    }
  }
  
  tags = local.default_tags
}

# Requirement: Security - Security group for Redis cluster
resource "aws_security_group" "redis" {
  name        = "${local.cluster_name}-sg"
  description = "Security group for Redis cluster"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = data.terraform_remote_state.vpc.outputs.private_subnet_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.default_tags
}

# Requirement: High Availability & Security - Redis replication group with encryption and failover
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = local.cluster_name
  description               = "Redis cluster for fleet tracking system"
  node_type                 = "cache.t3.medium"
  num_cache_clusters        = 2
  port                      = 6379
  parameter_group_name      = aws_elasticache_parameter_group.redis.name
  subnet_group_name         = aws_elasticache_subnet_group.redis.name
  security_group_ids        = [aws_security_group.redis.id]
  
  # Engine configuration
  engine                    = "redis"
  engine_version           = "6.x"
  
  # High availability settings
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Security settings
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.auth_token
  
  # Backup and maintenance settings
  snapshot_retention_limit   = 7
  snapshot_window           = "03:00-05:00"
  maintenance_window        = "mon:05:00-mon:07:00"
  auto_minor_version_upgrade = true
  apply_immediately         = false
  
  tags = local.default_tags
}

# Requirement: Real-time Processing - Output the Redis endpoint for application configuration
output "redis_endpoint" {
  description = "Primary endpoint for Redis cluster"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Port number for Redis cluster"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

output "redis_connection_string" {
  description = "Secure Redis connection string with TLS"
  value       = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
  sensitive   = true
}