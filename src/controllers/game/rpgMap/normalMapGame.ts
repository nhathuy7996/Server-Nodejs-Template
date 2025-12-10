import { Server } from "socket.io";
import { GameController } from "../GameController";
import { AuthenticatedSocket } from "../../../types";
import { IGameController, Player, TrackablePlayerState } from "../../../types/game";
import { Vector3 } from "../../../types";

export class NormalMapGame extends GameController {

    // Tốc độ broadcast tối đa (để tránh spam)
    private static readonly MAX_BROADCAST_RATE = 20; // 20 FPS
    private static readonly MIN_BROADCAST_INTERVAL = 1000 / NormalMapGame.MAX_BROADCAST_RATE; // 50ms
    private lastBroadcastTime: number = 0;

    constructor(io: Server) {
        super(io);
        this.lastBroadcastTime = Date.now();
    }

    /**
     * Override playerJoin để gửi thông tin về player mới cho tất cả client
     */
    async playerJoin(socket: AuthenticatedSocket): Promise<IGameController> {
        // Gọi base class để thêm player vào game
        await super.playerJoin(socket);

        // Tìm player vừa join
        const newPlayer = Array.from(this.players.values()).find(p => p.socket.id === socket.id);
        if (!newPlayer) {
            return this;
        }

        // Gửi danh sách tất cả players hiện tại cho player mới join
        const existingPlayers = Array.from(this.players.values())
            .filter(p => p.id !== newPlayer.id)
            .map(p => ({
                id: p.id,
                position: p.position,
                velocity: p.velocity,
                health: p.health,
                speed: p.speed
            }));

        socket.emit('server:playerJoined', {
            playerId: newPlayer.id,
            players: existingPlayers
        });

        // Thông báo cho tất cả các client khác về player mới
        socket.broadcast.emit('server:playerSpawned', {
            id: newPlayer.id,
            position: newPlayer.position,
            velocity: newPlayer.velocity,
            health: newPlayer.health,
            speed: newPlayer.speed
        });

        console.log(`[NormalMapGame] Player ${newPlayer.id} joined. Total players: ${this.players.size}`);

        return this;
    }

    /**
     * Override playerLeave để thông báo cho các client khác
     */
    playerLeave(socket: AuthenticatedSocket): Player | null {
        const player = super.playerLeave(socket);
        
        if (player) {
            // Thông báo cho tất cả client khác về player đã rời đi
            socket.broadcast.emit('server:playerLeft', {
                id: player.id
            });

            console.log(`[NormalMapGame] Player ${player.id} left. Remaining players: ${this.players.size}`);
        }

        return player;
    }

    /**
     * Setup event listeners cho player movement
     */
    public setupEventListeners(socket: AuthenticatedSocket): void {
        super.setupEventListeners(socket);

        // Lắng nghe sự kiện cập nhật vị trí từ client
        socket.on('client:updatePosition', (data) => {
            this.handlePlayerUpdatePosition(socket, data);
        });
    }

    /**
     * Remove event listeners
     */
    public removeEventListeners(socket: AuthenticatedSocket): void {
        super.removeEventListeners(socket); 
        socket.removeAllListeners('client:updatePosition');
    }

    /**
     * Xử lý cập nhật vị trí player từ client
     */
    private handlePlayerUpdatePosition(socket: AuthenticatedSocket, data: any): void {
       
        const player = Array.from(this.players.values()).find(p => p.socket.id === socket.id);
        if (!player) {
            console.log('[NormalMapGame] Player not found for position update');
            return;
        }

        try {
            const posData = typeof data === 'string' ? JSON.parse(data) : data;
            console.log('[NormalMapGame] Received position update:', posData);
            
            if (posData.position) {
                player.position = {
                    x: posData.position.x || player.position.x,
                    y: posData.position.y || player.position.y,
                    z: posData.position.z || player.position.z
                };
            }

            if (posData.velocity) {
                player.velocity = {
                    x: posData.velocity.x || 0,
                    y: posData.velocity.y || 0,
                    z: posData.velocity.z || 0
                };
            }

            // Debug log (comment out sau khi test)
            // console.log(`[NormalMapGame] Player ${player.id} position updated:`, player.position);

        } catch (error) {
            console.error('[NormalMapGame] Error parsing position data:', error);
        }
    }

    /**
     * Update loop - broadcast player states đến tất cả clients
     */
    public update(deltaTime: number): void {
        super.update(deltaTime);

        const currentTime = Date.now();
        
        // Chỉ broadcast khi đủ thời gian (throttle)
        if (currentTime - this.lastBroadcastTime < NormalMapGame.MIN_BROADCAST_INTERVAL) {
            return;
        }

        this.lastBroadcastTime = currentTime;

        // Broadcast player states
        this.broadcastPlayerStates();
    }

    /**
     * Broadcast trạng thái của tất cả players
     */
    private broadcastPlayerStates(): void {
        if (this.players.size === 0) return;

        // Tạo danh sách trạng thái của tất cả players
        const playerStates = Array.from(this.players.values()).map(player => ({
            id: player.id,
            position: player.position,
            velocity: player.velocity,
            health: player.health
        }));

        // Broadcast đến tất cả clients
        this.io.emit('server:playersUpdate', {
            players: playerStates
        });

        // Debug log (comment out sau khi test)
        // console.log(`[NormalMapGame] Broadcast ${playerStates.length} players`);
    }
}