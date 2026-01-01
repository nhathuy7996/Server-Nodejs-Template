/**
 * Collision Detection Utility
 * Xử lý việc kiểm tra va chạm giữa player và obstacles
 */
import fs from 'fs';
import path from 'path';
import { Obstacle, ObstacleShape, CollisionResult, BoundingBox, MapData } from '../types/map';
import { Vector3 } from '../types';

export class CollisionDetector {

    private static mapsDirectory = path.join(__dirname, '../../maps');
    
    public static loadMap(nameMap: string){
        const filePath = path.join(this.mapsDirectory, `${nameMap}.json`);
        console.log(`[MapLoader] Loading map from: ${filePath}`);
                
        const jsonData = fs.readFileSync(filePath, 'utf8');
        const mapData: MapData = JSON.parse(jsonData); 

        console.log(`[MapLoader] Loaded map: ${mapData.name} (ID: ${mapData.id})`);
        return mapData;
    }

    /**
     * Kiểm tra va chạm giữa player và tất cả obstacles trên map
     * @param playerPosition Vị trí player muốn di chuyển đến
     * @param playerRadius Bán kính collision của player (dạng cylinder/capsule)
     * @param playerHeight Chiều cao của player
     * @param obstacles Danh sách obstacles trên map
     * @returns CollisionResult chứa thông tin về va chạm
     */
    public static checkCollision(
        playerPosition: Vector3,
        playerRadius: number,
        playerHeight: number,
        obstacles: Obstacle[]
    ): CollisionResult {
        for (const obstacle of obstacles) {
            let hasCollision = false;

            if (obstacle.shape === ObstacleShape.BOX) {
                hasCollision = this.checkPlayerVsBox(
                    playerPosition,
                    playerRadius,
                    playerHeight,
                    obstacle
                );
            } else if (obstacle.shape === ObstacleShape.CYLINDER) {
                hasCollision = this.checkPlayerVsCylinder(
                    playerPosition,
                    playerRadius,
                    playerHeight,
                    obstacle
                );
            }

            if (hasCollision) {
                return {
                    hasCollision: true,
                    obstacle: obstacle
                };
            }
        }

        return { hasCollision: false };
    }

    /**
     * Kiểm tra va chạm giữa player (cylinder) và box obstacle
     */
    private static checkPlayerVsBox(
        playerPos: Vector3,
        playerRadius: number,
        playerHeight: number,
        obstacle: Obstacle
    ): boolean {
        // Tính bounding box của obstacle
        const obstacleBox = this.getObstacleBoundingBox(obstacle);

        // Kiểm tra overlap trên trục Y (chiều cao)
        const playerBottom = playerPos.y;
        const playerTop = playerPos.y + playerHeight;
        
        if (playerTop < obstacleBox.min.y || playerBottom > obstacleBox.max.y) {
            return false; // Không va chạm theo chiều cao
        }

        // Kiểm tra va chạm 2D trên mặt phẳng XZ
        // Tìm điểm gần nhất trên box với player position
        const closestX = Math.max(obstacleBox.min.x, Math.min(playerPos.x, obstacleBox.max.x));
        const closestZ = Math.max(obstacleBox.min.z, Math.min(playerPos.z, obstacleBox.max.z));

        // Tính khoảng cách từ player đến điểm gần nhất
        const distanceX = playerPos.x - closestX;
        const distanceZ = playerPos.z - closestZ;
        const distanceSquared = distanceX * distanceX + distanceZ * distanceZ;

        // Va chạm nếu khoảng cách nhỏ hơn bán kính player
        return distanceSquared < (playerRadius * playerRadius);
    }

    /**
     * Kiểm tra va chạm giữa player (cylinder) và cylinder obstacle
     */
    private static checkPlayerVsCylinder(
        playerPos: Vector3,
        playerRadius: number,
        playerHeight: number,
        obstacle: Obstacle
    ): boolean {
        const obstacleRadius = obstacle.size.x; // Bán kính cylinder là size.x
        const obstacleHeight = obstacle.size.y;

        // Kiểm tra overlap trên trục Y
        const playerBottom = playerPos.y;
        const playerTop = playerPos.y + playerHeight;
        const obstacleBottom = obstacle.position.y - obstacleHeight / 2;
        const obstacleTop = obstacle.position.y + obstacleHeight / 2;

        if (playerTop < obstacleBottom || playerBottom > obstacleTop) {
            return false; // Không va chạm theo chiều cao
        }

        // Kiểm tra va chạm 2D giữa 2 circles trên mặt phẳng XZ
        const distanceX = playerPos.x - obstacle.position.x;
        const distanceZ = playerPos.z - obstacle.position.z;
        const distanceSquared = distanceX * distanceX + distanceZ * distanceZ;
        const minDistance = playerRadius + obstacleRadius;

        return distanceSquared < (minDistance * minDistance);
    }

    /**
     * Tính bounding box của obstacle
     */
    private static getObstacleBoundingBox(obstacle: Obstacle): BoundingBox {
        const halfSize = {
            x: obstacle.size.x / 2,
            y: obstacle.size.y / 2,
            z: obstacle.size.z / 2
        };

        return {
            min: {
                x: obstacle.position.x - halfSize.x,
                y: obstacle.position.y - halfSize.y,
                z: obstacle.position.z - halfSize.z
            },
            max: {
                x: obstacle.position.x + halfSize.x,
                y: obstacle.position.y + halfSize.y,
                z: obstacle.position.z + halfSize.z
            }
        };
    }

    /**
     * Kiểm tra xem position có nằm trong giới hạn map không
     */
    public static isInMapBounds(
        position: Vector3,
        mapWidth: number,
        mapLength: number
    ): boolean {
        const halfWidth = mapWidth / 2;
        const halfLength = mapLength / 2;

        return position.x >= -halfWidth && position.x <= halfWidth &&
               position.z >= -halfLength && position.z <= halfLength;
    }

    /**
     * Clamp position vào trong giới hạn map
     */
    public static clampToMapBounds(
        position: Vector3,
        mapWidth: number,
        mapLength: number
    ): Vector3 {
        const halfWidth = mapWidth / 2;
        const halfLength = mapLength / 2;

        return {
            x: Math.max(-halfWidth, Math.min(halfWidth, position.x)),
            y: position.y,
            z: Math.max(-halfLength, Math.min(halfLength, position.z))
        };
    }
}
