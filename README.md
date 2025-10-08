# Game Server

A comprehensive game server template , built with Express.js, Socket.IO, and TypeScript. This server provides real-time multiplayer functionality, JWT authentication, and Discord integration.

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Installation](#️-installation)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Socket.IO Events](#-socketio-events)
- [Configuration](#-configuration)
- [Client Integration](#-client-integration)
- [Security Features](#-security-features)
- [Monitoring & Logging](#-monitoring--logging)
- [Testing](#-testing)
- [Scripts](#-scripts)
- [Extending the Server](#-extending-the-server)
- [Contributing](#-contributing)
- [Support](#-support)
- [Changelog](#-changelog)

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd Server
npm install

# 2. Setup environment
touch .env
# Add your configuration to .env (see Installation section)

# 3. Start development server
npm run dev

# Server will run on http://localhost:3103
```

## 🚀 Features

- **JWT Authentication**: Secure token-based authentication with nonce generation
- **Real-time Communication**: Socket.IO with Redis adapter for scalable multiplayer
- **Public/Private API Routes**: Separate authenticated and public endpoints
- **Discord Integration**: Automatic notifications for game events
- **Load Balancing Support**: Sticky sessions with Redis for horizontal scaling
- **TypeScript**: Full type safety and modern development experience
- **CORS Enabled**: Cross-origin request support with flexible configuration
- **Comprehensive Logging**: Request tracking and error handling
- **Database Integration**: Couchbase and LowDB support for data persistence
- **Unity WebGL Support**: Optimized static file serving with gzip compression
- **Telegram Bot Integration**: Built-in Telegram bot connector

## 📁 Project Structure

```
src/
├── config/                     # Configuration files
│   └── redis.ts               # Redis configuration and adapter
├── db/                        # Database connections
│   ├── couchbaseClient.ts     # Couchbase client setup
│   └── lowdbClient.ts         # LowDB client for local JSON storage
├── middleware/                # Express middleware
│   └── auth.ts               # JWT authentication middleware (authAPIToken, authSocketToken)
├── public/                    # Static assets (Unity WebGL build)
│   ├── Build/                # Unity WebGL build files
│   │   ├── public.data.unityweb
│   │   ├── public.framework.js.unityweb
│   │   ├── public.loader.js
│   │   └── public.wasm.unityweb
│   ├── TemplateData/         # Unity template assets
│   ├── StreamingAssets/      # Unity streaming assets
│   ├── index.html            # Main HTML file
│   └── config.json           # Game configuration
├── routes/                    # API route definitions
│   ├── authRouter.ts         # Authentication routes (nonce, login)
│   ├── privateRouter.ts      # Protected API routes (requires JWT)
│   └── publicRouter.ts       # Public API routes
├── services/                  # Business logic services
│   ├── privateServices.ts    # Private API service handlers
│   └── publicServices.ts     # Public API service handlers
├── types/                     # TypeScript type definitions
│   └── index.ts              # Global type definitions
├── discordConnector.ts        # Discord bot integration
├── server.ts                  # Main server entry point
├── teleConnector.ts           # Telegram bot integration
└── utils.ts                   # Utility functions (JWT encode/decode)
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
# Create a new .env file in the project root
touch .env
```

4. **Configure environment variables (.env file):**
```env
# Server Configuration
HTTP_PORT=3103
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Telegram Bot (Optional - if using teleConnector)
BOT_TOKEN=your-telegram-bot-token

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_USERNAME=your-redis-username  # Optional
REDIS_PASSWORD=your-redis-password  # Optional

# Discord Integration (Optional - for notifications)
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=your-discord-channel-id

# Couchbase Configuration (Optional - if using Couchbase)
COUCHBASE_URL=couchbase://localhost
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=password
COUCHBASE_BUCKET=default
```

**Important Notes:**
- The `.env` file is automatically copied to `dist/` during the build process
- JWT_SECRET is required for authentication to work
- Redis credentials are optional for local development
- Discord and Telegram integrations are optional and can be commented out in `server.ts`

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

The project includes automated deployment to a production server via SSH. Configure your deployment settings in `package.json`:

```bash
# Full build and deploy
npm run build
# This will:
# 1. Update version
# 2. Compile TypeScript
# 3. Copy .env and public files
# 4. Sync to nhathuy7996.art:CODE/Army/
# 5. Restart PM2 process "army"

# Quick update (public files only)
npm run up
# This will:
# 1. Update version
# 2. Copy public files to dist/
# 3. Sync to production server
```

**Deployment Requirements:**
- SSH access to your production server configured in `~/.ssh/config`
- PM2 installed on the production server
- Node.js v22.19.0 (or adjust the path in package.json)

**Manual Deployment:**
```bash
# Build locally
npm run build

# Copy dist folder to your server
scp -r dist/ user@your-server:/path/to/app/

# SSH into server and restart
ssh user@your-server
cd /path/to/app
pm2 restart app-name
```

### Docker Deployment

The project includes Docker support for easy containerized deployment.

#### Using Docker Compose (Recommended)
```bash
# Build and start all services (server + Redis)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Using Docker Directly
```bash
# Build the image
docker build -t baa-server:latest .

# Run the container
docker run -d \
  -p 3103:3103 \
  --env-file .env \
  --name baa-server \
  baa-server:latest

# View logs
docker logs -f baa-server

# Stop container
docker stop baa-server
```

#### Docker Configuration

**Dockerfile Features:**
- Multi-platform support (ARM64 and AMD64)
- Node.js 18 Alpine base image
- Non-root user for security
- Health checks included
- Optimized layer caching
- Production-ready with dumb-init

**Docker Compose Services:**
- **baa-server**: Main application server
- **redis**: Redis 7 with persistence and password protection
- Automatic restart on failure
- Health checks for both services
- Shared network for inter-service communication

**System Requirements:**
- Docker Engine 20.10+
- Docker Compose 2.0+
- Minimum 512MB RAM (1GB+ recommended)
- 1GB free disk space

See `deploy-guide.md` for more Docker deployment options including Docker Hub, private registries, and troubleshooting.

## 🔌 API Endpoints

### Authentication Routes (`/api/auth`)

#### `GET /api/auth/nonce`
Generate a random nonce for authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  }
}
```

#### `POST /api/auth`
Authenticate and receive JWT token.

**Request:**
```json
{
  "data": "user-authentication-data"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Public Routes (`/api/public`)

#### `GET /api/public/getData`
Get public data (no authentication required).

**Response:**
```json
{
  "success": true,
  "message": "get Data success",
  "data": {}
}
```

#### `POST /api/public/postData`
Post public data (no authentication required).

**Request:**
```json
{
  "data": "your-data-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "get Data success",
  "data": {}
}
```

### Private Routes (`/api/private`)

**Note:** All private routes require JWT authentication header.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### `GET /api/private/getData`
Get protected data (requires authentication).

**Response:**
```json
{
  "success": true,
  "message": "get Data success",
  "data": {}
}
```

#### `POST /api/private/postData`
Post protected data (requires authentication).

**Request:**
```json
{
  "data": "your-data-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "get Data success",
  "data": {}
}
```

### Utility Routes

#### `GET /proxy-image`
Proxy external images through the server.

**Query Parameters:**
- `url`: The URL of the image to proxy

**Response:**
Binary image data with appropriate Content-Type header.

## 🔌 Socket.IO Events

### Configuration

The Socket.IO server is configured with:
- **CORS**: Enabled for all origins
- **Transports**: WebSocket and polling
- **Authentication**: JWT token required via middleware
- **Redis Adapter**: For horizontal scaling and sticky sessions
- **Connection State Recovery**: 2-minute disconnection recovery window

### Client Connection

#### Basic Connection
```typescript
const socket = io('http://localhost:3103', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling']
});
```

#### Connection with SSL
```typescript
const socket = io('https://your-domain.com', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling'],
  secure: true
});
```

### Authentication

Socket.IO connections require JWT authentication. The token is validated using the `authSocketToken` middleware. User data is attached to `socket.data` after successful authentication.

### Events

The server listens for the following events:
- `connection`: Client connected
- `disconnect`: Client disconnected (with reason)
- `error`: Socket error

You can extend the Socket.IO event handlers in `server.ts` to add custom game events.

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

### Unity WebGL Build Configuration

The server automatically handles Unity WebGL compressed files with proper headers:

#### Supported File Types
- `.unityweb` files (compressed Unity assets)
- `.gz` files with automatic Content-Encoding headers
- Proper MIME types for `.wasm`, `.js`, and `.data` files

#### Adding Your Unity Build

1. Build your Unity project for WebGL
2. Copy the build output to `src/public/`
3. The server will automatically serve:
   - `index.html` at the root `/`
   - Build files from `/Build/`
   - Template assets from `/TemplateData/`
   - Streaming assets from `/StreamingAssets/`

```bash
# Copy Unity build
cp -r /path/to/unity/build/* src/public/

# Rebuild and deploy
npm run build
```

## 🎮 Client Integration

### Unity WebGL Setup

#### 1. Get Authentication Nonce
```typescript
// Get a nonce for authentication
const nonceResponse = await fetch('http://localhost:3103/api/auth/nonce');
const { data: { nonce } } = await nonceResponse.json();
```

#### 2. Authenticate and Get JWT
```typescript
// Authenticate with your user data
const authResponse = await fetch('http://localhost:3103/api/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    data: 'your-user-data-here' 
  })
});

const { data: { jwt } } = await authResponse.json();
```

#### 3. Use Protected API Routes
```typescript
// Call private API with JWT token
const response = await fetch('http://localhost:3103/api/private/getData', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

#### 4. Connect Socket.IO
```typescript
// Connect to Socket.IO with JWT authentication
const socket = io('http://localhost:3103', {
  auth: { token: jwt },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Public API Usage

For endpoints that don't require authentication:

```typescript
// Call public API without token
const response = await fetch('http://localhost:3103/api/public/getData', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication with utility functions
- **Nonce Generation**: Cryptographically secure random nonce using crypto.randomUUID()
- **Socket.IO Authentication**: Middleware-based authentication for WebSocket connections
- **CORS Protection**: Configurable cross-origin policies with wildcard support
- **Separate Public/Private Routes**: Clear separation of authenticated and public endpoints
- **Error Handling**: Comprehensive error handling with detailed logging
- **Secure Cookie Settings**: HTTPOnly, Secure, and SameSite cookie configuration

## 📊 Monitoring & Logging

- **Request Logging**: All API requests are logged with timestamps
- **Error Tracking**: Comprehensive error handling and logging with stack traces
- **Socket.IO Event Logging**: Connection, disconnection, and error events are logged
- **Discord Notifications**: Optional real-time alerts for important events (configured in `discordConnector.ts`)
- **Graceful Shutdown**: Proper cleanup of Redis connections and HTTP server on shutdown signals (SIGTERM, SIGINT)

## 🧪 Testing

```bash
# Run all tests (configure test files in test/ directory)
npm test
```

Note: Test setup uses Mocha. Add your test files in the `test/` directory with the pattern `*.test.ts`.

## 📦 Scripts

- `npm run dev` - Start development server with ts-node
- `npm run build` - Build TypeScript to JavaScript, copy files, deploy to production server, and restart PM2
- `npm run up` - Quick update: copy public files and sync to production server
- `npm run test` - Run Mocha test suite
- `npm run proto` - Generate TSRPC protocol definitions
- `npm run sync` - Sync TSRPC types
- `npm run api` - Generate TSRPC API documentation
- `npm run doc` - Generate TSRPC documentation

### Build Process

The build script performs the following steps:
1. Runs `updateVersion.js` to update version numbers
2. Compiles TypeScript to JavaScript (`tsc`)
3. Copies `.env` file to `dist/` directory
4. Copies `src/public/` directory to `dist/public/`
5. Syncs all files to production server via rsync over SSH
6. Restarts the PM2 process named "army" on the production server

## 🔨 Extending the Server

### Adding New Routes

#### 1. Create a Service Handler

Edit `src/services/publicServices.ts` or `privateServices.ts`:

```typescript
export const myNewAPI = async (req: Request, res: Response) => {
    try {
        const { param } = req.body;
        
        const response: ApiResponse = {
            success: true,
            message: 'Success',
            data: { result: 'Your data here' }
        };
        res.json(response);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed'
        });
    }
};
```

#### 2. Register the Route

Edit `src/routes/publicRouter.ts` or `privateRouter.ts`:

```typescript
import { myNewAPI } from '../services/publicServices';

publicRouter.post('/myEndpoint', myNewAPI);
```

### Adding Custom Socket.IO Events

Edit `src/server.ts` in the Socket.IO connection handler:

```typescript
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Add custom event handler
    socket.on('myCustomEvent', (data) => {
        console.log('Received:', data);
        
        // Emit to all clients
        io.emit('broadcastEvent', { message: 'Hello everyone!' });
        
        // Emit to specific client
        socket.emit('personalEvent', { message: 'Hello you!' });
    });
});
```

### Adding Middleware

Create a new middleware in `src/middleware/`:

```typescript
import { Request, Response, NextFunction } from 'express';

export const myMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Your middleware logic
    console.log('Custom middleware executed');
    next();
};
```

Use it in routes:

```typescript
import { myMiddleware } from '../middleware/myMiddleware';

app.use('/api/protected', myMiddleware, protectedRouter);
```

### Adding Database Models

For Couchbase, create models in `src/db/`:

```typescript
// src/db/myModel.ts
import { bucket, collection } from './couchbaseClient';

export const saveData = async (id: string, data: any) => {
    await collection.upsert(id, data);
};

export const getData = async (id: string) => {
    const result = await collection.get(id);
    return result.content;
};
```

### Using Utility Functions

The `utils.ts` file provides helper functions for JWT and time calculations:

```typescript
import { utils } from '../utils';

// Encode JWT token (expires in 7 days)
const token = utils.tokenEncode({ userId: '123', data: { username: 'player1' } });

// Decode and verify JWT token
try {
    const decoded = utils.tokenDecode(token);
    console.log('User data:', decoded);
} catch (error) {
    console.error('Invalid token');
}

// Calculate minutes passed since a timestamp
const minutesPassed = utils.getMinutesPassed('2024-01-01T00:00:00Z');
console.log('Minutes since:', minutesPassed);
```

### Type Definitions

Available TypeScript types in `src/types/index.ts`:

- `ApiResponse`: Standard API response format
- `AuthenticatedSocket`: Socket.IO socket with userId
- `AuthenticatedRequest`: Express request with userId
- `Vector3`: 3D vector {x, y, z}
- `Vector2`: 2D vector {x, y}

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

### Current Version
- Unity WebGL game server with full authentication
- JWT-based authentication with nonce generation
- Socket.IO real-time communication with Redis adapter
- Public and private API routes
- Discord bot integration support
- Telegram bot integration support
- Load balancing with sticky sessions
- Docker and docker-compose support
- Automated SSH deployment with PM2
- Couchbase and LowDB database support
- Graceful shutdown handling 
