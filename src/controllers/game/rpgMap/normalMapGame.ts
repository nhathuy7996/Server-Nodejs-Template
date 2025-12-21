import { Server } from "socket.io";
import { GameController } from "../GameController";
import { AuthenticatedSocket, MapData } from "../../../types";
import { IGameController, Player, TrackablePlayerState } from "../../../types/game";
import { Vector3 } from "../../../types";
import { mapService } from "../../../services/mapService";
import { CollisionDetector } from "../../../utils/collisionDetector";
import { Bot } from "../../../entities/Bot";

export class NormalMapGame extends GameController {

    // Tốc độ broadcast tối đa (để tránh spam)
    private static readonly MAX_BROADCAST_RATE = 20; // 20 FPS
    private static readonly MIN_BROADCAST_INTERVAL = 1000 / NormalMapGame.MAX_BROADCAST_RATE; // 50ms
    private lastBroadcastTime: number = 0;

    // Map data
    private mapData: MapData;
    
    // Bots list
    private bots: Bot[] = [];
    
    // Player collision settings
    private static readonly PLAYER_RADIUS = 0.5; // Bán kính collision của player
    private static readonly PLAYER_HEIGHT = 1.8; // Chiều cao player

    constructor(io: Server, mapId: string = 'training_ground') {
        super(io, mapId);
        this.lastBroadcastTime = Date.now();
        
        // Load map data
        const map = mapService.getMap(mapId);
        if (!map) {
            throw new Error(`Map ${mapId} not found`);
        }
        this.mapData = map;
        console.log(`[NormalMapGame] Initialized with map: ${this.mapData.name} (${this.mapData.obstacles.length} obstacles)`);
        
        // Spawn initial bots
        this.spawnBots();
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

        // Set spawn position từ map
        const spawnPoint = mapService.getRandomSpawnPoint(this.mapData.id);
        if (spawnPoint) {
            newPlayer.position = spawnPoint;
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
            players: existingPlayers,
            mapData: this.mapData // Gửi map data cho client
        });

        // Gửi thông tin về các bots hiện tại cho player mới
        const botsData = this.bots.map(bot => ({
            id: bot.id,
            position: bot.position,
            velocity: bot.velocity,
            hp: bot.hp,
            dmg: bot.dmg,
            speed: bot.speed
        }));

        socket.emit('server:botsSpawned', {
            bots: botsData
        });

        // Thông báo cho tất cả các client khác về player mới
        socket.broadcast.to(this.gameId).emit('server:playerSpawned', {
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
            socket.broadcast.to(this.gameId).emit('server:playerLeft', {
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

        // Update all bots
        this.updateBots(deltaTime);

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
        
        // Broadcast bot states
        this.broadcastBotStates();
    }

    /**
     * Update all bots
     */
    private updateBots(deltaTime: number): void {
        for (const bot of this.bots) {
            bot.update(deltaTime);
        }
    }

    /**
     * Spawn initial bots when game starts
     */
    private spawnBots(): void {
        const botCount = 3;
        
        for (let i = 0; i < botCount; i++) {
            const spawnPosition = this.getRandomPositionOnMap();
            const bot = new Bot(
                `bot_${i + 1}`,
                spawnPosition,
                this.mapData, // Truyền mapData vào bot
                3.0, // speed
                100, // hp
                10 // dmg
            );
            
            this.bots.push(bot);
            console.log(`[NormalMapGame] Spawned ${bot.id} at position (${spawnPosition.x.toFixed(2)}, ${spawnPosition.z.toFixed(2)})`);
        }
        
        console.log(`[NormalMapGame] Spawned ${botCount} bots`);
    }

    /**
     * Get random position on map (avoiding map edges)
     */
    private getRandomPositionOnMap(): Vector3 {
        const margin = 10; // Khoảng cách từ biên
        
        return {
            x: (Math.random() - 0.5) * (this.mapData.width - margin * 2),
            y: 0,
            z: (Math.random() - 0.5) * (this.mapData.length - margin * 2)
        };
    }

    /**
     * Cập nhật vị trí của tất cả players dựa trên velocity
     */
    private updatePlayerMovement(deltaTime: number): void {
        for (const player of this.players.values()) {
            // Nếu player có velocity, tính toán position mới
            if (player.velocity.x !== 0 || player.velocity.y !== 0 || player.velocity.z !== 0) {
                // Tính position mới
                const newPosition: Vector3 = {
                    x: player.position.x + player.velocity.x * player.speed * deltaTime,
                    y: player.position.y + player.velocity.y * player.speed * deltaTime,
                    z: player.position.z + player.velocity.z * player.speed * deltaTime
                };

                // Kiểm tra map bounds
                if (!CollisionDetector.isInMapBounds(newPosition, this.mapData.width, this.mapData.length)) {
                    // Clamp vào trong map
                    newPosition.x = Math.max(-this.mapData.width / 2, Math.min(this.mapData.width / 2, newPosition.x));
                    newPosition.z = Math.max(-this.mapData.length / 2, Math.min(this.mapData.length / 2, newPosition.z));
                }

                // Kiểm tra collision với obstacles
                const collisionResult = CollisionDetector.checkCollision(
                    newPosition,
                    NormalMapGame.PLAYER_RADIUS,
                    NormalMapGame.PLAYER_HEIGHT,
                    this.mapData.obstacles
                );

                // Nếu không có collision, cập nhật position
                if (!collisionResult.hasCollision) {
                    player.position = newPosition;
                    
                    // Mark position as dirty để broadcast
                    player.dirtyState.position = player.position;
                    player.dirtyState.velocity = player.velocity;
                } else {
                    // Có collision - không di chuyển, có thể thông báo client
                    // console.log(`[NormalMapGame] Player ${player.id} collided with ${collisionResult.obstacle?.id}`);
                }
            }
        }
    }

    /**
     * Broadcast trạng thái của tất cả players
     * Gửi dirty states với đầy đủ position để client có thể correct
     */
    private broadcastPlayerStates(): void {
        if (this.players.size === 0) return;

        const currentTime = Date.now();

        // Gửi dirty states (những players có thay đổi)
        const dirtyPlayerStates = Array.from(this.players.values())
            .filter(player => Object.keys(player.dirtyState).length > 0)
            .map(player => {
                player.sequenceNumber++;
                player.lastSyncTime = currentTime;
                
                return {
                    id: player.id,
                    ...player.dirtyState,
                    timestamp: currentTime,
                    sequenceNumber: player.sequenceNumber
                };
            });

        // Chỉ broadcast nếu có thay đổi
        if (dirtyPlayerStates.length > 0) {
            this.io.to(this.gameId).emit('server:playersUpdate', {
                players: dirtyPlayerStates,
                timestamp: currentTime
            });

            // Reset dirty state sau khi broadcast
            dirtyPlayerStates.forEach(state => {
                const player = this.players.get(state.id);
                if (player) {
                    player.dirtyState = {};
                }
            });
        }
    }

    /**
     * Broadcast trạng thái của tất cả bots
     */
    private broadcastBotStates(): void {
        if (this.bots.length === 0) return;

        const currentTime = Date.now();

        // Gửi trạng thái của tất cả bots
        const botStates = this.bots.map(bot => ({
            id: bot.id,
            position: bot.position,
            velocity: bot.velocity,
            hp: bot.hp
        }));

        this.io.to(this.gameId).emit('server:botsUpdate', {
            bots: botStates,
            timestamp: currentTime
        });
    }
}