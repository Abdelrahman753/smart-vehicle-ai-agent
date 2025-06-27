# 🚀 EC2 Deployment (AWS Linux 2)

## 🏗 Instance Setup
- **OS:** Amazon Linux 2 (free tier eligible)
- **Type:** t2.micro (for initial testing)
- **Security Group:** open port 80 (HTTP) + port 22 (SSH) + port 5000 (for direct Flask testing, optional)

---

## ⚙️ Install NGINX
```bash
sudo yum install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
