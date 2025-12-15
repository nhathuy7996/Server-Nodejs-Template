import { Server } from "socket.io";
import { GameController } from "../GameController";
import { AuthenticatedSocket } from "../../../types";

export class NormalMapController extends GameController  {
    constructor(io: Server) {
        console.log("Creating NormalMapController");
        super(io);
    }

    override async playerJoin(socket: any) {
        console.log(`Player ${socket.id} is joining NormalMapController`);
        await super.playerJoin(socket);
       

        return this;
    }


    override setupEventListeners(socket: AuthenticatedSocket): void {
        console.log(`Setting up event listeners for NormalMapController for socket: ${socket.id}`);
        super.setupEventListeners(socket);

        socket.on('player_velocity', (data) => {
          
            let dataParse = JSON.parse(data);
            const player = this.players.find(p => p.socket.id === socket.id);
            player!.velocity = dataParse;

            console.log(`Updated velocity for player ${socket.id}:`, player!.velocity);
        });
    }
    


}