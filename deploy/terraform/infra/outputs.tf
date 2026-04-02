output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_ca_certificate" {
  description = "EKS cluster CA certificate (base64)"
  value       = module.eks.cluster_ca_certificate
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "RDS port"
  value       = module.rds.port
}

output "rds_password_secret_name" {
  description = "Secrets Manager secret name for DB password"
  value       = module.rds.password_secret_name
}

output "rds_host_secret_name" {
  description = "Secrets Manager secret name for DB host"
  value       = module.rds.host_secret_name
}

output "rds_port_secret_name" {
  description = "Secrets Manager secret name for DB port"
  value       = module.rds.port_secret_name
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = module.dns.certificate_arn
}

output "lb_controller_role_arn" {
  description = "IAM role ARN for AWS Load Balancer Controller"
  value       = module.eks.lb_controller_role_arn
}

output "external_dns_role_arn" {
  description = "IAM role ARN for external-dns"
  value       = module.eks.external_dns_role_arn
}

output "external_secrets_role_arn" {
  description = "IAM role ARN for External Secrets Operator"
  value       = module.eks.external_secrets_role_arn
}

output "node_security_group_id" {
  description = "Security group ID of EKS nodes"
  value       = module.eks.node_security_group_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}

output "app_url" {
  description = "Application URL"
  value       = "https://${var.domain_name}"
}

