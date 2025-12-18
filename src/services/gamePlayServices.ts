import { AuthenticatedSocket } from '../types';
import { Server } from 'socket.io';
import { GameController } from '../controllers/game/GameController';
import { IGameController } from '../types/game';
import { NormalMapGame } from '../controllers/game/rpgMap/normalMapGame';


// Map để quản lý các game controller
const gameSessions = new Map<string, IGameController>();

export const gamePlayServices = (socket: AuthenticatedSocket, io: Server) => {
    
    // Xử lý event startGame
    socket.on('startGame', async (data) => {
        
        // Kiểm tra xem đã có game session nào cho socket này chưa
        const existingGame = gameSessions.get("training_ground");
        if (existingGame) {
            existingGame.playerJoin(socket);
            return;
        }

        
        const dataParse = JSON.parse(data);
      
        // Tạo game controller mới
        const gameController = await new NormalMapGame(io, 'training_ground').playerJoin(socket);
        
        // Lưu vào map
        gameSessions.set("training_ground", gameController);
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
       
        const gameController = gameSessions.get("training_ground");
        gameController?.playerLeave(socket);
         
    });
    
    // Xử lý lỗi socket
    socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.userId}:`, error);
        
        // Cleanup game controller nếu có
        const gameController = gameSessions.get("1");
        gameController?.playerLeave(socket);
        
    });
};

// Utility function để cleanup tất cả game controllers (dùng khi server shutdown)
export const cleanupAllGameControllers = (): void => {
    // Cleanup tất cả game controllers trước khi clear map
    gameSessions.forEach(controller => {
        controller.cleanup();
    });
    gameSessions.clear();
};