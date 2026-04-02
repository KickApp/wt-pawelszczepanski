resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "accounting-db"
  subnet_ids = var.subnet_ids

  tags = {
    Name      = "accounting-db"
    Terraform = "true"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "accounting-rds-"
  vpc_id      = var.vpc_id
  description = "Security group for accounting RDS instance"

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.eks_node_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "accounting-rds"
    Terraform = "true"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_parameter_group" "this" {
  name_prefix = "accounting-pg17-"
  family      = "postgres17"
  description = "Force SSL for accounting PostgreSQL"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name      = "accounting"
    Terraform = "true"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "this" {
  identifier = "accounting"

  engine         = "postgres"
  engine_version = var.engine_version
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

  backup_retention_period = 7
  skip_final_snapshot     = true

  tags = {
    Name      = "accounting"
    Terraform = "true"
  }
}

# Store DB password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "accounting/db-password"
  description             = "RDS password for the accounting database"
  recovery_window_in_days = 0

  tags = {
    Terraform = "true"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}
