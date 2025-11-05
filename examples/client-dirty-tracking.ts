/**
 * Client-side example để xử lý dirty tracking events từ server
 * Đây là ví dụ cho Unity C# hoặc JavaScript client
 */

// JavaScript/TypeScript Client Example
class GameClient {
    private players: Map<number, PlayerState> = new Map();
    private socket: any; // Socket.IO client

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Nhận updates chỉ có những thay đổi
        this.socket.on('game:playerUpdates', (data: { updates: any }) => {
            this.handlePlayerUpdates(data.updates);
        });

        // Nhận toàn bộ state khi join game
        this.socket.on('game:allPlayersState', (data: { players: PlayerState[] }) => {
            this.handleAllPlayersState(data.players);
        });
    }

    /**
     * Xử lý partial updates từ dirty tracking
     */
    private handlePlayerUpdates(updates: { [playerId: number]: any }): void {
        for (const [playerIdStr, updateData] of Object.entries(updates)) {
            const playerId = parseInt(playerIdStr);
            let player = this.players.get(playerId);

            if (!player) {
                // Player chưa tồn tại, request full sync
                this.requestSync();
                continue;
            }

            // Apply partial updates
            if (updateData.position) {
                player.position = updateData.position;
                this.interpolatePlayerPosition(playerId, updateData.position);
            }

            if (updateData.rotation) {
                player.rotation = updateData.rotation;
                this.interpolatePlayerRotation(playerId, updateData.rotation);
            }

            if (updateData.velocity) {
                player.velocity = updateData.velocity;
            }

            if (updateData.health !== undefined) {
                player.health = updateData.health;
                this.updatePlayerHealthUI(playerId, updateData.health);
            }

            if (updateData.speed !== undefined) {
                player.speed = updateData.speed;
            }

            this.players.set(playerId, player);
        }
    }

    /**
     * Xử lý full state của tất cả players
     */
    private handleAllPlayersState(players: PlayerState[]): void {
        this.players.clear();
        
        for (const playerData of players) {
            this.players.set(playerData.id, playerData);
            this.renderPlayer(playerData);
        }
    }

    /**
     * Request server sync lại toàn bộ state
     */
    private requestSync(): void {
        this.socket.emit('player:requestSync');
    }

    /**
     * Gửi movement data lên server
     */
    public sendMovementUpdate(position: Vector3, rotation: Vector3, velocity: Vector3): void {
        const data = {
            position,
            rotation,
            velocity
        };
        
        this.socket.emit('player:onMove', JSON.stringify(data));
    }

    // Placeholder methods để client implement
    private interpolatePlayerPosition(playerId: number, position: Vector3): void {
        // Implement smooth position interpolation
        console.log(`Interpolating position for player ${playerId}:`, position);
    }

    private interpolatePlayerRotation(playerId: number, rotation: Vector3): void {
        // Implement smooth rotation interpolation
        console.log(`Interpolating rotation for player ${playerId}:`, rotation);
    }

    private updatePlayerHealthUI(playerId: number, health: number): void {
        // Update health bar UI
        console.log(`Updating health for player ${playerId}:`, health);
    }

    private renderPlayer(playerData: PlayerState): void {
        // Render player in game world
        console.log('Rendering player:', playerData);
    }
}

// Unity C# Client Example (pseudo-code)
/*
public class GameClient : MonoBehaviour 
{
    private Dictionary<int, PlayerState> players = new Dictionary<int, PlayerState>();
    private SocketIOComponent socket;

    void Start() 
    {
        socket.On("game:playerUpdates", OnPlayerUpdates);
        socket.On("game:allPlayersState", OnAllPlayersState);
    }

    void OnPlayerUpdates(SocketIOEvent e) 
    {
        var updates = e.data["updates"];
        
        foreach(var update in updates) 
        {
            int playerId = update["id"].i;
            
            if(players.ContainsKey(playerId)) 
            {
                var player = players[playerId];
                
                // Update only changed fields
                if(update["position"] != null) 
                {
                    player.position = JsonToVector3(update["position"]);
                    StartCoroutine(InterpolatePosition(playerId, player.position));
                }
                
                if(update["rotation"] != null) 
                {
                    player.rotation = JsonToVector3(update["rotation"]);
                    StartCoroutine(InterpolateRotation(playerId, player.rotation));
                }
                
                // ... handle other fields
                players[playerId] = player;
            }
        }
    }

    void OnAllPlayersState(SocketIOEvent e) 
    {
        var playersData = e.data["players"];
        players.Clear();
        
        foreach(var playerData in playersData) 
        {
            int playerId = playerData["id"].i;
            players[playerId] = JsonToPlayerState(playerData);
            RenderPlayer(players[playerId]);
        }
    }

    public void SendMovementUpdate(Vector3 position, Vector3 rotation, Vector3 velocity) 
    {
        var data = new Dictionary<string, object> {
            {"position", Vector3ToJson(position)},
            {"rotation", Vector3ToJson(rotation)},
            {"velocity", Vector3ToJson(velocity)}
        };
        
        socket.Emit("player:onMove", JsonConvert.SerializeObject(data));
    }
}
*/

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface PlayerState {
    id: number;
    position: Vector3;
    rotation: Vector3;
    velocity: Vector3;
    health: number;
    speed: number;
}

export { GameClient };