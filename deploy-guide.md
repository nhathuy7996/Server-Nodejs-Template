# 🚀 Hướng dẫn Deploy BAA Server

## Cách 1: Sử dụng Docker Hub

### Bước 1: Push image lên Docker Hub

```bash
# 1. Đăng nhập Docker Hub
docker login

# 2. Tag image với username của bạn
docker tag baa-server:latest yourusername/baa-server:latest

# 3. Push image lên Docker Hub
docker push yourusername/baa-server:latest
```

### Bước 2: Người nhận pull và chạy

```bash
# 1. Pull image từ Docker Hub
docker pull yourusername/baa-server:latest

# 2. Chạy container
docker run -d -p 3103:3103 --name baa-server yourusername/baa-server:latest

# Hoặc sử dụng docker-compose (cần tạo file docker-compose.yml)
```

## Cách 2: Export/Import Image File

### Bước 1: Export image thành file

```bash
# Export image thành file tar
docker save -o baa-server.tar baa-server:latest

# Nén file để giảm kích thước
gzip baa-server.tar
```

### Bước 2: Gửi file cho người khác

```bash
# Upload lên cloud storage hoặc gửi qua email/chat
# File: baa-server.tar.gz
```

### Bước 3: Người nhận import và chạy

```bash
# 1. Giải nén file (nếu đã nén)
gunzip baa-server.tar.gz

# 2. Import image
docker load -i baa-server.tar

# 3. Chạy container
docker run -d -p 3103:3103 --name baa-server baa-server:latest
```

## Cách 3: Sử dụng Private Registry

### Bước 1: Setup private registry (AWS ECR, Google GCR, etc.)

```bash
# Ví dụ với AWS ECR
aws ecr create-repository --repository-name baa-server

# Login vào ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Tag và push
docker tag baa-server:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/baa-server:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/baa-server:latest
```

## Cách 4: Sử dụng GitHub Container Registry

```bash
# 1. Login vào GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 2. Tag image
docker tag baa-server:latest ghcr.io/yourusername/baa-server:latest

# 3. Push image
docker push ghcr.io/yourusername/baa-server:latest
```

## Yêu cầu hệ thống

- Docker Engine 20.10+
- Docker Compose 2.0+ (nếu sử dụng docker-compose)
- Port 3103 available
- RAM: Tối thiểu 512MB, khuyến nghị 1GB+
- Disk: Tối thiểu 1GB free space

## Environment Variables

Tạo file `.env` với các biến môi trường cần thiết:

```env
NODE_ENV=production
HTTP_PORT=3103
# Thêm các biến khác theo yêu cầu của ứng dụng
```

## Troubleshooting

### Container không start
```bash
# Xem logs
docker logs baa-server

# Kiểm tra status
docker ps -a
```

### Port đã được sử dụng
```bash
# Thay đổi port mapping
docker run -d -p 8080:3103 --name baa-server baa-server:latest
```

### Permission issues
```bash
# Chạy với sudo (Linux/Mac)
sudo docker run -d -p 3103:3103 --name baa-server baa-server:latest
```
