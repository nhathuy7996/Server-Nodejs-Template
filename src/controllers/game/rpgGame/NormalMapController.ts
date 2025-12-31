import { Server } from "socket.io";
import { GameController } from "../GameController";
import { AuthenticatedSocket } from "../../../types";
import { TrackaleDataPlayer } from "../../../types/game";

export class NormalMapController extends GameController  {
    constructor(io: Server) {
        console.log("Creating NormalMapController");
        super(io);
    }

    override async playerJoin(socket: any) {
        console.log(`Player ${socket.id} is joining NormalMapController`);
        await super.playerJoin(socket);
       
       
        let newPlayer = this.players.find(p => p.socket.id === socket.id);
        let newPlayerID = newPlayer?.id;
        newPlayer!.currenState.position = { x: Math.random() * 10, y: 0, z: Math.random() * 10 };

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
            player.currenState.position.x += player.currenState.velocity.x * deltaTime * player.currenState.speed;
            //player.position.y += player.velocity.y * deltaTime * player.speed;
            player.currenState.position.z += player.currenState.velocity.z * deltaTime * player.currenState.speed;
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
                allDirtyStates.push({
                    id: player.id,
                    dirtyState: player.dirtyState
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
        this.io.emit('state_update', allDirtyStates);
    }

}