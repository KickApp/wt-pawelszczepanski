variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "accounting"
}

variable "domain_name" {
  description = "Full domain name for the app"
  type        = string
  default     = "accounting-8cvbj8765rv.pawel.dev"
}

variable "github_repo" {
  description = "GitHub repository (owner/repo) allowed to push to ECR"
  type        = string
  default     = "KickApp/wt-pawelszczepanski"
}

variable "google_sa_key_json" {
  description = "Google service account key JSON for Sheets integration"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_sa_secret_name" {
  description = "Secrets Manager secret name for Google SA key"
  type        = string
  default     = "accounting/google-sa-key"
}
