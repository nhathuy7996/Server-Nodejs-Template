# Cocos Server Client Template

A comprehensive game server template for Telegram Mini Apps, built with Express.js, Socket.IO, and TypeScript. This server provides real-time multiplayer functionality, authentication, score management, and Discord integration.

## 🚀 Features

- **Telegram Mini App Integration**: Seamless authentication through Telegram WebApp
- **Real-time Communication**: Socket.IO with Redis adapter for scalable multiplayer
- **Score Management**: Leaderboard system with real-time updates
- **Discord Integration**: Automatic notifications for game events
- **Load Balancing Support**: Sticky sessions with Redis for horizontal scaling
- **TypeScript**: Full type safety and modern development experience
- **CORS Enabled**: Cross-origin request support
- **Comprehensive Logging**: Request tracking and error handling
- **Database Integration**: Couchbase support for data persistence

## 📁 Project Structure

```
src/
├── config/                     # Configuration files
│   └── redis.ts               # Redis configuration
├── controllers/               # Business logic controllers
│   ├── gamePlayController.ts  # Game logic handling
│   ├── privateAPIExampleController.ts  # Private API examples
│   └── socketController.ts    # Socket.IO event handling
├── data/                      # Data management
│   └── scores.ts              # Score storage and retrieval
├── db/                        # Database connections
│   └── couchbaseClient.ts     # Couchbase client setup
├── middleware/                # Express middleware
│   └── auth.ts               # Authentication middleware
├── public/                    # Static assets
│   ├── application.js         # Main application bundle
│   ├── assets/               # Game assets (Images, internal, main, resources)
│   ├── cocos-js/             # Cocos Creator runtime
│   ├── index.html            # Main HTML file
│   └── style.css             # Styles
├── routes/                    # API route definitions
│   ├── authTelegramRouter.ts # Telegram authentication routes
│   ├── privateExampleRouter.ts # Private API routes
│   └── publicExampleRouter.ts # Public API routes
├── types/                     # TypeScript type definitions
│   └── index.ts              # Global type definitions
├── discordConnector.ts        # Discord bot integration
├── server.ts                  # Main server entry point
├── teleConnector.ts           # Telegram bot integration
└── utils.ts                   # Utility functions
```

## 🛠️ Installation

### Prerequisites

- Node.js (v16 or higher)
- Redis Server
- Couchbase Server (optional)
- Telegram Bot Token
- Discord Bot Token (optional)

### Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd Server
npm install
```

2. **Install Redis:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Windows
# Download from https://redis.io/download
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Configure environment variables:**
```env
# Server Configuration
HTTP_PORT=3103
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Telegram Bot
BOT_TOKEN=your-telegram-bot-token

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_USERNAME=your-redis-username
REDIS_PASSWORD=your-redis-password

# Discord Integration (Optional)
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=your-discord-channel-id

# Couchbase Configuration (Optional)
COUCHBASE_URL=couchbase://localhost
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=password
COUCHBASE_BUCKET=default
```

## 🚀 Usage

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Production Deployment

```bash
# Build the project
npm run build

# The build script includes deployment to your server
# It will copy files and restart PM2 process
```

## 🔌 API Endpoints

### Authentication

#### `POST /api/auth/telegram`
Authenticate user through Telegram Mini App.

**Request:**
```json
{
  "initData": "telegram-webapp-init-data-string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 123456789,
      "username": "user123",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

### Game API

#### `POST /api/scores`
Submit a new score (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request:**
```json
{
  "username": "player1",
  "score": 1000,
  "gameMode": "classic"
}
```

#### `GET /api/scores`
Get top scores leaderboard.

**Query Parameters:**
- `limit`: Number of scores to return (default: 10, max: 100)
- `gameMode`: Filter by game mode (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "username": "player1",
      "score": 1000,
      "gameMode": "classic",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 🔌 Socket.IO Events

### Client to Server

#### Connection
```typescript
const socket = io('http://localhost:3103', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling']
});
```

#### Join Game Room
```typescript
socket.emit('joinGame', { gameMode: 'classic' });
```

#### Submit Score
```typescript
socket.emit('submitScore', { score: 1000, gameMode: 'classic' });
```

### Server to Client

#### Top Scores Update
```typescript
socket.on('topScores', (scores) => {
  console.log('Updated leaderboard:', scores);
});
```

#### Game Event
```typescript
socket.on('gameEvent', (event) => {
  console.log('Game event:', event);
});
```

## 🔧 Configuration

### Load Balancing

For production deployments with multiple server instances, configure your load balancer with sticky sessions:

#### Nginx Configuration
```nginx
upstream game_servers {
    ip_hash;
    server 192.168.1.100:3103;
    server 192.168.1.101:3103;
    server 192.168.1.102:3103;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://game_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Redis Configuration

#### Local Development
```env
REDIS_URL=redis://localhost:6379
```

#### Production with Authentication
```env
REDIS_URL=redis://username:password@your-redis-host:6379
```

## 🎮 Client Integration

### Telegram Mini App Setup

1. **Initialize Telegram WebApp:**
```typescript
// In your Cocos Creator game
const initData = window.Telegram.WebApp.initData;
```

2. **Authenticate with server:**
```typescript
const response = await fetch('http://localhost:3103/api/auth/telegram', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ initData })
});

const { data: { token } } = await response.json();
```

3. **Connect Socket.IO:**
```typescript
const socket = io('http://localhost:3103', {
  auth: { token },
  transports: ['websocket', 'polling']
});
```

### Score Submission

```typescript
// Submit score via REST API
const response = await fetch('http://localhost:3103/api/scores', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    username: 'player1',
    score: 1000,
    gameMode: 'classic'
  })
});

// Or via Socket.IO
socket.emit('submitScore', { score: 1000, gameMode: 'classic' });
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Telegram Validation**: Cryptographically verified Telegram data
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: Built-in request throttling
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses without sensitive data

## 📊 Monitoring & Logging

- **Request Logging**: All API requests are logged
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Monitoring**: Response time tracking
- **Discord Notifications**: Real-time alerts for important events

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/auth.test.ts

# Run tests with coverage
npm run test:coverage
```

## 📦 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run proto` - Generate TSRPC protocol
- `npm run sync` - Sync TSRPC types
- `npm run api` - Generate API documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the example implementations

## 🔄 Changelog

### v0.1.0
- Initial release
- Telegram Mini App integration
- Socket.IO real-time communication
- Score management system
- Discord integration
- Load balancing support 