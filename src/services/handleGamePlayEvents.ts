import { AuthenticatedSocket } from '../types';
import { Server } from 'socket.io';
import { GameController } from '../controllers/game/GameController';


// Map để quản lý các game controller
const gameSessions = new Map<string, GameController>();

export const handleGamePlayEvents = (socket: AuthenticatedSocket, io: Server) => {
    
    // Xử lý event startGame
    socket.on('startGame', (data) => {
        const socketId = socket.id;
        
        // Kiểm tra xem đã có game session nào cho socket này chưa
        const existingGame = gameSessions.get(socketId);
        if (existingGame) {
            // Nếu đã có game session, cleanup trước khi tạo mới
            existingGame.cleanup();
            gameSessions.delete(socketId);
        }

        
        const dataParse = JSON.parse(data);
      
        // Tạo game controller mới
        const gameController = new GameController(socket, io);
        
        // Lưu vào map
        gameSessions.set(socketId, gameController);
    });
    
    // Xử lý khi client disconnect
    socket.on('disconnect', () => {
        const socketId = socket.id;
        const gameController = gameSessions.get(socketId);
        
        if (gameController) {
            // Cleanup game controller
            gameController.cleanup();
            gameSessions.delete(socketId);
        }
    });
    
    // Xử lý lỗi socket
    socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.userId}:`, error);
        
        // Cleanup game controller nếu có
        const gameController = gameSessions.get(socket.id);
        if (gameController) {
            gameController.cleanup();
            gameSessions.delete(socket.id);
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