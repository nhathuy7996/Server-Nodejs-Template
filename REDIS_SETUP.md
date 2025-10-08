# Redis Sticky Session Setup Guide

## Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```bash
# Server Configuration
HTTP_PORT=3103
SERVER_ID=server-1  # Unique ID cho mỗi server instance

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_USERNAME=                    # Optional
REDIS_PASSWORD=your_redis_password # Recommended for production

# Load Balancer Configuration (for multiple server instances)
UPSTREAM_SERVERS=server1:3103 server2:3103
```

## Cài đặt Redis

### Option 1: Docker Compose (Recommended)

```bash
# Start Redis with Docker Compose
docker-compose -f docker-compose.redis.yml up -d

# Check Redis status
docker-compose -f docker-compose.redis.yml ps
```

### Option 2: Local Installation

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# CentOS/RHEL
sudo yum install redis
sudo systemctl start redis
```

## Load Balancer Setup

### Nginx Configuration

File `nginx.conf` đã được tạo với cấu hình sticky session. Cập nhật các server addresses trong upstream:

```nginx
upstream backend {
    hash $http_x_user_id consistent;
    
    server server1:3103 weight=1 max_fails=3 fail_timeout=30s;
    server server2:3103 weight=1 max_fails=3 fail_timeout=30s;
    # Thêm server instances khác nếu cần
}
```

### Multiple Server Instances

Để chạy multiple server instances:

```bash
# Terminal 1 - Server Instance 1
SERVER_ID=server-1 HTTP_PORT=3103 npm run dev

# Terminal 2 - Server Instance 2  
SERVER_ID=server-2 HTTP_PORT=3104 npm run dev

# Terminal 3 - Load Balancer
nginx -c /path/to/nginx.conf
```

## Testing Sticky Sessions

### 1. Test Redis Connection

```bash
# Test Redis connection
curl http://localhost:3103/api/health

# Expected response:
{
  "status": "healthy",
  "serverId": "server-1",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "onlineUsers": 0,
  "memory": {...},
  "uptime": 123.456
}
```

### 2. Test Socket.IO with Sticky Sessions

```javascript
// Client-side test
const socket = io('http://localhost', {
  auth: {
    token: 'your_jwt_token'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
  
  // Test session persistence
  socket.emit('user_activity');
});

socket.on('online_users', (users) => {
  console.log('Online users:', users);
});
```

### 3. Test Load Balancer

```bash
# Test different server instances
curl http://localhost/api/server/info

# Should return different serverId for different requests
# if load balancing is working correctly
```

## Production Deployment

### 1. Redis Production Setup

```bash
# Use Redis with authentication
REDIS_PASSWORD=strong_password_here

# Configure Redis persistence
redis-server --appendonly yes --requirepass $REDIS_PASSWORD
```

### 2. SSL Configuration

Uncomment và cấu hình HTTPS trong `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ... rest of configuration
}
```

### 3. Monitoring

Monitor Redis và server instances:

```bash
# Redis monitoring
redis-cli monitor
redis-cli info stats

# Server health checks
curl http://localhost/api/health
curl http://localhost/api/server/info
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```bash
   # Check Redis status
   redis-cli ping
   # Should return PONG
   ```

2. **Sticky Sessions Not Working**
   - Verify SERVER_ID is unique for each instance
   - Check Redis connection
   - Ensure load balancer is using consistent hashing

3. **Socket.IO Connection Issues**
   - Check CORS configuration
   - Verify WebSocket upgrade headers
   - Check firewall/port accessibility

### Debug Commands

```bash
# Check Redis keys
redis-cli keys "session:*"
redis-cli keys "socket:*"
redis-cli keys "online_users"

# Monitor Redis operations
redis-cli monitor

# Check server logs
tail -f logs/server.log
```

## Performance Tuning

### Redis Optimization

```bash
# Increase max memory
redis-cli config set maxmemory 2gb
redis-cli config set maxmemory-policy allkeys-lru

# Enable compression
redis-cli config set hash-max-ziplist-entries 512
redis-cli config set hash-max-ziplist-value 64
```

### Load Balancer Optimization

```nginx
# Increase worker connections
events {
    worker_connections 2048;
}

# Enable gzip compression
gzip on;
gzip_types text/plain application/json application/javascript;
```
