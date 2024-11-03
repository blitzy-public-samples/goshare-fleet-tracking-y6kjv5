# Requirement: Network Infrastructure - Main VPC resource
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-vpc"
      Environment = var.environment
      Terraform   = "true"
      Project     = var.project_name
    },
    var.tags
  )
}

# Requirement: Network Infrastructure - Public subnets for external-facing resources
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = merge(
    {
      Name = "${var.project_name}-${var.environment}-public-${count.index + 1}"
      Type = "Public"
      Tier = "Public"
    },
    var.tags
  )
}

# Requirement: Network Infrastructure - Private subnets for application layer
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    {
      Name = "${var.project_name}-${var.environment}-private-${count.index + 1}"
      Type = "Private"
      Tier = "Application"
    },
    var.tags
  )
}

# Requirement: Network Infrastructure - Database subnets for data layer
resource "aws_subnet" "database" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 2 * length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    {
      Name = "${var.project_name}-${var.environment}-database-${count.index + 1}"
      Type = "Database"
      Tier = "Data"
    },
    var.tags
  )
}

# Requirement: Network Infrastructure - Internet Gateway for public subnet access
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-igw"
      Environment = var.environment
    },
    var.tags
  )
}

# Requirement: High Availability - Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0
  vpc   = true

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-eip-${count.index + 1}"
      Environment = var.environment
    },
    var.tags
  )
}

# Requirement: Network Infrastructure - NAT Gateways for private subnet internet access
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  depends_on = [aws_internet_gateway.main]

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-nat-${count.index + 1}"
      Environment = var.environment
    },
    var.tags
  )
}

# Requirement: Network Infrastructure - Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    {
      Name = "${var.project_name}-${var.environment}-public-rt"
      Type = "Public"
    },
    var.tags
  )
}

# Requirement: Network Infrastructure - Route tables for private subnets
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index].id
  }

  tags = merge(
    {
      Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
      Type = "Private"
    },
    var.tags
  )
}

# Requirement: Network Infrastructure - Public subnet route table associations
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Requirement: Network Infrastructure - Private subnet route table associations
resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Requirement: Network Infrastructure - Database subnet route table associations
resource "aws_route_table_association" "database" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Requirement: Network Security - VPC Flow Logs
resource "aws_flow_log" "main" {
  count                = var.enable_flow_logs ? 1 : 0
  vpc_id              = aws_vpc.main.id
  traffic_type        = "ALL"
  iam_role_arn        = aws_iam_role.flow_logs[0].arn
  log_destination     = aws_cloudwatch_log_group.flow_logs[0].arn
  log_destination_type = "cloud-watch-logs"

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-flow-logs"
      Environment = var.environment
    },
    var.tags
  )
}

# Requirement: Network Security - CloudWatch Log Group for Flow Logs
resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc-flow-logs/${var.project_name}-${var.environment}"
  retention_in_days = var.flow_logs_retention_days

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-flow-logs"
      Environment = var.environment
    },
    var.tags
  )
}

# Requirement: Network Security - IAM Role for Flow Logs
resource "aws_iam_role" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-flow-logs-role"
      Environment = var.environment
    },
    var.tags
  )
}

# Requirement: Network Security - IAM Policy for Flow Logs
resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-flow-logs-policy"
  role  = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect = "Allow"
        Resource = "*"
      }
    ]
  })
}