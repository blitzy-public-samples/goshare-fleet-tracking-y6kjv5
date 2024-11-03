# Requirement: Container Orchestration - Exposes EKS cluster information for container orchestration integration and management
output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

# Requirement: Security Architecture - Exposes security-related outputs including IAM roles and security group configurations
output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "The security group ID attached to the EKS cluster control plane"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "The security group ID attached to the EKS worker nodes"
  value       = aws_security_group.node.id
}

output "cluster_iam_role_arn" {
  description = "The ARN of the IAM role used by the EKS cluster"
  value       = aws_iam_role.cluster.arn
}

output "node_iam_role_arn" {
  description = "The ARN of the IAM role used by the EKS worker nodes"
  value       = aws_iam_role.node_group.arn
}

# Requirement: High Availability - Provides access to cluster endpoints and security configurations
output "cluster_oidc_issuer_url" {
  description = "The URL of the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "cluster_version" {
  description = "The Kubernetes version of the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_platform_version" {
  description = "The platform version of the EKS cluster"
  value       = aws_eks_cluster.main.platform_version
}

output "cluster_status" {
  description = "The status of the EKS cluster"
  value       = aws_eks_cluster.main.status
}

output "cluster_vpc_config" {
  description = "The VPC configuration of the EKS cluster"
  value = {
    vpc_id             = var.vpc_id
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.cluster.id]
  }
}

output "node_groups" {
  description = "The node groups created for the EKS cluster"
  value = {
    for k, v in aws_eks_node_group.main : k => {
      arn           = v.arn
      status        = v.status
      capacity_type = v.capacity_type
      scaling_config = {
        desired_size = v.scaling_config[0].desired_size
        max_size     = v.scaling_config[0].max_size
        min_size     = v.scaling_config[0].min_size
      }
    }
  }
}