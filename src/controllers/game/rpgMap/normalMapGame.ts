import { Server } from "socket.io";
import { GameController } from "../GameController";
import { AuthenticatedSocket } from "../../../types";
import { IGameController } from "../../../types/game";

export class NormalMapGame extends GameController {
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
        
        // Gửi toàn bộ state của tất cả players cho player mới join
        setTimeout(() => {
            this.broadcastAllPlayersState(socket);
        }, 100); // Delay nhỏ để đảm bảo socket đã sẵn sàng
        
        return result;
    }

    /**
     * Xử lý khi client request sync lại toàn bộ state
     */
    private onPlayerRequestSync(socket: AuthenticatedSocket): void {
        this.broadcastAllPlayersState(socket);
    }

    onPlayerMove(socket: AuthenticatedSocket, data: string): void {
        
        const player = this.players.find(p => p.socket.userId === socket.userId);
        if (!player) return;

        try {
            const parsedData = JSON.parse(data);
            
            // Sử dụng updatePlayerState để tự động trigger dirty tracking
            this.updatePlayerState(player.id, {
                position: parsedData.position,
                rotation: parsedData.rotation,
                velocity: parsedData.velocity
            });
            // Optional: Validate movement (anti-cheat)
            //this.validatePlayerMovement(player, parsedData);
            
        } catch (error) {
            console.error('[NormalMapGame] Error parsing player move data:', error);
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