provider "aws" {
  region = var.aws_region
}

resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "dev-db"
  subnet_ids = local.private_subnet_ids

  tags = {
    Name      = "dev-db"
    Terraform = "true"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "dev-rds-"
  vpc_id      = local.vpc_id
  description = "Security group for dev RDS instance"

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [local.eks_node_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "dev-rds"
    Terraform = "true"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_parameter_group" "this" {
  name_prefix = "dev-pg17-"
  family      = "postgres17"
  description = "Force SSL for dev PostgreSQL"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name        = "dev"
    Environment = "dev"
    Terraform   = "true"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "this" {
  identifier = "dev"

  engine         = "postgres"
  engine_version = "17"
  instance_class = var.instance_class

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  parameter_group_name   = aws_db_parameter_group.this.name
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 1
  skip_final_snapshot     = true

  tags = {
    Name        = "dev"
    Environment = "dev"
    Terraform   = "true"
  }
}

# Store DB password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "dev/db-password"
  description             = "RDS password for the dev database"
  recovery_window_in_days = 0

  tags = {
    Terraform = "true"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# Store DB connection info in Secrets Manager
resource "aws_secretsmanager_secret" "db_host" {
  name                    = "dev/db-host"
  description             = "RDS endpoint for the dev database"
  recovery_window_in_days = 0

  tags = {
    Terraform = "true"
  }
}

resource "aws_secretsmanager_secret_version" "db_host" {
  secret_id     = aws_secretsmanager_secret.db_host.id
  secret_string = split(":", aws_db_instance.this.endpoint)[0]
}

resource "aws_secretsmanager_secret" "db_port" {
  name                    = "dev/db-port"
  description             = "RDS port for the dev database"
  recovery_window_in_days = 0

  tags = {
    Terraform = "true"
  }
}

resource "aws_secretsmanager_secret_version" "db_port" {
  secret_id     = aws_secretsmanager_secret.db_port.id
  secret_string = tostring(aws_db_instance.this.port)
}
