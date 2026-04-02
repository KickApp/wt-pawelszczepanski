variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "eks_node_sg_id" {
  description = "Security group ID of EKS nodes (allowed to connect)"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "accounting"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "app"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "17"
}
