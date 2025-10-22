import { AuthenticatedSocket } from '../types';
import { Server } from 'socket.io';
import { GameController } from '../controllers/game/GameController';


// Map để quản lý các game controller
const gameSessions = new Map<string, GameController>();

export const handleGamePlayEvents = (socket: AuthenticatedSocket, io: Server) => {
    
    // Xử lý event startGame
    socket.on('startGame', (data) => {
        
        // Kiểm tra xem đã có game session nào cho socket này chưa
        const existingGame = gameSessions.get(socket.userId!);
        if (existingGame) {
            // Nếu đã có game session, cleanup trước khi tạo mới
            existingGame.cleanup();
            gameSessions.delete(socket.userId!);
        }

        
        const dataParse = JSON.parse(data);
      
        // Tạo game controller mới
        const gameController = new GameController(socket, io);
        
        // Lưu vào map
        gameSessions.set(socket.userId!, gameController);
    });

    socket.on('reconnectGame', (data) => {
        console.log(`Client ${socket.id} emmit reconnect game!`);
        
        // Kiểm tra xem đã có game session nào cho socket này chưa
        const existingGame = gameSessions.get(socket.userId!);
        if (existingGame) {
            existingGame.updateSocket(socket);
            socket.emit('server:reconnectGame', {
                success: true,
                message: 'Reconnect game success!'
            });
            return;
        }

        socket.emit('server:reconnectGame', {
            success: false,
            message: 'Reconnect game fail!'
        });
        
    });
    
    // Xử lý khi client disconnect
    socket.on('disconnect', () => {
       
        const gameController = gameSessions.get(socket.userId!);
        
        if (gameController) {
            // Cleanup game controller
            gameController.cleanup();
            gameSessions.delete(socket.userId!);
        }
    });
    
    // Xử lý lỗi socket
    socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.userId}:`, error);
        
        // Cleanup game controller nếu có
        const gameController = gameSessions.get(socket.userId!);
        if (gameController) {
            gameController.cleanup();
            gameSessions.delete(socket.userId!);
        }
    });
};

// Utility function để lấy thông tin game controller
export const getGameController = (socketId: string): GameController | undefined => {
    return gameSessions.get(socketId);
};

// Utility function để cleanup tất cả game controllers (dùng khi server shutdown)
export const cleanupAllGameControllers = (): void => {
    // Cleanup tất cả game controllers trước khi clear map
    gameSessions.forEach(controller => {
        controller.cleanup();
    });
    gameSessions.clear();
};