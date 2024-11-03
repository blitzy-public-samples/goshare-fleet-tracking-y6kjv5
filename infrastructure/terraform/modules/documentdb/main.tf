# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate permissions for DocumentDB
# 2. Configure AWS KMS key for storage encryption if not using default AWS managed key
# 3. Review and adjust default values based on environment-specific requirements
# 4. Ensure VPC and subnet configurations are properly set up for DocumentDB deployment

# Required provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Requirement: Location Data Storage (4.4.3 Data Storage)
# MongoDB-compatible DocumentDB subnet group for cluster placement
resource "aws_docdb_subnet_group" "docdb_subnet_group" {
  name        = "${var.cluster_identifier}-subnet-group"
  subnet_ids  = var.subnet_ids
  tags        = var.tags

  description = "Subnet group for DocumentDB cluster ${var.cluster_identifier}"
}

# Requirement: Data Security (8.2 Data Security/8.2.1 Encryption Standards)
# Security group for DocumentDB cluster access control
resource "aws_security_group" "docdb_security_group" {
  name        = "${var.cluster_identifier}-sg"
  vpc_id      = var.vpc_id
  description = "Security group for DocumentDB cluster ${var.cluster_identifier}"

  ingress {
    from_port       = var.port
    to_port         = var.port
    protocol        = "tcp"
    cidr_blocks     = var.allowed_cidr_blocks
    security_groups = var.vpc_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_identifier}-docdb-sg"
    }
  )
}

# Requirement: Location Data Storage (4.4.3 Data Storage)
# Requirement: High Availability (4.5 Scalability Architecture)
# Requirement: Data Security (8.2 Data Security/8.2.1 Encryption Standards)
# Requirement: Backup Strategy (A.1.3 Backup Strategy Matrix)
resource "aws_docdb_cluster" "docdb_cluster" {
  cluster_identifier              = var.cluster_identifier
  engine                         = "docdb"
  engine_version                 = var.engine_version
  master_username                = var.master_username
  master_password                = var.master_password
  backup_retention_period        = var.backup_retention_period
  preferred_backup_window        = var.preferred_backup_window
  skip_final_snapshot           = var.skip_final_snapshot
  storage_encrypted             = var.storage_encrypted
  port                          = var.port
  vpc_security_group_ids        = concat([aws_security_group.docdb_security_group.id], var.vpc_security_group_ids)
  db_subnet_group_name          = aws_docdb_subnet_group.docdb_subnet_group.name
  apply_immediately             = var.apply_immediately

  # Enable deletion protection in production
  deletion_protection = !var.skip_final_snapshot

  # Enable enhanced monitoring
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = merge(
    var.tags,
    {
      Name = var.cluster_identifier
    }
  )
}

# Requirement: High Availability (4.5 Scalability Architecture)
# DocumentDB cluster instances distributed across availability zones
resource "aws_docdb_cluster_instance" "docdb_instances" {
  count                   = var.cluster_size
  identifier             = "${var.cluster_identifier}-${count.index}"
  cluster_identifier     = aws_docdb_cluster.docdb_cluster.id
  instance_class         = var.instance_class
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  # Enable enhanced monitoring
  monitoring_interval    = 30
  monitoring_role_arn   = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/rds-monitoring-role"

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_identifier}-${count.index}"
    }
  )
}

# Get current AWS account ID for monitoring role ARN
data "aws_caller_identity" "current" {}

# Outputs for reference by other modules
output "endpoint" {
  description = "The DNS address of the DocumentDB cluster"
  value       = aws_docdb_cluster.docdb_cluster.endpoint
}

output "cluster_identifier" {
  description = "The identifier of the DocumentDB cluster"
  value       = aws_docdb_cluster.docdb_cluster.cluster_identifier
}

output "port" {
  description = "The port number on which the DocumentDB cluster accepts connections"
  value       = aws_docdb_cluster.docdb_cluster.port
}

output "security_group_id" {
  description = "The ID of the security group created for the DocumentDB cluster"
  value       = aws_security_group.docdb_security_group.id
}

output "instance_endpoints" {
  description = "The endpoints of the DocumentDB instances"
  value       = aws_docdb_cluster_instance.docdb_instances[*].endpoint
}

output "instance_identifiers" {
  description = "The identifiers of the DocumentDB instances"
  value       = aws_docdb_cluster_instance.docdb_instances[*].identifier
}