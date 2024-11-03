# Requirement: Caching Layer Integration - Primary endpoint for Redis cluster
output "redis_primary_endpoint" {
  description = "Primary endpoint address for the Redis cluster in the primary AZ"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = false
}

# Requirement: High Availability - Reader endpoint for multi-AZ support
output "redis_reader_endpoint" {
  description = "Reader endpoint address for the Redis cluster in the secondary AZ"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  sensitive   = false
}

# Requirement: Caching Layer Integration - Redis port number
output "redis_port" {
  description = "Port number (6379) for Redis cluster connections"
  value       = aws_elasticache_replication_group.redis.port
  sensitive   = false
}

# Requirement: Security Configuration - Security group ID for network access control
output "redis_security_group_id" {
  description = "ID of the security group controlling Redis cluster access from private subnets"
  value       = aws_security_group.redis.id
  sensitive   = false
}

# Requirement: Security Configuration - TLS-enabled connection string
output "redis_connection_string" {
  description = "Full Redis connection string with TLS encryption for secure application configuration"
  value       = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
  sensitive   = true
}