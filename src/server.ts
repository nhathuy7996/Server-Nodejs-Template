import * as path from "path";  
import dotenv from "dotenv"; 
import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { botTele } from "./teleConnector";
import { sendDiscordNotification } from './discordConnector'; 
import { connectToCouchbase } from "./db/couchbaseClient";
import { authSocketToken, authAPIToken } from './middleware/auth';
import authRoutes from './routes/authRouter';
import privateRouter from "./routes/privateRouter";
import publicRouter from './routes/publicRouter';
import { createRedisAdapter, closeRedisConnections } from './config/redis'; 
import fetch from 'node-fetch'; 
import { gamePlayServices } from "./services/gamePlayServices";

dotenv.config();

const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3103;
if (isNaN(HTTP_PORT)) {
    throw new Error('Invalid HTTP_PORT in environment variables');
}

const app: Express = express();
const httpServer = createServer(app);

// Khởi tạo Socket.IO với SSL và Redis adapter
const initSocketIO = async () => {
    console.log('🚀 Initializing Socket.IO server...');
    
    // Initialize Redis adapter for sticky sessions
    let redisAdapter;
    try {
        redisAdapter = await createRedisAdapter();
        console.log('✅ Redis adapter initialized for sticky sessions');
    } catch (error) {
        console.warn('⚠️ Redis adapter failed to initialize, using default adapter:', error);
    }
    
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        // SSL Configuration
        transports: ['websocket', 'polling'],
        allowUpgrades: true,
        // Error handling
        connectTimeout: 45000,
        pingTimeout: 60000,
        pingInterval: 25000,
        // Cookie settings for sticky sessions
        cookie: {
            name: 'io',
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        },
        // Session configuration for sticky sessions
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
            skipMiddlewares: true,
        }
    });

    // Set Redis adapter if available
    if (redisAdapter) {
        io.adapter(redisAdapter);
        console.log('✅ Socket.IO Redis adapter configured');
    }

    // Socket.IO error handling
    io.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
    });

    io.on('error', (error) => {
        console.error('❌ Socket.IO error:', error);
    });

    // Handle authentication errors
    io.engine.on('connection_error', (err) => {
        console.error('❌ Socket.IO engine connection error:', err);
    });

    // Socket.IO authentication middleware
    console.log('🔧 Setting up Socket.IO authentication middleware');
    io.use(authSocketToken);

    // Socket.IO connection handling
    console.log('🔧 Setting up Socket.IO connection handler');
    io.on('connection', (socket) => {
        console.log('✅ Client connected successfully:', socket.id, 'User:', socket.data);

        gamePlayServices(socket, io);

        socket.on('disconnect', (reason) => {
            console.log('Client disconnected:', socket.id, reason);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        }); 
    });

    console.log('✅ Socket.IO server initialized successfully');
    return io;
};

// Express middleware
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files
const publicPath = path.join(__dirname, "public");
console.log('Serving static files from:', publicPath);

// Custom middleware to handle .gz files with proper headers
app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.endsWith('.gz')) {
        // Set proper headers for compressed files
        res.setHeader('Content-Encoding', 'gzip');
        
        // Set appropriate content type based on file extension
        if (req.url.endsWith('.js.gz')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (req.url.endsWith('.wasm.gz')) {
            res.setHeader('Content-Type', 'application/wasm');
        } else if (req.url.endsWith('.data.gz')) {
            res.setHeader('Content-Type', 'application/octet-stream');
        }
    }
    next();
});

app.use(express.static(publicPath));

// Routes
app.use('/api/auth', authRoutes);
app.get("/proxy-image", async (req, res) => {
    try {
        const imageUrl = req.query.url as string;
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();

        res.set("Content-Type", response.headers.get("content-type") || "application/octet-stream");
        res.send(Buffer.from(arrayBuffer));
    } catch (error) {
        res.status(500).send("Lỗi tải ảnh");
    }
});

app.use('/api/public', publicRouter); // public API 

//auth API
app.use('/api/private', authAPIToken, privateRouter);

// Default route
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Start server
try {
    initSocketIO().then(io => {
        httpServer.listen(HTTP_PORT, () => {
            console.log(`Server is running on http://localhost:${HTTP_PORT}`);
            console.log('Working directory:', __dirname);
            console.log('Public path:', publicPath);

            //sendDiscordNotification("Server up! 🚀");
             
        });
    });
} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    // Close Redis connections first
    try {
        await closeRedisConnections();
    } catch (error) {
        console.error('❌ Error closing Redis connections during shutdown:', error);
    }
    
    // Close HTTP server
    if (httpServer) {
        httpServer.close(() => {
            console.log('✅ HTTP server closed');
            process.exit(0);
        });
        
        // Force exit after 10 seconds
        setTimeout(() => {
            console.error('❌ Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


//botTele;
//connectToCouchbase(); 


