module "vpc" {
  source = "./modules/vpc"

  cluster_name       = var.cluster_name
  vpc_cidr           = "10.2.0.0/16"
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
}

module "eks" {
  source = "./modules/eks"

  cluster_name    = var.cluster_name
  cluster_version = "1.32"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
}

module "rds" {
  source = "./modules/rds"

  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  eks_node_sg_id = module.eks.node_security_group_id
  db_name        = "accounting"
  db_username    = "app"
  instance_class = "db.t4g.micro"
  engine_version = "17"
}

module "dns" {
  source = "./modules/dns"

  domain_name = var.domain_name
}

# ECR repository
resource "aws_ecr_repository" "app" {
  name                 = "accounting-app"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Terraform = "true"
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# GitHub Actions OIDC provider
data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Terraform = "true"
  }
}

# IAM role for GitHub Actions to push to ECR
resource "aws_iam_role" "github_actions" {
  name = "github-actions-ecr-push"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Terraform = "true"
  }
}

resource "aws_iam_role_policy" "github_actions_ecr" {
  name = "ecr-push"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = aws_ecr_repository.app.arn
      }
    ]
  })
}

# Google SA key in Secrets Manager
resource "aws_secretsmanager_secret" "google_sa_key" {
  name                    = var.google_sa_secret_name
  description             = "Google service account key for Sheets integration"
  recovery_window_in_days = 0

  tags = {
    Terraform = "true"
  }
}

# Secret value is populated manually via CLI — see README
# resource "aws_secretsmanager_secret_version" "google_sa_key" {
#   secret_id     = aws_secretsmanager_secret.google_sa_key.id
#   secret_string = var.google_sa_key_json
# }
