# Best Practices: Systems Administrator

> Design principles, patterns, and frameworks that guide high-quality Linux/Unix system administration, server management, and infrastructure reliability.

## Design Principles

- **Automation Over Manual**: If you do it twice, automate it; manual processes are error-prone, non-reproducible, and don't scale — scripts and configuration management are sysadmin infrastructure.
- **Documentation is Infrastructure**: Undocumented systems are liabilities — every server configuration, runbook, and non-obvious decision must be documented and version-controlled.
- **Configuration as Code**: Server configuration belongs in version control (Ansible, Puppet, Chef, SaltStack) — manual changes to production systems are emergencies, not procedures.
- **Least Privilege, Always**: Users and services should have the minimum permissions needed — SSH access should be justified, audited, and rotated.
- **Monitoring Before Production**: No system goes to production without monitoring, alerting, and log aggregation configured — observability is not an afterthought.
- **Backups Are Not Optional**: Untested backups are not backups — test restores regularly, monitor backup freshness, and store backups in a different failure domain.
- **Security Hardening as Default**: Every new server should start from a hardened baseline — disable unnecessary services, apply security patches, configure firewall rules before any application is installed.

## Key Patterns & Frameworks

- **Immutable Infrastructure**: Servers are never patched in place; they are replaced by a new image built from configuration code — eliminates configuration drift.
- **Configuration Management (Ansible/Puppet/Chef)**: Declare desired system state in code; the CM tool enforces it — idempotent application means running it twice is safe.
- **Golden Image (AMI/Template)**: Pre-built server images with base OS, security hardening, and common tooling applied — new servers start from a known good state.
- **Infrastructure Monitoring Stack**: Metrics (Prometheus/Grafana), logs (ELK or Loki), traces (Jaeger) — three pillars of observability applied to infrastructure.
- **SSH Hardening Checklist**: Disable root login, disable password auth (require key-based), use non-default port, restrict `AllowUsers`, enable `UsePAM`, configure `MaxAuthTries`.
- **Firewall Rules (iptables/nftables/ufw)**: Default deny all ingress; allow only explicitly needed ports and source IPs; log dropped packets for security analysis.
- **Log Rotation and Retention Policy**: Configure logrotate or systemd-journald for controlled log rotation; ship logs to centralized storage before rotation.
- **Capacity Planning Model**: Track CPU, memory, disk, and network trends; alert at 70% sustained utilization; plan capacity changes 2 sprints ahead.
- **Cron Job Auditing**: Document every cron job, its purpose, owner, and expected behavior; monitor for failures via alerting on cron job output.
- **Kernel Parameter Tuning (sysctl)**: Tune `net.core.somaxconn`, `vm.swappiness`, `fs.file-max`, and TCP parameters for server role (web server vs. database vs. application server).

## Domain Concepts & Terminology

### Linux System Concepts
- **Process Hierarchy**: init/systemd (PID 1) is the parent of all processes; `pstree` shows the full hierarchy
- **systemd Units**: Service, socket, timer, mount, and target units — the modern Linux init system
- **cgroups (Control Groups)**: Kernel mechanism for resource limiting (CPU, memory, I/O) per process group — used by Docker and Kubernetes
- **Namespaces**: Kernel isolation mechanism for PID, network, mount, UTS, IPC, and user — foundation of container isolation
- **File Descriptor Limits**: `ulimit -n` controls open file limit per process; system limit in `/proc/sys/fs/file-max` — insufficient limits cause "too many open files" errors
- **inode**: Data structure storing file metadata; inode exhaustion causes disk-full errors even with free space

