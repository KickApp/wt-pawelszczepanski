output "endpoint" {
  description = "Dev RDS endpoint (hostname only, without port)"
  value       = split(":", aws_db_instance.this.endpoint)[0]
}

output "port" {
  description = "Dev RDS port"
  value       = aws_db_instance.this.port
}

output "password_secret_name" {
  description = "Secrets Manager secret name for dev DB password"
  value       = aws_secretsmanager_secret.db_password.name
}

output "host_secret_name" {
  description = "Secrets Manager secret name for dev DB host"
  value       = aws_secretsmanager_secret.db_host.name
}

output "port_secret_name" {
  description = "Secrets Manager secret name for dev DB port"
  value       = aws_secretsmanager_secret.db_port.name
}
