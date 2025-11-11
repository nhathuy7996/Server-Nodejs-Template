import { Server } from "socket.io";
import { GameController } from "../GameController";
import { AuthenticatedSocket } from "../../../types";
import { IGameController, Player, TrackablePlayerState } from "../../../types/game";

export class NormalMapGame extends GameController {

    // Tốc độ broadcast tối đa (để tránh spam)
    private static readonly MAX_BROADCAST_RATE = 60; // 20 FPS
    private static readonly MIN_BROADCAST_INTERVAL = 1000 / NormalMapGame.MAX_BROADCAST_RATE; // 50ms
    

    constructor(io: Server) {
        super(io);
    }

    override setupEventListeners(socket: AuthenticatedSocket): void {
        super.setupEventListeners(socket);
        socket.on('player:onMove', (data) => this.onPlayerMove(socket, data));
        socket.on('player:requestSync', () => this.onPlayerRequestSync(socket));
    }

    override async playerJoin(socket: AuthenticatedSocket): Promise<IGameController> {
        const result = await super.playerJoin(socket);
        
        const player = Array.from(this.players.values()).find(p => p.socket.userId === socket.userId);
        if (!player) {
            console.error(`[NormalMapGame] playerJoin: Player not found after join (userId: ${socket.userId})`);
            return result;
        }

        // Gửi toàn bộ state của tất cả players cho player mới join
        setTimeout(() => {
            console.log(`[NormalMapGame] Sending all players state to player ${player.id}`);
            player.socket.emit('game:joined', { playerId: player.id });
            this.broadcastAllPlayersState(socket);

            this.players.forEach(p => {
                p.socket.emit('game:playerJoined', { playerId: player.id });
            });
        }, 100); // Delay nhỏ để đảm bảo socket đã sẵn sàng
        
        return result;
    }

    override playerLeave(socket: AuthenticatedSocket): Player | null  {
        const result = super.playerLeave(socket);
       
        if(result!== null)
            this.players.forEach(p => {
                p.socket.emit('game:playerLeft', { playerId: result!.id });
            });
 
        return result;
    }

    /**
     * Xử lý khi client request sync lại toàn bộ state
     */
    private onPlayerRequestSync(socket: AuthenticatedSocket): void {
        this.broadcastAllPlayersState(socket);
    }

    onPlayerMove(socket: AuthenticatedSocket, data: string): void {
        
        const player = Array.from(this.players.values()).find(p => p.socket.userId === socket.userId);
        if (!player) return;

        try {
            const parsedData = JSON.parse(data);
            let newUpdates: Partial<TrackablePlayerState> = {};
            for (const key in parsedData) {
                 newUpdates[key as keyof TrackablePlayerState] = parsedData[key];
            }
            // Sử dụng updatePlayerState để tự động trigger dirty tracking
            this.updatePlayerState(player.id, newUpdates);
            // Optional: Validate movement (anti-cheat)
            //this.validatePlayerMovement(player, parsedData);
            
        } catch (error) {
            console.error('[NormalMapGame] Error parsing player move data:', error);
        }
    }

    override update(deltaTime: number): void {
       this.broadcastPlayerUpdates();
    }

      /**
     * Cập nhật state của player và đánh dấu dirty fields
     */
    protected updatePlayerState(playerId: number, newState: Partial<TrackablePlayerState>): void {
        const player = this.players.get(playerId);
        if (!player || !player.dirtyTracker) return;

        // Cập nhật dirty tracker
        player.dirtyTracker.updateState(newState);

        // Cập nhật actual player properties
        if (newState.position) player.position = { ...newState.position }; 
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

        // Collect all dirty changes từ tất cả players
        for (const player of this.players) {
            if (!player[1].dirtyTracker) continue; 

            // Kiểm tra rate limiting
            const timeSinceLastBroadcast = currentTime - (player[1].lastBroadcastTime || 0);
            if (timeSinceLastBroadcast < NormalMapGame.MIN_BROADCAST_INTERVAL) {
                // Record update without dirty fields (saved bandwidth) 
                continue;
            }

            // Chỉ broadcast nếu có thay đổi
            if (player[1].dirtyTracker.hasDirtyFields()) {
                const changedData = player[1].dirtyTracker.getChangedData();
                updates.push({
                    id: player[0],
                    ...changedData,
                    timestamp: currentTime
                });

                // Clear dirty fields và update broadcast time
                player[1].dirtyTracker.clearDirtyFields();
                player[1].lastBroadcastTime = currentTime;
            }  
        }

        // Broadcast nếu có updates
        if (updates.length > 0) {
             
            for(let p of this.players){
                p[1].socket.emit('game:playerUpdates', updates);
            }
        }

    }

    /**
     * Broadcast toàn bộ state của tất cả players (dùng khi player mới join)
     */
    protected broadcastAllPlayersState(targetSocket?: AuthenticatedSocket): void {
        const playersData = Array.from(this.players.values()).map(player => ({
            id: player.id,
            position: player.position, 
            velocity: player.velocity,
            health: player.health,
            speed: player.speed,
            timestamp: Date.now()
        }));

        const event = 'game:allPlayersState';
        if (targetSocket) {
            targetSocket.emit(event, { players: playersData });
        } else {
            console.error(`[NormalMapGame] broadcastAllPlayersState called without targetSocket`);
        }
    }

    /**
     * Validate player movement để chống hack speed, teleport, etc.
     */
    private validatePlayerMovement(player: any, moveData: any): void {
        // Implement validation logic here
        // Ví dụ: kiểm tra tốc độ di chuyển, khoảng cách tối đa, etc.
        
        // Kiểm tra tốc độ di chuyển
        const maxSpeed = player.speed * 2; // Allow some buffer
        if (moveData.velocity) {
            const speed = Math.sqrt(
                moveData.velocity.x ** 2 + 
                moveData.velocity.y ** 2 + 
                moveData.velocity.z ** 2
            );
            
            if (speed > maxSpeed) {
                console.warn(`[NormalMapGame] Player ${player.id} exceeded speed limit: ${speed} > ${maxSpeed}`);
                // Có thể disconnect hoặc reset position
            }
        }
    }
}