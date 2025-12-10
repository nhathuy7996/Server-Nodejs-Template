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
            position: newPlayer.position, // Gửi position ban đầu cho player mới
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

        // Lắng nghe sự kiện cập nhật velocity từ client
        socket.on('client:updateVelocity', (data) => {
            this.handlePlayerUpdateVelocity(socket, data);
        });
    }

    /**
     * Remove event listeners
     */
    public removeEventListeners(socket: AuthenticatedSocket): void {
        super.removeEventListeners(socket); 
        socket.removeAllListeners('client:updateVelocity');
    }

    /**
     * Xử lý cập nhật velocity player từ client
     * Server sẽ tính toán position dựa trên velocity
     */
    private handlePlayerUpdateVelocity(socket: AuthenticatedSocket, data: any): void {
       
        const player = Array.from(this.players.values()).find(p => p.socket.id === socket.id);
        if (!player) {
            console.log('[NormalMapGame] Player not found for velocity update');
            return;
        }

        try {
            const velocityData = typeof data === 'string' ? JSON.parse(data) : data;
            
            if (velocityData.velocity) {
                player.velocity = {
                    x: velocityData.velocity.x || 0,
                    y: velocityData.velocity.y || 0,
                    z: velocityData.velocity.z || 0
                };
                // Không mark dirty velocity ngay, sẽ đợi update loop tính position
            }

        } catch (error) {
            console.error('[NormalMapGame] Error parsing velocity data:', error);
        }
    }

    /**
     * Update loop - tính toán movement và broadcast player states
     */
    public update(deltaTime: number): void {
        super.update(deltaTime);

        // Tính toán position của tất cả players dựa trên velocity
        this.updatePlayerMovement(deltaTime);

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
     * Cập nhật vị trí của tất cả players dựa trên velocity
     */
    private updatePlayerMovement(deltaTime: number): void {
        for (const player of this.players.values()) {
            // Nếu player có velocity, tính toán position mới
            if (player.velocity.x !== 0 || player.velocity.y !== 0 || player.velocity.z !== 0) {
                // Công thức: newPosition = currentPosition + velocity * speed * deltaTime
                player.position.x += player.velocity.x * player.speed * deltaTime;
                player.position.y += player.velocity.y * player.speed * deltaTime;
                player.position.z += player.velocity.z * player.speed * deltaTime;

                // Mark position as dirty để broadcast
                player.dirtyState.position = player.position;
                player.dirtyState.velocity = player.velocity;
            }
        }
    }

    /**
     * Broadcast trạng thái của tất cả players
     * Chỉ gửi những trường bị thay đổi (dirty fields)
     */
    private broadcastPlayerStates(): void {
        if (this.players.size === 0) return;

        // Tạo danh sách chỉ chứa các fields đã thay đổi
        const dirtyPlayerStates = Array.from(this.players.values())
            .filter(player => Object.keys(player.dirtyState).length > 0) // Chỉ lấy players có dirty state
            .map(player => ({
                id: player.id,
                ...player.dirtyState // Spread chỉ những fields dirty
            }));

        // Chỉ broadcast nếu có thay đổi
        if (dirtyPlayerStates.length > 0) {
            this.io.emit('server:playersUpdate', {
                players: dirtyPlayerStates
            });

            // Reset dirty state sau khi broadcast
            dirtyPlayerStates.forEach(state => {
                const player = this.players.get(state.id);
                if (player) {
                    player.dirtyState = {}; // Reset về empty object
                }
            });

            // Debug log (comment out sau khi test)
            // console.log(`[NormalMapGame] Broadcast ${dirtyPlayerStates.length} dirty players`);
        }
    }
}