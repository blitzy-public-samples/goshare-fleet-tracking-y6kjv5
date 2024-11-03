# Requirement: File Storage Integration (4.4.3 Data Storage)
# Expose S3 bucket information for integration with other system components
output "bucket_id" {
  description = "The ID of the created S3 bucket for POD image storage and system backups"
  value       = aws_s3_bucket.main.id
}

# Requirement: Infrastructure Integration (9.1 Deployment Environment)
# Provide necessary outputs for multi-region deployment and DR configuration
output "bucket_arn" {
  description = "The ARN of the created S3 bucket for IAM policies and cross-region replication configuration"
  value       = aws_s3_bucket.main.arn
}

# Requirement: Backup Strategy Support (A.1.3 Backup Strategy Matrix)
# Enable configuration of backup retention policies through exposed bucket information
output "bucket_domain_name" {
  description = "The domain name of the created S3 bucket for application configuration and direct file access"
  value       = aws_s3_bucket.main.bucket_domain_name
}