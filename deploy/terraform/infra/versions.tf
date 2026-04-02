terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "pawel-kick-accounting-terraform"
    key            = "accounting-app/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "pawel-kick-accounting-terraform-locks"
    encrypt        = true
  }
}
