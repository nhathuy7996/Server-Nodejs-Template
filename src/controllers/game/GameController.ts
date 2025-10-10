import { AuthenticatedSocket } from '../../types';
import { Server } from 'socket.io';
import {  Player, IGameController } from '../../types/game';

export class GameController implements IGameController {


    // Tốc độ cập nhật vị trí (lần/giây)
    private static readonly UPDATE_RATE = 60; // 60 FPS
    private static readonly UPDATE_INTERVAL = 1000 / GameController.UPDATE_RATE; // ~16.67ms
 

    private socketId: string;
    private startTime: number;
    private isActive: boolean;
    private socket: AuthenticatedSocket;
    private io: Server;
    private userId: string;

    private updateInterval: NodeJS.Timeout | null = null;

    // Thông tin player
    private players: Player[] = []; 

    // Thời điểm cập nhật cuối cùng
    private lastUpdateTime: number;

    constructor(socket: AuthenticatedSocket, io: Server) {
        this.socket = socket;
        this.io = io;
        this.socketId = socket.id;
        this.userId = socket.userId || 'unknown';
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.isActive = true;

        // Khởi tạo player với vị trí ban đầu
        this.players.push({
            id: this.socketId,
            userId: this.userId,
            position: { x: 0, y: 0, z: 0 }, // Vị trí spawn mặc định
            rotation: { x: 0, y: 0, z: 0 },
            health: 100,
            speed: 0,
            lastUpdate: Date.now()
        });

        // Đăng ký các event handlers
        this.setupEventListeners();

        // Bắt đầu update loop
        this.startUpdateLoop();

        console.log(`[GameController] Initialized for user ${this.userId}, socket ${this.socketId}`);
    }

    /**
     * Đăng ký các event listeners từ client
     */
    public setupEventListeners(): void {

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
        console.log(`[GameController] Cleaning up for user ${this.userId}, socket ${this.socketId}`);

        // Đánh dấu không active
        this.isActive = false;

        // Dừng update loop
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Remove tất cả listeners
        this.removeEventListeners();

    }


    public removeEventListeners(): void {

    }

}