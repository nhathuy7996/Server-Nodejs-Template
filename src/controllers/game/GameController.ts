import { AuthenticatedSocket } from '../../types';
import { Server } from 'socket.io';
import {  Player, IGameController } from '../../types/game'; 
import { env } from 'process';

export class GameController implements IGameController {


    // Tốc độ cập nhật vị trí (lần/giây)
    private static readonly UPDATE_RATE = 60; // 60 FPS
    private static readonly UPDATE_INTERVAL = 1000 / GameController.UPDATE_RATE; // ~16.67ms

    isActive: boolean;
    protected startTime: number;
    protected io: Server; 
    
    private updateInterval: NodeJS.Timeout | null = null;

    // Thông tin player
    protected players: Player[] = [];

    // Thời điểm cập nhật cuối cùng
    private lastUpdateTime: number;

    constructor( io: Server) {
        
        this.io = io;
        
         
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.isActive = true;

        // Bắt đầu update loop
        this.startUpdateLoop();

    }
    playerJoin(socket: AuthenticatedSocket): IGameController {
        const player: Player = {
            id: this.players.length + 1,
            socket: socket,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            health: 100,
            speed: 1,
        }
        this.setupEventListeners(player.socket);
        this.players.push(player);
        return this;
    }
    playerLeave(socket: AuthenticatedSocket): IGameController {
        const player = this.players.find(p => p.socket.userId === socket.userId);
        if(!player)
            return this;

        this.removeEventListeners(player.socket);

        this.players = this.players.filter(p => p.socket.userId !== socket.userId);
        if(this.players.length == 0){
            this.cleanup();
        }
       
        return this;
    }

    public updateSocket(socket: AuthenticatedSocket): IGameController {

        const player = this.players.find(p => p.socket.userId === socket.userId);
        if(!player)
            return this;

        this.removeEventListeners(player.socket);
        
        // Cập nhật socket mới
        player.socket = socket;
        
        // Setup lại listeners trên socket mới
        this.setupEventListeners(player.socket);
        
        console.log(`[GameController] Socket updated successfully`);
        return this;
    }


    /**
     * Đăng ký các event listeners từ client
     */
    public setupEventListeners(socket: AuthenticatedSocket): void {

    }

    /**
     * Update loop - tự động gọi method update() định kỳ
     */
    private startUpdateLoop(): void {
        this.updateInterval = setInterval(() => {
            if (!this.isActive) return;

            const currentTime = Date.now();
            const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
            this.lastUpdateTime = currentTime;

            // Gọi method update() - có thể override trong class con
            this.update(deltaTime);

        }, GameController.UPDATE_INTERVAL);
    }

    /**
     * Method update chính - được gọi tự động mỗi frame
     * Override method này trong class con để custom logic
     * @param deltaTime - Thời gian kể từ lần update trước (tính bằng giây)
     */
    public update(deltaTime: number): void {

    }


    /**
     * Cleanup khi player disconnect hoặc game kết thúc
     */
    cleanup(): void {
       
        // Đánh dấu không active
        this.isActive = false;

        // Dừng update loop
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Remove tất cả listeners
        for(const player of this.players){
            this.removeEventListeners(player.socket);
        }
    }


    public removeEventListeners(socket: AuthenticatedSocket): void {
        
    }

}