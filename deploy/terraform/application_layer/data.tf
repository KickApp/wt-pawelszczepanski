data "terraform_remote_state" "infra" {
  backend = "s3"

  config = {
    bucket = "pawel-kick-accounting-terraform"
    key    = "accounting-app/terraform.tfstate"
    region = "us-west-2"
  }
}

locals {
  cluster_endpoint       = data.terraform_remote_state.infra.outputs.cluster_endpoint
  cluster_name           = data.terraform_remote_state.infra.outputs.cluster_name
  cluster_ca_certificate = data.terraform_remote_state.infra.outputs.cluster_ca_certificate
  vpc_id                 = data.terraform_remote_state.infra.outputs.vpc_id
  rds_endpoint           = data.terraform_remote_state.infra.outputs.rds_endpoint
  rds_port               = data.terraform_remote_state.infra.outputs.rds_port
  rds_password_secret    = data.terraform_remote_state.infra.outputs.rds_password_secret_name
  lb_controller_role_arn = data.terraform_remote_state.infra.outputs.lb_controller_role_arn
  external_dns_role_arn  = data.terraform_remote_state.infra.outputs.external_dns_role_arn
  external_secrets_role  = data.terraform_remote_state.infra.outputs.external_secrets_role_arn
  ecr_repository_url     = data.terraform_remote_state.infra.outputs.ecr_repository_url
}
