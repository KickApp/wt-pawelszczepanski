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

  set {
    name  = "serviceMonitor.enabled"
    value = "true"
  }

  set {
    name  = "serviceMonitor.additionalLabels.release"
    value = "kube-prometheus-stack"
  }

  # Deploy after kube-prometheus-stack so ServiceMonitor CRDs exist
  depends_on = [helm_release.kube_prometheus_stack]
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

# kube-prometheus-stack (Prometheus + Grafana)
resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "82.16.1"

  # Grafana ingress
  set {
    name  = "grafana.ingress.enabled"
    value = "true"
  }
  set {
    name  = "grafana.ingress.annotations.kubernetes\\.io/ingress\\.class"
    value = "alb"
  }
  set {
    name  = "grafana.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/scheme"
    value = "internet-facing"
  }
  set {
    name  = "grafana.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/target-type"
    value = "ip"
  }
  set {
    name  = "grafana.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/group\\.name"
    value = "accounting"
  }
  set {
    name  = "grafana.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/listen-ports"
    value = "[{\"HTTP\":80}]"
  }
  set {
    name  = "grafana.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/healthcheck-path"
    value = "/api/health"
  }
  set {
    name  = "grafana.ingress.hosts[0]"
    value = "grafana.${var.base_domain}"
  }
  set {
    name  = "grafana.ingress.paths[0]"
    value = "/"
  }
  set {
    name  = "grafana.adminPassword"
    value = "admin"
  }

  # Prometheus ingress
  set {
    name  = "prometheus.ingress.enabled"
    value = "true"
  }
  set {
    name  = "prometheus.ingress.annotations.kubernetes\\.io/ingress\\.class"
    value = "alb"
  }
  set {
    name  = "prometheus.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/scheme"
    value = "internet-facing"
  }
  set {
    name  = "prometheus.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/target-type"
    value = "ip"
  }
  set {
    name  = "prometheus.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/group\\.name"
    value = "accounting"
  }
  set {
    name  = "prometheus.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/listen-ports"
    value = "[{\"HTTP\":80}]"
  }
  set {
    name  = "prometheus.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/healthcheck-path"
    value = "/-/healthy"
  }
  set {
    name  = "prometheus.ingress.hosts[0]"
    value = "prometheus.${var.base_domain}"
  }
  set {
    name  = "prometheus.ingress.paths[0]"
    value = "/"
  }

  set {
    name  = "prometheus.prometheusSpec.retention"
    value = "7d"
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
    name  = "externalSecrets.dbHostSecretName"
    value = local.rds_host_secret
  }

  set {
    name  = "externalSecrets.dbPortSecretName"
    value = local.rds_port_secret
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

# Index page — static landing page on the root domain
resource "helm_release" "index" {
  name             = "index"
  chart            = "${path.module}/../../helm/index"
  namespace        = "index"
  create_namespace = true

  set {
    name  = "ingress.host"
    value = var.base_domain
  }

  set {
    name  = "links.mainApp"
    value = "main.${var.base_domain}"
  }

  set {
    name  = "links.grafana"
    value = "grafana.${var.base_domain}"
  }

  set {
    name  = "links.prometheus"
    value = "prometheus.${var.base_domain}"
  }

  set {
    name  = "links.domain"
    value = var.base_domain
  }

  depends_on = [
    helm_release.aws_lb_controller,
    helm_release.external_dns,
  ]
}
