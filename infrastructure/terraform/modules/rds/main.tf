# Human Tasks:
# 1. Review and validate the security group ingress rules match your organization's security requirements
# 2. Ensure the parameter group settings are optimized for your specific workload
# 3. Verify the backup and maintenance windows don't conflict with peak operation hours
# 4. Confirm the monitoring and performance insights retention periods meet your compliance requirements

# Required provider versions
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws" # version ~> 4.0
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random" # version ~> 3.0
      version = "~> 3.0"
    }
  }
}

# Requirement: Security Requirements - Create DB subnet group in private subnets
resource "aws_db_subnet_group" "this" {
  name_prefix = "${var.identifier_prefix}-${var.environment}"
  subnet_ids  = var.database_subnet_ids

  tags = {
    Environment = var.environment
    Name        = "${var.identifier_prefix}-${var.environment}-subnet-group"
    ManagedBy   = "terraform"
  }
}

# Requirement: Security Requirements - Create security group with strict access controls
resource "aws_security_group" "this" {
  name_prefix = "${var.identifier_prefix}-${var.environment}-rds-sg"
  vpc_id      = var.vpc_id

  # PostgreSQL access
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Name        = "${var.identifier_prefix}-${var.environment}-rds-sg"
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Requirement: Performance Requirements - Create parameter group optimized for fleet tracking workload
resource "aws_db_parameter_group" "this" {
  family = var.parameter_group_family
  name_prefix = "${var.identifier_prefix}-${var.environment}"

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "work_mem"
    value = "16384"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2097152"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Requirement: Primary Database - Create PostgreSQL RDS instance with high availability
resource "aws_db_instance" "this" {
  identifier_prefix = "${var.identifier_prefix}-${var.environment}"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = var.engine_version
  
  # Instance configuration
  instance_class = var.db_instance_class
  
  # Storage configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_encrypted     = true
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  
  # Parameter group configuration
  parameter_group_name = aws_db_parameter_group.this.name
  
  # High availability configuration
  multi_az = var.multi_az_enabled
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  
  # Monitoring configuration
  monitoring_interval             = var.monitoring_interval
  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_retention_period = 7
  
  # Security configuration
  deletion_protection = var.deletion_protection
  
  # Additional configuration
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot     = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.identifier_prefix}-${var.environment}-final"
  
  tags = {
    Environment = var.environment
    Name        = "${var.identifier_prefix}-${var.environment}-primary"
    ManagedBy   = "terraform"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Outputs for other modules to consume
output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.this.endpoint
}

output "db_instance_id" {
  description = "The ID of the RDS instance"
  value       = aws_db_instance.this.id
}

output "db_security_group_id" {
  description = "The ID of the security group created for the RDS instance"
  value       = aws_security_group.this.id
}

output "db_subnet_group_id" {
  description = "The ID of the DB subnet group"
  value       = aws_db_subnet_group.this.id
}