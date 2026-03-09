variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "juandavidkincaid.me"
}

variable "subdomain" {
  description = "Subdomain for the install site"
  type        = string
  default     = "aws-ec2-ddns"
}

variable "github_repo" {
  description = "GitHub repository (owner/repo)"
  type        = string
  default     = "juandavidkincaid/aws-ec2-ddns"
}

variable "bucket_name" {
  description = "S3 bucket name for hosting assets"
  type        = string
  default     = "aws-ec2-ddns.juandavidkincaid.me"
}
