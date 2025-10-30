// Game-related types
import { AuthenticatedSocket, Vector3 } from ".";

export enum GameType {
    NORMAL = "normal",
    WORLD_BOSS = "world_boss",
    PVP = "pvp",
    SURVIVAL = "survival"
}

export interface Player {
    id: number;
    socket: AuthenticatedSocket;
    position: Vector3;
    rotation: Vector3;
    velocity: Vector3;
    health: number;
    speed: number;
    lastUpdate?: number;
}

export interface GameRecord {
    walletId: string;
    gameType: GameType;
    timeStart: number;
    timeEnd: number;
    gameData?: any;
}

/**
 * Interface cho GameController
 * Dùng để định nghĩa các phương thức chính mà mọi game controller cần implement
 */
export interface IGameController {

    isActive: boolean;

    setupEventListeners(socket: AuthenticatedSocket): void ;

    removeEventListeners(socket: AuthenticatedSocket): void;

    playerJoin(socket: AuthenticatedSocket): Promise<IGameController>;

    playerLeave(socket: AuthenticatedSocket): Promise<IGameController>;

    updateSocket(socket: AuthenticatedSocket): Promise<IGameController>;

    /**
     * Hàm update được gọi định kỳ bởi update loop
     * Implement logic game chính ở đây (di chuyển, physics, AI, etc.)
     * @param deltaTime - Thời gian kể từ lần update trước (tính bằng giây)
     */
    update(deltaTime: number): void;

    
    /**
     * Cleanup khi player disconnect hoặc game kết thúc
     */
    
    cleanup(): void;
}

