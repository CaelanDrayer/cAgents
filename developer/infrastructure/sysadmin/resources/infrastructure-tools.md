# Infrastructure Tools Reference

Quick reference for common infrastructure tools and commands.

## Cloud Platforms

### AWS CLI
```bash
# EC2
aws ec2 describe-instances --filters "Name=tag:Environment,Values=production"
aws ec2 start-instances --instance-ids i-1234567890abcdef0
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# S3
aws s3 ls s3://bucket-name/
aws s3 cp file.txt s3://bucket-name/
aws s3 sync ./local-dir s3://bucket-name/remote-dir

# RDS
aws rds describe-db-instances
aws rds create-db-snapshot --db-instance-identifier mydb --db-snapshot-identifier mydb-backup

# CloudWatch
aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization --dimensions Name=InstanceId,Value=i-1234567890abcdef0 --start-time 2024-01-01T00:00:00Z --end-time 2024-01-01T01:00:00Z --period 300 --statistics Average
```

### GCP CLI
```bash
# Compute
gcloud compute instances list
gcloud compute instances start INSTANCE_NAME
gcloud compute instances stop INSTANCE_NAME

# GCS
gsutil ls gs://bucket-name/
gsutil cp file.txt gs://bucket-name/
gsutil rsync -r ./local-dir gs://bucket-name/remote-dir

# Cloud SQL
gcloud sql instances list
gcloud sql backups create --instance=INSTANCE_NAME
```

### Azure CLI
```bash
# VMs
az vm list --output table
az vm start --resource-group myResourceGroup --name myVM
az vm stop --resource-group myResourceGroup --name myVM

# Storage
az storage blob list --container-name mycontainer --account-name mystorageaccount
az storage blob upload --container-name mycontainer --file localfile.txt --name remotefile.txt
```

## Kubernetes (kubectl)

### Cluster Info
```bash
kubectl cluster-info
kubectl get nodes
kubectl top nodes
kubectl get namespaces
```

### Deployments
```bash
kubectl get deployments -n production
kubectl describe deployment myapp -n production
kubectl rollout status deployment/myapp -n production
kubectl rollout history deployment/myapp -n production
kubectl rollout undo deployment/myapp -n production
kubectl scale deployment myapp --replicas=5 -n production
```

### Pods
```bash
kubectl get pods -n production
kubectl describe pod mypod-abc123 -n production
kubectl logs mypod-abc123 -n production
kubectl logs -f mypod-abc123 -n production  # Follow logs
kubectl exec -it mypod-abc123 -n production -- /bin/sh
kubectl port-forward mypod-abc123 8080:80 -n production
```

### Troubleshooting
```bash
kubectl get events -n production --sort-by='.lastTimestamp'
kubectl top pods -n production
kubectl get pods -n production -o wide
kubectl describe node node-1
```

## Docker

### Container Management
```bash
docker ps                          # Running containers
docker ps -a                       # All containers
docker logs container_name         # View logs
docker logs -f container_name      # Follow logs
docker exec -it container_name /bin/sh  # Shell access
docker stats                       # Resource usage
```

### Image Management
```bash
docker images
docker pull image:tag
docker build -t myimage:tag .
docker push myimage:tag
docker image prune                 # Remove unused images
```

### Docker Compose
```bash
docker-compose up -d
docker-compose down
docker-compose logs -f service_name
docker-compose ps
docker-compose restart service_name
```

## Monitoring

### Prometheus Queries (PromQL)
```promql
# CPU usage
rate(node_cpu_seconds_total{mode!="idle"}[5m])

# Memory usage
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes

# HTTP request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Latency percentiles
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

### Log Queries (ELK/Splunk)
```
# Elasticsearch (Lucene syntax)
status:500 AND service:api
level:error AND @timestamp:[now-1h TO now]

# Splunk
index=production sourcetype=nginx status=500
index=production level=error | timechart count by service
```

## Database Tools

### PostgreSQL
```bash
# Connection
psql -h hostname -U username -d database

# Useful queries
\l                              # List databases
\dt                             # List tables
\d table_name                   # Describe table
SELECT pg_size_pretty(pg_database_size('dbname'));
SELECT * FROM pg_stat_activity; # Active connections
```

### MySQL
```bash
# Connection
mysql -h hostname -u username -p database

# Useful queries
SHOW DATABASES;
SHOW TABLES;
DESCRIBE table_name;
SHOW PROCESSLIST;
SHOW GLOBAL STATUS LIKE 'Connections';
```

### Redis
```bash
redis-cli -h hostname
INFO                            # Server info
KEYS pattern*                   # Find keys (use carefully)
GET key                         # Get value
DBSIZE                          # Number of keys
MONITOR                         # Real-time commands (debug only)
```

## Network Tools

### Connectivity Testing
```bash
ping hostname
telnet hostname port
nc -zv hostname port            # Port check
curl -v http://hostname/path    # HTTP request
traceroute hostname
dig hostname                    # DNS lookup
nslookup hostname
```

### Network Debugging
```bash
netstat -tuln                   # Listening ports
ss -tuln                        # Modern alternative to netstat
tcpdump -i eth0 port 80         # Packet capture
iptables -L                     # Firewall rules
```

## System Tools

### Resource Monitoring
```bash
top                             # Process monitor
htop                            # Better process monitor
free -h                         # Memory usage
df -h                           # Disk usage
du -sh /path                    # Directory size
iostat                          # I/O statistics
vmstat                          # Virtual memory stats
```

### Log Files
```bash
tail -f /var/log/syslog
journalctl -f                   # Systemd journal
journalctl -u service_name      # Specific service
```

### Process Management
```bash
ps aux                          # All processes
pgrep process_name              # Find process
kill -15 PID                    # Graceful termination
kill -9 PID                     # Force kill
systemctl status service_name
systemctl restart service_name
```
