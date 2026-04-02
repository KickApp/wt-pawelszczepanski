# AWS Load Balancer Controller
resource "helm_release" "aws_lb_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.11.0"

  set {
    name  = "clusterName"
    value = local.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = local.lb_controller_role_arn
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = local.vpc_id
  }
}

# external-dns for automatic Route53 record management
resource "helm_release" "external_dns" {
  name       = "external-dns"
  repository = "https://kubernetes-sigs.github.io/external-dns"
  chart      = "external-dns"
  namespace  = "kube-system"
  version    = "1.15.0"

  set {
    name  = "provider.name"
    value = "aws"
  }

  set {
    name  = "domainFilters[0]"
    value = var.zone_name
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = local.external_dns_role_arn
  }

  set {
    name  = "policy"
    value = "sync"
  }
}

# External Secrets Operator
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  namespace        = "external-secrets"
  create_namespace = true
  version          = "0.12.1"

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = local.external_secrets_role
  }
}

# Accounting application
resource "helm_release" "accounting_app" {
  name             = "accounting-app"
  chart            = "${path.module}/../../helm/accounting-app"
  namespace        = "accounting"
  create_namespace = true

  set {
    name  = "image.repository"
    value = local.ecr_repository_url
  }

  set {
    name  = "image.tag"
    value = var.app_image_tag
  }

  set {
    name  = "env.DB_HOST"
    value = local.rds_endpoint
  }

  set {
    name  = "env.DB_PORT"
    value = tostring(local.rds_port)
  }

  set {
    name  = "ingress.certificateArn"
    value = local.certificate_arn
  }

  set {
    name  = "ingress.host"
    value = var.domain_name
  }

  set {
    name  = "externalSecrets.enabled"
    value = "true"
  }

  set {
    name  = "externalSecrets.region"
    value = var.aws_region
  }

  set {
    name  = "externalSecrets.dbPasswordSecretName"
    value = local.rds_password_secret
  }

  set {
    name  = "externalSecrets.googleSaKeySecretName"
    value = var.google_sa_secret_name
  }

  depends_on = [
    helm_release.aws_lb_controller,
    helm_release.external_dns,
    helm_release.external_secrets,
  ]
}
