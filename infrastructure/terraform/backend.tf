# Human Tasks:
# 1. Create the S3 bucket for Terraform state storage before running terraform init
# 2. Create the DynamoDB table for state locking before running terraform init
# 3. Create the KMS key for state encryption and update the alias
# 4. Ensure IAM roles have necessary permissions for S3, DynamoDB, and KMS access

# Requirement: Infrastructure State Management - Terraform backend configuration
# Implements secure and scalable state management using AWS S3 and DynamoDB
terraform {
  # Requirement: Infrastructure State Management - Version constraints
  required_version = ">= 1.0.0"

  # Requirement: Infrastructure State Management - Required providers
  required_providers {
    # AWS provider version ~> 4.0
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  # Requirement: Infrastructure State Management - S3 backend configuration
  # Requirement: High Availability - Ensures reliable and concurrent access to infrastructure state
  # Requirement: Security Architecture - Implements encrypted state storage
  backend "s3" {
    bucket = "fleet-tracking-terraform-state-${var.environment}"
    key    = "terraform.tfstate"
    region = "${var.aws_region}"

    # Enable server-side encryption for state file
    encrypt = true

    # Use DynamoDB for state locking and consistency
    dynamodb_table = "fleet-tracking-terraform-state-lock-${var.environment}"

    # Use KMS key for additional encryption security
    kms_key_id = "alias/terraform-state-key-${var.environment}"
  }
}