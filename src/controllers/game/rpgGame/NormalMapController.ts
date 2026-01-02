import { Server } from "socket.io";
import { GameController } from "../GameController";
import { AuthenticatedSocket } from "../../../types";
import { TrackaleDataPlayer } from "../../../types/game";
import { CollisionDetector } from "../../../utils/collisionDetector";
import { MapData } from "../../../types/map";

export class NormalMapController extends GameController  {

    private MapData: MapData | null = null;
    private PlayerRadius: number = 0.5;
    private PlayerHeight: number = 1.8;

    constructor(io: Server, mapID: string = "normal_map_01") {
        console.log("Creating NormalMapController");
        super(io);
        this.MapData = CollisionDetector.loadMap(mapID);
     
    }

    override async playerJoin(socket: any) {
        console.log(`Player ${socket.id} is joining NormalMapController`);
        await super.playerJoin(socket);
       
       
        let newPlayer = this.players.find(p => p.socket.id === socket.id);
        let newPlayerID = newPlayer?.id;
        const spawnPoints = this.MapData?.spawnPoints;
        if(spawnPoints && spawnPoints.length > 0){
            const randomIndex = Math.floor(Math.random() * spawnPoints.length);
            newPlayer!.currenState.position = spawnPoints[randomIndex];
        }

        socket.emit('server:mapData',this.MapData );
        socket.emit('server:playerJoined', { id: newPlayerID, position: newPlayer!.currenState.position } );

        socket.broadcast.emit('server:newPlayerJoined', { id: newPlayerID, position: newPlayer!.currenState.position });
        return this;
    }


    override setupEventListeners(socket: AuthenticatedSocket): void {
        console.log(`Setting up event listeners for NormalMapController for socket: ${socket.id}`);
        super.setupEventListeners(socket);

        socket.on('player_velocity', (data) => {
          
            let dataParse = JSON.parse(data);
            const player = this.players.find(p => p.socket.id === socket.id);
            player!.currenState.velocity = dataParse;
 
        });
    }

    override update(deltaTime: number): void {
        super.update(deltaTime);

        this.updatePlayerPositions(deltaTime);
        this.DefineStateChange();
        this.SyncDirtyState();

    }

    private updatePlayerPositions(deltaTime: number): void {
        this.players.forEach(player => {

            const newX = player.currenState.position.x + player.currenState.velocity.x * deltaTime * player.currenState.speed;
            //player.position.y += player.velocity.y * deltaTime * player.speed;
            const newZ = player.currenState.position.z + player.currenState.velocity.z * deltaTime * player.currenState.speed;
            const newPosition = { x: newX, y: player.currenState.position.y, z: newZ };

            const collisionResult = CollisionDetector.checkCollision(
                newPosition,
                this.PlayerRadius,
                this.PlayerHeight,
                this.MapData ? this.MapData.obstacles : []
            );

            if (!collisionResult.hasCollision) {
                player.currenState.position.x = newX;
                //player.position.y = newY;
                player.currenState.position.z = newZ;
            }
        });
    }
    
    private DefineStateChange(): void{
        this.players.forEach(player => {
            Object.keys(player.currenState).forEach((keyStr) => {
                let key = keyStr as keyof TrackaleDataPlayer;
                if(JSON.stringify(player.currenState[key]) !== JSON.stringify(player.lastSyncState[key])){
                    player.dirtyState[key] = JSON.parse(JSON.stringify(player.currenState[key]));
                }
            });
        });
    }

    private SyncDirtyState(): void{
        let allDirtyStates: any[] = [];
        this.players.forEach(player => {
            if( Object.keys(player.dirtyState).length > 0){
                player.sequenceNumber! += 1;
                allDirtyStates.push({
                    id: player.id,
                    dirtyState: player.dirtyState,
                    sequenceNumber: player.sequenceNumber
                });

                Object.keys(player.dirtyState).forEach((keyStr) => {
                    let key = keyStr as keyof TrackaleDataPlayer;
                    player.lastSyncState[key] = JSON.parse(JSON.stringify( player.currenState[key]));
                });
                player.lastSyncTime = Date.now();
                player.dirtyState = {};
            }
        });

        if(allDirtyStates.length <= 0)
            return;
        this.io.emit('server:state_update', allDirtyStates);
    }

}