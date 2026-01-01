// Map and Obstacle types

import { Vector3 } from ".";

/**
 * Loại hình dạng của obstacle
 */
export enum ObstacleShape {
    BOX = "box",
    CYLINDER = "cylinder"
}

/**
 * Obstacle (vật cản) trên map
 */
export interface Obstacle {
    id: string;
    shape: ObstacleShape;
    position: Vector3;
    // Kích thước cho box: width (x), height (y), depth (z)
    // Kích thước cho cylinder: radius (x), height (y), radius (z) - z giống x
    size: Vector3;
    rotation?: Vector3; // Góc quay (degrees) - optional
}

/**
 * Bounding box để kiểm tra collision
 */
export interface BoundingBox {
    min: Vector3;
    max: Vector3;
}

/**
 * Map configuration
 */
export interface MapData {
    id: string;
    name: string;
    width: number;  // Chiều rộng map (x)
    length: number; // Chiều dài map (z)
    height?: number; // Chiều cao map (y) - optional, mặc định không giới hạn
    obstacles: Obstacle[];
    spawnPoints?: Vector3[]; // Các điểm spawn cho player
}

/**
 * Collision check result
 */
export interface CollisionResult {
    hasCollision: boolean;
    obstacle?: Obstacle;
    penetrationDepth?: number;
}
