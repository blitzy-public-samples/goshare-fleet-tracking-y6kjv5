# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate permissions for S3 bucket creation
# 2. Verify bucket name follows organization's naming convention
# 3. Review CORS configuration and adjust allowed origins for production use
# 4. Confirm encryption settings meet security compliance requirements

# Required provider version for AWS S3 functionality
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"  # Specify AWS provider version for stability
    }
  }
}

# Requirement: File Storage (4.4.3 Data Storage)
# Define local variables for common tags
locals {
  common_tags = merge(
    {
      Environment = var.environment
      Service     = "fleet-tracking"
      ManagedBy   = "terraform"
    },
    var.tags
  )
}

# Requirement: File Storage (4.4.3 Data Storage)
# Create the main S3 bucket for fleet tracking system
resource "aws_s3_bucket" "main" {
  bucket = var.bucket_name
  tags   = local.common_tags

  # Prevent accidental deletion of this critical infrastructure
  lifecycle {
    prevent_destroy = true
  }
}

# Requirement: High Availability (4.5 Scalability Architecture)
# Enable versioning for data protection and recovery
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# Requirement: Security Requirements (8.2 Data Security)
# Configure server-side encryption for data at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Requirement: Backup Strategy (A.1.3 Backup Strategy Matrix)
# Configure lifecycle rules for POD images and system backups
resource "aws_s3_bucket_lifecycle_rule" "main" {
  bucket = aws_s3_bucket.main.id
  enabled = var.lifecycle_rules_enabled

  # POD images lifecycle rule
  prefix = "pod/"
  
  transition {
    days          = 90
    storage_class = "GLACIER"
  }

  expiration {
    days = 365
  }

  noncurrent_version_expiration {
    days = 90
  }
}

# Requirement: Backup Strategy (A.1.3 Backup Strategy Matrix)
# System backups lifecycle rule
resource "aws_s3_bucket_lifecycle_rule" "system_backups" {
  bucket = aws_s3_bucket.main.id
  enabled = var.lifecycle_rules_enabled

  prefix = "backups/"
  
  expiration {
    days = var.backup_retention_days
  }

  noncurrent_version_expiration {
    days = 30
  }
}

# Requirement: Security Requirements (8.2 Data Security)
# Configure CORS for secure web and mobile access
resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]  # Should be restricted in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Requirement: Security Requirements (8.2 Data Security)
# Block all public access for security compliance
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Requirement: Security Requirements (8.2 Data Security)
# Configure bucket policy for secure access
resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceSSLOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.main.arn,
          "${aws_s3_bucket.main.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# Requirement: High Availability (4.5 Scalability Architecture)
# Enable intelligent tiering for cost optimization
resource "aws_s3_bucket_intelligent_tiering_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  name   = "EntireS3Bucket"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}

# Requirement: Security Requirements (8.2 Data Security)
# Enable object lock configuration for compliance
resource "aws_s3_bucket_object_lock_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 90
    }
  }
}

# Requirement: High Availability (4.5 Scalability Architecture)
# Enable request metrics for monitoring
resource "aws_s3_bucket_metric" "main" {
  bucket = aws_s3_bucket.main.id
  name   = "EntireBucket"
}