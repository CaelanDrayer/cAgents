# Infrastructure as Code Patterns

Best practices for Terraform, Ansible, and CloudFormation.

## Terraform

### Module Structure
```
terraform/
├── modules/
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── compute/
│   └── database/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── production/
└── shared/
    └── backend.tf
```

### State Management
- Remote state (S3 + DynamoDB for AWS)
- State locking to prevent conflicts
- Separate state per environment
- State encryption at rest

### Module Best Practices
- Keep modules focused and reusable
- Use semantic versioning for modules
- Document inputs and outputs
- Include examples and tests

### Example: VPC Module

```hcl
# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.environment}-vpc"
  })
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.environment}-public-${count.index + 1}"
    Type = "public"
  })
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "${var.environment}-private-${count.index + 1}"
    Type = "private"
  })
}
```

## Ansible

### Playbook Structure
```
ansible/
├── playbooks/
│   ├── site.yml
│   ├── webservers.yml
│   └── databases.yml
├── roles/
│   ├── common/
│   │   ├── tasks/
│   │   ├── handlers/
│   │   ├── templates/
│   │   ├── files/
│   │   └── vars/
│   ├── nginx/
│   └── postgresql/
├── inventory/
│   ├── production
│   ├── staging
│   └── group_vars/
└── ansible.cfg
```

### Role Best Practices
- Idempotent tasks (can run multiple times)
- Use handlers for service restarts
- Encrypt secrets with ansible-vault
- Test with molecule

### Example: Nginx Role

```yaml
# roles/nginx/tasks/main.yml
---
- name: Install nginx
  apt:
    name: nginx
    state: present
    update_cache: yes
  notify: Start nginx

- name: Copy nginx config
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    validate: nginx -t -c %s
  notify: Reload nginx

- name: Enable site
  file:
    src: /etc/nginx/sites-available/default
    dest: /etc/nginx/sites-enabled/default
    state: link
  notify: Reload nginx

# roles/nginx/handlers/main.yml
---
- name: Start nginx
  service:
    name: nginx
    state: started
    enabled: yes

- name: Reload nginx
  service:
    name: nginx
    state: reloaded
```

## CloudFormation

### Template Organization
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Application infrastructure

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, production]

Conditions:
  IsProd: !Equals [!Ref Environment, production]

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      Tags:
        - Key: Name
          Value: !Sub ${Environment}-vpc

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub ${Environment}-VPCId
```

### Best Practices
- Use nested stacks for complex deployments
- Parameterize everything environment-specific
- Use conditions for environment differences
- Export outputs for cross-stack references

## Common Patterns

### Environment Parity
- Same IaC code for all environments
- Differences only in variable files
- Consistent naming conventions
- Infrastructure tests for validation

### Change Management
- All changes via pull request
- Peer review for infrastructure code
- Automated plan/apply in CI/CD
- Rollback procedures documented

### Secret Management
- Never commit secrets to code
- Use AWS Secrets Manager, Vault, etc.
- Rotate secrets regularly
- Audit secret access
