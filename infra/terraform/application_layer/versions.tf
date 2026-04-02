terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.17"
    }
  }

  backend "s3" {
    bucket         = "pawel-kick-accounting-terraform"
    key            = "application-layer/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "pawel-kick-accounting-terraform-locks"
    encrypt        = true
  }
}
