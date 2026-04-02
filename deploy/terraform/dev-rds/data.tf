data "terraform_remote_state" "infra" {
  backend = "s3"

  config = {
    bucket = "pawel-kick-accounting-terraform"
    key    = "accounting-app/terraform.tfstate"
    region = "us-west-2"
  }
}

locals {
  vpc_id              = data.terraform_remote_state.infra.outputs.vpc_id
  private_subnet_ids  = data.terraform_remote_state.infra.outputs.private_subnet_ids
  eks_node_sg_id      = data.terraform_remote_state.infra.outputs.node_security_group_id
}
