variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "zone_name" {
  description = "Domain filter for external-dns"
  type        = string
  default     = "pawel.dev"
}

variable "domain_name" {
  description = "Full domain name for the app"
  type        = string
  default     = "main.accounting-8cvbj8765rv.pawel.dev"
}

variable "app_image_tag" {
  description = "Container image tag (typically git SHA)"
  type        = string
  default     = "latest"
}

variable "base_domain" {
  description = "Base domain for the platform (index page, monitoring subdomains)"
  type        = string
  default     = "accounting-8cvbj8765rv.pawel.dev"
}

variable "google_sa_secret_name" {
  description = "Secrets Manager secret name for Google SA key"
  type        = string
  default     = "accounting/google-sa-key"
}
