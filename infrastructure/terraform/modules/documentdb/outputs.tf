# Requirement: Location Data Storage (4.4.3 Data Storage)
# Exposes MongoDB-compatible DocumentDB cluster ID for resource referencing
output "cluster_id" {
  description = "The ID of the DocumentDB cluster for resource referencing"
  value       = aws_docdb_cluster.docdb_cluster.id
  sensitive   = false
}

# Requirement: Location Data Storage (4.4.3 Data Storage)
# Exposes primary cluster endpoint for write operations and cluster management
output "cluster_endpoint" {
  description = "The endpoint of the DocumentDB cluster for write operations and primary instance access"
  value       = aws_docdb_cluster.docdb_cluster.endpoint
  sensitive   = false
}

# Requirement: High Availability (4.5 Scalability Architecture)
# Exposes reader endpoint for read operations and load distribution
output "reader_endpoint" {
  description = "The reader endpoint of the DocumentDB cluster for read operations and load distribution"
  value       = aws_docdb_cluster.docdb_cluster.reader_endpoint
  sensitive   = false
}

# Requirement: High Availability (4.5 Scalability Architecture)
# Exposes list of cluster instance identifiers for monitoring high availability setup
output "cluster_instances" {
  description = "List of cluster instance identifiers for monitoring high availability setup"
  value       = aws_docdb_cluster_instance.docdb_instance[*].identifier
  sensitive   = false
}

# Requirement: Data Security (8.2 Data Security/8.2.1 Encryption Standards)
# Exposes cluster resource ID for AWS resource management and encryption validation
output "cluster_resource_id" {
  description = "The resource ID of the DocumentDB cluster for AWS resource management"
  value       = aws_docdb_cluster.docdb_cluster.cluster_resource_id
  sensitive   = false
}

# Requirement: Location Data Storage (4.4.3 Data Storage)
# Exposes cluster port for network configuration and security group rules
output "cluster_port" {
  description = "The port number on which the DocumentDB cluster accepts connections"
  value       = aws_docdb_cluster.docdb_cluster.port
  sensitive   = false
}