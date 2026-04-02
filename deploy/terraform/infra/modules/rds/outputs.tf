output "endpoint" {
  description = "RDS endpoint (hostname only, without port)"
  value       = split(":", aws_db_instance.this.endpoint)[0]
}

output "port" {
  description = "RDS port"
  value       = aws_db_instance.this.port
}

output "password" {
  description = "RDS master password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "password_secret_name" {
  description = "Secrets Manager secret name for DB password"
  value       = aws_secretsmanager_secret.db_password.name
}