### Networking
- **TCP/IP Stack**: Packet lifecycle from application to wire; understanding helps diagnose connectivity issues
- **DNS Resolution**: `/etc/resolv.conf` → recursive resolver → authoritative server; `dig` and `nslookup` for diagnosis
- **Network Namespaces**: Isolated network stacks; used by containers and virtual machines
- **iptables/nftables**: Linux kernel packet filtering and NAT framework
- **Load Balancer Modes**: Layer 4 (TCP/UDP based, faster) vs. Layer 7 (HTTP-aware, enables routing by path/header)
- **MTU (Maximum Transmission Unit)**: Maximum packet size; MTU mismatch causes "black hole" connectivity issues

### Storage & Filesystem
- **LVM (Logical Volume Manager)**: Flexible disk management — add capacity, resize volumes, take snapshots without downtime
- **RAID Levels**: RAID 1 (mirror), RAID 5 (striping with parity), RAID 10 (striping + mirroring) — balance redundancy, performance, and capacity
- **NFS/CIFS**: Network file systems for shared storage; NFS for Unix-Unix, CIFS/SMB for cross-platform
- **Filesystem Types**: ext4 (stable, general), XFS (large files, high performance), ZFS (copy-on-write, checksums, snapshots, RAID)
- **inodes and Hard Links**: Hard links share an inode; inode count is finite; find inode usage with `df -i`

### Security
- **PAM (Pluggable Authentication Modules)**: Modular authentication framework — configure MFA, password complexity, and session limits
- **SELinux/AppArmor**: Mandatory access control frameworks — enforce policy beyond DAC (discretionary access control)
- **Auditd**: Linux audit subsystem for tracking security-relevant events (file access, privilege escalation, authentication)
- **Fail2ban**: Automatically block IPs after repeated authentication failures — reduces brute-force attack surface
- **Sudo**: Controlled privilege escalation — configure with minimal access; log all sudo commands via `/etc/sudoers` and auditd

## Anti-Patterns to Avoid

- **Manual Configuration Drift**: Making undocumented, one-off changes to production servers — impossible to reproduce, diagnose, or audit.
- **Shared SSH Accounts**: Multiple people using the same `admin` or `root` SSH account — eliminates audit trail and makes key rotation impractical.
- **Root for Everything**: Running application processes as root — a compromised application immediately compromises the whole server.
- **Ignoring Disk Space Until Full**: Not monitoring disk growth trends — disk-full is a predictable, preventable failure that causes cascading outages.
- **Password Authentication via SSH**: SSH with passwords is vulnerable to brute force — require key-based authentication and disable passwords in `sshd_config`.
- **Skipping Patch Testing**: Applying OS patches directly to production without testing on a staging server first.
- **Cron Job Without Monitoring**: Scheduled jobs that run silently — failures go undetected until a downstream system notices missing data.

## Quality Indicators

- **Configuration Management Coverage 100%**: All production servers are fully managed by configuration management code — zero snowflake servers.
- **Backup Restore Tested Monthly**: Most recent backup restores successfully to a test environment within RPO/RTO targets.
- **Patch Lag < 30 Days**: All production systems are within 30 days of current security patches for Critical/High CVEs.
- **Monitoring Coverage 100%**: Every production server sends metrics, logs, and health checks to the monitoring stack.
- **Zero Shared Service Accounts**: All server access is tied to individual accounts with auditable access logs.
- **Disk Utilization Alerts Configured**: Alerts fire at 70% disk utilization to provide time for remediation before full.
- **Runbook Coverage for All Services**: Every production service has a runbook covering startup, shutdown, common failures, and escalation path.

## Collaboration Touchpoints

- **With DevOps Engineer**: Sysadmin provides stable, well-configured infrastructure; DevOps engineer automates deployment pipelines on top of it — coordinate on provisioning APIs and infrastructure state.
- **With DBA**: Coordinate on database server configuration — kernel parameters, storage I/O scheduler, network tuning, and backup infrastructure.
- **With Security Engineer**: Apply security hardening baseline per security team's requirements; coordinate on audit logging, privilege access reviews, and patch management.
- **With IT Support**: Sysadmin handles infrastructure layer escalations from IT support; provide runbooks so IT support can handle common issues without escalating.
