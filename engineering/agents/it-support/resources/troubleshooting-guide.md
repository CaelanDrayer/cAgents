# IT Support Troubleshooting Guide

Common issues and step-by-step resolution procedures.

## Network & Connectivity Issues

### Cannot Connect to VPN

**Symptoms:**
- VPN client shows connection failed
- Timeout errors
- Authentication failures

**Resolution Steps:**
1. Verify internet connectivity (can reach google.com?)
2. Check VPN credentials (correct username/password)
3. Verify VPN client is up to date
4. Try different VPN server/region
5. Check firewall isn't blocking VPN ports
6. Restart VPN client
7. Reboot device if issues persist
8. Escalate to SysAdmin if network-wide issue

**Prevention:**
- Keep VPN client updated
- Document VPN server addresses
- Test VPN after network changes

### Slow Network / Internet

**Symptoms:**
- Pages loading slowly
- Downloads taking long
- Video calls choppy

**Resolution Steps:**
1. Run speed test (speedtest.net)
2. Check if Wi-Fi or wired (wired is faster)
3. Move closer to Wi-Fi router
4. Restart router/modem
5. Check for bandwidth-heavy apps
6. Scan for malware
7. Contact ISP if persistent

**Prevention:**
- Use wired connection for important calls
- Schedule large downloads off-peak

### Cannot Access Internal Resource

**Symptoms:**
- "Site cannot be reached"
- Timeout errors
- Connection refused

**Resolution Steps:**
1. Check VPN connection (if remote)
2. Try different browser
3. Clear browser cache
4. Check if resource is up (ask colleague)
5. Verify DNS settings
6. Check firewall rules
7. Escalate to SysAdmin if server issue

## Software Issues

### Application Not Starting

**Symptoms:**
- Application crashes on launch
- Error message on startup
- Application hangs

**Resolution Steps:**
1. Close all instances (check Task Manager)
2. Restart application
3. Check for updates
4. Run as administrator (if applicable)
5. Reinstall application
6. Check system requirements
7. Review event logs for errors
8. Escalate to application team

### Application Running Slow

**Symptoms:**
- Delayed responses
- High CPU/memory usage
- Freezing/hanging

**Resolution Steps:**
1. Close unused applications
2. Check available disk space (>10% free)
3. Clear application cache
4. Increase memory allocation (if configurable)
5. Check for background updates
6. Reboot computer
7. Escalate if hardware issue suspected

### Browser Issues

**Symptoms:**
- Pages not loading correctly
- JavaScript errors
- Extensions causing problems

**Resolution Steps:**
1. Try incognito/private mode
2. Disable extensions temporarily
3. Clear cache and cookies
4. Try different browser
5. Reset browser to defaults
6. Reinstall browser
7. Check proxy settings

## Hardware Issues

### Computer Running Slow

**Symptoms:**
- Boot takes long
- Applications slow to respond
- General sluggishness

**Resolution Steps:**
1. Restart computer
2. Check disk space (>20% free recommended)
3. Close unnecessary applications
4. Check for malware
5. Review startup programs
6. Check for OS updates
7. Consider hardware upgrade (RAM, SSD)

### Keyboard/Mouse Not Working

**Symptoms:**
- Input not responding
- Intermittent functionality
- Device not recognized

**Resolution Steps:**
1. Check cable connections
2. Try different USB port
3. Replace batteries (if wireless)
4. Restart computer
5. Update drivers
6. Try device on different computer
7. Replace device if defective

### Monitor Issues

**Symptoms:**
- No display
- Flickering
- Wrong resolution

**Resolution Steps:**
1. Check cable connections
2. Try different cable
3. Check power to monitor
4. Try different port (HDMI/DP)
5. Update graphics drivers
6. Adjust display settings
7. Test with different monitor

## Account & Access Issues

### Password Reset

**Process:**
1. Verify user identity (email, security questions, manager)
2. Reset password following security policy
3. Send temporary password securely
4. Guide user through password change
5. Ensure new password meets requirements
6. Verify user can log in

**Security Requirements:**
- Minimum 12 characters
- Mix of upper, lower, numbers, symbols
- No dictionary words
- Not same as previous 5 passwords

### Access Denied / Permission Error

**Resolution Steps:**
1. Verify user should have access
2. Check group memberships
3. Review access request form
4. Verify with manager if needed
5. Submit access request to SysAdmin
6. Document access granted
7. Verify user can access

### Account Locked

**Common Causes:**
- Too many failed login attempts
- Expired password
- Security policy violation

**Resolution Steps:**
1. Verify user identity
2. Check lockout reason in AD/directory
3. Unlock account
4. Reset password if needed
5. Check for suspicious activity
6. Report to Security if breach suspected

## Email Issues

### Cannot Send/Receive Email

**Resolution Steps:**
1. Check internet connectivity
2. Verify email credentials
3. Check mailbox storage quota
4. Try webmail vs. client
5. Check SMTP/IMAP settings
6. Verify not blocked by spam filter
7. Escalate to mail admin

### Email Client Setup

**Required Information:**
- Email address
- Password
- IMAP/SMTP server addresses
- Port numbers
- SSL/TLS settings

**Common Settings:**
```
IMAP: imap.company.com:993 (SSL)
SMTP: smtp.company.com:587 (STARTTLS)
```

## Escalation Decision Tree

```
User Issue Received
       |
Can I resolve in 15 minutes?
       |
   Yes → Resolve, document, close
   No  → Is it infrastructure related?
              |
          Yes → Escalate to SysAdmin
          No  → Is it application bug?
                    |
                Yes → Escalate to Dev team
                No  → Is it security related?
                          |
                      Yes → Escalate to Security
                      No  → Research further or
                            consult senior support
```

## Documentation Standards

When creating KB articles:

1. **Title**: Clear, searchable description
2. **Symptoms**: How user identifies issue
3. **Cause**: Why this happens
4. **Solution**: Step-by-step resolution
5. **Prevention**: How to avoid recurrence
6. **Related**: Links to related articles
