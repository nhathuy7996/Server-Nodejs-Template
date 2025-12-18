import { AuthenticatedSocket } from '../../types';
import { Server } from 'socket.io';
import {  Player, IGameController, TrackablePlayerState } from '../../types/game';  

export class GameController implements IGameController {

    // Tốc độ cập nhật vị trí (lần/giây)
    private static readonly UPDATE_RATE = 60; // 60 FPS
    private static readonly UPDATE_INTERVAL = 1000 / GameController.UPDATE_RATE; // ~16.67ms
    
        // Thời điểm cập nhật cuối cùng
    private lastUpdateTime: number;
     
    protected startTime: number;
    isActive: boolean = false; 
    protected io: Server; 
    
    private updateInterval: NodeJS.Timeout | null = null;

    // Thông tin player
    protected players: Map<number, Player> = new Map();
    protected lastID: number = 0; 
    gameId: string = '';


    constructor( io: Server, gameId: string = 'gameRoom') {
        
        this.io = io;
        this.gameId = gameId;
         
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now(); 
    }
    
    async playerJoin(socket: AuthenticatedSocket): Promise<IGameController> {
        const initialState: TrackablePlayerState = {
            position: { x: 0, y: 0, z: 0 }, 
            velocity: { x: 0, y: 0, z: 0 },
            health: 100,
            speed: 1,
            timestamp: Date.now()
        };

        const player: Player = {
            id: this.lastID++,
            socket: socket,
            position: initialState.position,
            velocity: initialState.velocity,
            health: initialState.health,
            speed: initialState.speed,
            dirtyState: {},
            sequenceNumber: 0,
            lastSyncTime: Date.now()
        };
        
        this.setupEventListeners(player.socket);
        this.players.set(player.id, player);
        socket.join(this.gameId);

        if(!this.updateInterval){
          this.startUpdateLoop();
        }

        if(!this.isActive)
            this.isActive = true;

        return Promise.resolve(this);
    }

    playerLeave(socket: AuthenticatedSocket): Player | null {
        const player = Array.from(this.players.values()).find(p => p.socket.userId === socket.userId);
        if(!player)
            return null;

        socket.leave(this.gameId);
        this.removeEventListeners(player.socket);

        this.players.delete(player.id);
        if(this.players.size == 0){
            this.cleanup();
        }
       
        return player;
    }

    public updateSocket(socket: AuthenticatedSocket): Promise<IGameController> {

        const player = Array.from(this.players.values()).find(p => p.socket.userId === socket.userId);
        if(!player)
            return Promise.resolve(this);

        this.removeEventListeners(player.socket);
        
        // Cập nhật socket mới
        player.socket = socket;
        
        // Setup lại listeners trên socket mới
        this.setupEventListeners(player.socket);
        
        console.log(`[GameController] Socket updated successfully`);
        return Promise.resolve(this);
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
        for(const item of this.players){
            this.removeEventListeners(item[1].socket);
        }
    }


    public removeEventListeners(socket: AuthenticatedSocket): void {
        
    }

}