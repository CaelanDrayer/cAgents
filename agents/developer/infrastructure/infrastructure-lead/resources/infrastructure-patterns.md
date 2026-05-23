# Infrastructure as Code Patterns

Reference for IaC patterns and infrastructure provisioning.

## Terraform Patterns

### Module Structure

```
modules/
  networking/
    main.tf          # VPC, subnets, security groups
    variables.tf     # Input variables
    outputs.tf       # Exported values
  compute/
    main.tf          # EC2/ECS/EKS definitions
    variables.tf
    outputs.tf
  database/
    main.tf          # RDS, ElastiCache, etc.
    variables.tf
    outputs.tf
environments/
  dev/
    main.tf          # Compose modules with dev values
    terraform.tfvars
  staging/
    main.tf
    terraform.tfvars
  production/
    main.tf
    terraform.tfvars
```

### State Management

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| S3 + DynamoDB lock | Shared, versioned, locked | AWS-specific setup | Team environments |
| Terraform Cloud | Built-in UI, RBAC, runs | Cost at scale | Enterprise teams |
| Local state | Simple, no setup | No collaboration | Solo dev/learning |

### Resource Naming Convention

```hcl
resource "aws_instance" "web" {
  tags = {
    Name        = "${var.project}-${var.environment}-web-${count.index}"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}
# Result: myapp-production-web-0
```

## Kubernetes Patterns

### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: api
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Resource Sizing Guidelines

| Workload Type | CPU Request | Memory Request | Notes |
|--------------|-------------|----------------|-------|
| API Server | 250m-500m | 256Mi-512Mi | Scale horizontally |
| Worker/Queue | 500m-1000m | 512Mi-1Gi | CPU-bound processing |
| Database | 1000m-2000m | 1Gi-4Gi | Memory for caching |
| Cache (Redis) | 250m | 256Mi-1Gi | Memory-bound |

## Network Architecture

### VPC Design

```
VPC (10.0.0.0/16)
  Public Subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
    - Load balancers, NAT gateways, bastion hosts
  Private Subnets (10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24)
    - Application servers, containers
  Data Subnets (10.0.20.0/24, 10.0.21.0/24, 10.0.22.0/24)
    - Databases, caches (no internet access)
```

### Security Group Rules

| Service | Inbound | From | Port |
|---------|---------|------|------|
| ALB | Allow | 0.0.0.0/0 | 443 |
| App | Allow | ALB SG | 8080 |
| Database | Allow | App SG | 5432 |
| Cache | Allow | App SG | 6379 |

## Secrets Management

### Approaches

| Tool | Use When | Integration |
|------|----------|-------------|
| AWS Secrets Manager | AWS-native, rotation needed | SDK, ECS/EKS native |
| HashiCorp Vault | Multi-cloud, dynamic secrets | API, sidecar injector |
| SOPS | Git-encrypted secrets | CI/CD pipelines |
| Sealed Secrets | Kubernetes-native | kubectl, GitOps |

### Best Practices
- Never store secrets in code, config files, or environment variables in plain text
- Rotate secrets on schedule (90 days minimum)
- Use IAM roles and service accounts over static credentials
- Audit secret access via logging
- Separate secrets per environment
