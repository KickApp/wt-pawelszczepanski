output "app_url" {
  description = "Application URL"
  value       = data.terraform_remote_state.infra.outputs.app_url
}
