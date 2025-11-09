import { AuthenticatedSocket } from '../../types';
import { Server } from 'socket.io';
import {  Player, IGameController } from '../../types/game'; 
import { env } from 'process';
import { resolve } from 'path';
import { DirtyTracker, PlayerState } from '../../utils/DirtyTracker';
import { PerformanceMonitor } from '../../utils/PerformanceMonitor';

export class GameController implements IGameController {


    // Tốc độ cập nhật vị trí (lần/giây)
    private static readonly UPDATE_RATE = 60; // 60 FPS
    private static readonly UPDATE_INTERVAL = 1000 / GameController.UPDATE_RATE; // ~16.67ms
    
    // Tốc độ broadcast tối đa (để tránh spam)
    private static readonly MAX_BROADCAST_RATE = 20; // 20 FPS
    private static readonly MIN_BROADCAST_INTERVAL = 1000 / GameController.MAX_BROADCAST_RATE; // 50ms

     
    protected startTime: number;
    isActive: boolean = false; 
    protected io: Server; 
    
    private updateInterval: NodeJS.Timeout | null = null;

    // Thông tin player
    protected players: Player[] = [];

    // Thời điểm cập nhật cuối cùng
    private lastUpdateTime: number;

    // Performance monitoring
    protected performanceMonitor: PerformanceMonitor;
    private lastStatsLogTime: number = 0;
    private static readonly STATS_LOG_INTERVAL = 60000; // Log every minute

    constructor( io: Server) {
        
        this.io = io;
        
         
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.performanceMonitor = PerformanceMonitor.getInstance();
    }
    async playerJoin(socket: AuthenticatedSocket): Promise<IGameController> {
        const initialState: PlayerState = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            health: 100,
            speed: 1,
        };

        const player: Player = {
            id: this.players.length + 1,
            socket: socket,
            position: initialState.position,
            rotation: initialState.rotation,
            velocity: initialState.velocity,
            health: initialState.health,
            speed: initialState.speed,
            dirtyTracker: new DirtyTracker(initialState),
            lastBroadcastTime: Date.now(),
        };
        
        this.setupEventListeners(player.socket);
        this.players.push(player);

        if(!this.updateInterval){
          this.startUpdateLoop();
        }

        if(!this.isActive)
            this.isActive = true;

        return Promise.resolve(this);
    }

    playerLeave(socket: AuthenticatedSocket): Promise<IGameController> {
        const player = this.players.find(p => p.socket.userId === socket.userId);
        if(!player)
            return Promise.resolve(this);

        this.removeEventListeners(player.socket);

        this.players = this.players.filter(p => p.socket.userId !== socket.userId);
        if(this.players.length == 0){
            this.cleanup();
        }
       
        return Promise.resolve(this);
    }

    public updateSocket(socket: AuthenticatedSocket): Promise<IGameController> {

        const player = this.players.find(p => p.socket.userId === socket.userId);
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
        // Broadcast changes to all clients
        this.broadcastPlayerUpdates();
    }

    /**
     * Cập nhật state của player và đánh dấu dirty fields
     */
    protected updatePlayerState(playerId: number, newState: Partial<PlayerState>): void {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.dirtyTracker) return;

        // Cập nhật dirty tracker
        player.dirtyTracker.updateState(newState);

        // Cập nhật actual player properties
        if (newState.position) player.position = { ...newState.position };
        if (newState.rotation) player.rotation = { ...newState.rotation };
        if (newState.velocity) player.velocity = { ...newState.velocity };
        if (newState.health !== undefined) player.health = newState.health;
        if (newState.speed !== undefined) player.speed = newState.speed;
    }

    /**
     * Broadcast chỉ những thay đổi cần thiết đến tất cả client
     */
    protected broadcastPlayerUpdates(): void {
        const currentTime = Date.now();
        const updates: any[] = [];
        let totalPlayersProcessed = 0;

        // Collect all dirty changes từ tất cả players
        for (const player of this.players) {
            if (!player.dirtyTracker) continue;

            totalPlayersProcessed++;

            // Kiểm tra rate limiting
            const timeSinceLastBroadcast = currentTime - (player.lastBroadcastTime || 0);
            if (timeSinceLastBroadcast < GameController.MIN_BROADCAST_INTERVAL) {
                // Record update without dirty fields (saved bandwidth)
                this.performanceMonitor.recordUpdate(false, 0);
                continue;
            }

            // Chỉ broadcast nếu có thay đổi
            if (player.dirtyTracker.hasDirtyFields()) {
                const changedData = player.dirtyTracker.getChangedData();
                updates.push({
                    id: player.id,
                    ...changedData,
                    timestamp: currentTime
                });

                // Estimate data size for monitoring
                const dataSize = JSON.stringify(updates[updates.length - 1]).length;
                this.performanceMonitor.recordUpdate(true, dataSize);

                // Clear dirty fields và update broadcast time
                player.dirtyTracker.clearDirtyFields();
                player.lastBroadcastTime = currentTime;
            } else {
                // No changes, record saved bandwidth
                this.performanceMonitor.recordUpdate(false, 0);
            }
        }

        // Broadcast nếu có updates
        if (updates.length > 0) {
            
            for(let p of this.players){
                p.socket.emit('game:playerUpdates', updates);
            }
        }

        // Log performance stats periodically
        if (currentTime - this.lastStatsLogTime > GameController.STATS_LOG_INTERVAL) {
            this.performanceMonitor.logSummary();
            this.lastStatsLogTime = currentTime;
        }
    }

    /**
     * Broadcast toàn bộ state của tất cả players (dùng khi player mới join)
     */
    protected broadcastAllPlayersState(targetSocket?: AuthenticatedSocket): void {
        const playersData = this.players.map(player => ({
            id: player.id,
            position: player.position,
            rotation: player.rotation,
            velocity: player.velocity,
            health: player.health,
            speed: player.speed,
            timestamp: Date.now()
        }));

        const event = 'game:allPlayersState';
        if (targetSocket) {
            targetSocket.emit(event, { players: playersData });
        } else {
            this.io.emit(event, { players: playersData });
        }
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