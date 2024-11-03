# Requirement: Database Infrastructure - Expose connection endpoints for system integration
output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance in format hostname:port"
  value       = aws_db_instance.this.endpoint
  sensitive   = false
}

output "db_instance_address" {
  description = "The hostname of the RDS instance for DNS resolution"
  value       = aws_db_instance.this.address
  sensitive   = false
}

output "db_instance_port" {
  description = "The port (5432) on which the PostgreSQL instance accepts connections"
  value       = aws_db_instance.this.port
  sensitive   = false
}

# Requirement: High Availability - Expose resource identifiers for management
output "db_instance_id" {
  description = "The RDS instance identifier for resource management"
  value       = aws_db_instance.this.id
  sensitive   = false
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance for IAM and resource policies"
  value       = aws_db_instance.this.arn
  sensitive   = false
}

# Requirement: Security Configuration - Expose security group identifiers
output "db_security_group_id" {
  description = "The ID of the security group controlling network access to the RDS instance"
  value       = aws_security_group.this.id
  sensitive   = false
}

output "db_security_group_arn" {
  description = "The ARN of the security group for IAM and resource policies"
  value       = aws_security_group.this.arn
  sensitive   = false
}