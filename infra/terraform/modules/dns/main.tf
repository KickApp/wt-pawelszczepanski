resource "aws_acm_certificate" "this" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = {
    Name      = var.domain_name
    Terraform = "true"
  }

  lifecycle {
    create_before_destroy = true
  }
}
