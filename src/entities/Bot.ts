import { Vector3, Obstacle, MapData } from "../types";
import { CollisionDetector } from "../utils/collisionDetector";

export class Bot {
    public id: string;
    public position: Vector3;
    public velocity: Vector3;
    public speed: number;
    public hp: number;
    public dmg: number;
    
    // Patrol behavior
    private targetPosition: Vector3 | null = null;
    private mapWidth: number;
    private mapLength: number;
    private obstacles: Obstacle[];
    
    // Bot physics
    private static readonly BOT_RADIUS = 0.5; // Bán kính collision của bot
    private static readonly BOT_HEIGHT = 1.8; // Chiều cao bot
    private static readonly ARRIVAL_THRESHOLD = 1.0; // Khoảng cách coi như đã đến target
    private static readonly AVOIDANCE_DISTANCE = 3.0; // Khoảng cách bắt đầu tránh obstacle
    private static readonly AVOIDANCE_FORCE = 2.0; // Lực tránh obstacle

    constructor(
        id: string,
        position: Vector3,
        mapData: MapData,
        speed: number = 3.0,
        hp: number = 100,
        dmg: number = 10
    ) {
        this.id = id;
        this.position = position;
        this.velocity = { x: 0, y: 0, z: 0 };
        this.speed = speed;
        this.hp = hp;
        this.dmg = dmg;
        this.mapWidth = mapData.width;
        this.mapLength = mapData.length;
        this.obstacles = mapData.obstacles;
        
        // Chọn target đầu tiên
        this.selectNewTarget();
    }

    /**
     * Update bot state based on deltaTime
     * @param deltaTime Time elapsed since last update in seconds
     */
    public update(deltaTime: number): void {
        // Get desired velocity from patrol behavior
        const desiredVelocity = this.updatePatrol();
        
        // Apply steering avoidance
        const avoidanceForce = this.calculateAvoidanceForce();
        
        // Combine desired velocity with avoidance force
        // Weighted combination: prioritize desired velocity but respect avoidance
        this.velocity.x = desiredVelocity.x + avoidanceForce.x * 0.5;
        this.velocity.z = desiredVelocity.z + avoidanceForce.z * 0.5;
        
        // Normalize velocity to maintain consistent speed
        const velocityMagnitude = Math.sqrt(
            this.velocity.x * this.velocity.x + 
            this.velocity.z * this.velocity.z
        );
        
        // Only normalize if velocity is not zero
        if (velocityMagnitude > 0.01) {
            this.velocity.x /= velocityMagnitude;
            this.velocity.z /= velocityMagnitude;
        } else {
            // If velocity too small, maintain some movement toward target
            this.velocity.x = desiredVelocity.x;
            this.velocity.z = desiredVelocity.z;
        }
        
        // Calculate new position
        const newPosition: Vector3 = {
            x: this.position.x + this.velocity.x * this.speed * deltaTime,
            y: this.position.y + this.velocity.y * this.speed * deltaTime,
            z: this.position.z + this.velocity.z * this.speed * deltaTime
        };
        
        // Check collision before moving
        const collisionResult = CollisionDetector.checkCollision(
            newPosition,
            Bot.BOT_RADIUS,
            Bot.BOT_HEIGHT,
            this.obstacles
        );
        
        // Only update position if no collision
        if (!collisionResult.hasCollision) {
            this.position = newPosition;
        } else {
            // If collision, try to select new target
            this.selectNewTarget();
        }
    }

    /**
     * Update patrol behavior
     * Returns the desired velocity toward target
     */
    private updatePatrol(): Vector3 {
        if (!this.targetPosition) {
            this.selectNewTarget();
            return { x: 0, y: 0, z: 0 };
        }

        // Tính khoảng cách đến target
        const dx = this.targetPosition.x - this.position.x;
        const dz = this.targetPosition.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Nếu đã đến gần target
        if (distance <= Bot.ARRIVAL_THRESHOLD) {
            // Chọn target mới
            this.selectNewTarget();
            return { x: 0, y: 0, z: 0 };
        } else {
            // Return normalized direction toward target
            return {
                x: dx / distance,
                y: 0,
                z: dz / distance
            };
        }
    }

    /**
     * Chọn một điểm đến ngẫu nhiên trên map
     * Đảm bảo điểm đến không nằm trong obstacle
     */
    private selectNewTarget(): void {
        const margin = 5; // Khoảng cách từ biên map
        const maxAttempts = 10; // Số lần thử tìm vị trí hợp lệ
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const candidateTarget: Vector3 = {
                x: (Math.random() - 0.5) * (this.mapWidth - margin * 2),
                y: 0,
                z: (Math.random() - 0.5) * (this.mapLength - margin * 2)
            };
            
            // Check if target position is valid (no collision)
            const collisionResult = CollisionDetector.checkCollision(
                candidateTarget,
                Bot.BOT_RADIUS,
                Bot.BOT_HEIGHT,
                this.obstacles
            );
            
            if (!collisionResult.hasCollision) {
                this.targetPosition = candidateTarget;
                return;
            }
        }
        
        // Fallback: nếu không tìm được vị trí hợp lệ, chọn vị trí gần nhất
        this.targetPosition = {
            x: (Math.random() - 0.5) * (this.mapWidth - margin * 2),
            y: 0,
            z: (Math.random() - 0.5) * (this.mapLength - margin * 2)
        };
    }

    /**
     * Calculate steering avoidance force to avoid obstacles
     * Only apply force for obstacles in front of the bot's movement direction
     */
    private calculateAvoidanceForce(): Vector3 {
        const avoidanceForce: Vector3 = { x: 0, y: 0, z: 0 };
        
        // Get current movement direction
        const velocityMag = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (velocityMag < 0.01) {
            return avoidanceForce; // Not moving, no avoidance needed
        }
        
        const moveDir = {
            x: this.velocity.x / velocityMag,
            z: this.velocity.z / velocityMag
        };
        
        for (const obstacle of this.obstacles) {
            // Vector from bot to obstacle
            const toObstacle = {
                x: obstacle.position.x - this.position.x,
                z: obstacle.position.z - this.position.z
            };
            
            const distanceToObstacle = Math.sqrt(toObstacle.x * toObstacle.x + toObstacle.z * toObstacle.z);
            
            if (distanceToObstacle < 0.01) continue;
            
            // Normalize direction to obstacle
            const dirToObstacle = {
                x: toObstacle.x / distanceToObstacle,
                z: toObstacle.z / distanceToObstacle
            };
            
            // Check if obstacle is in front of bot (dot product > 0)
            const dotProduct = moveDir.x * dirToObstacle.x + moveDir.z * dirToObstacle.z;
            
            // Only avoid obstacles in front (within 90 degree cone)
            if (dotProduct > 0) {
                // Get obstacle radius (approximate)
                const obstacleRadius = Math.max(obstacle.size.x, obstacle.size.z) / 2;
                const effectiveDistance = distanceToObstacle - obstacleRadius;
                
                // If within avoidance distance, apply repulsion force
                if (effectiveDistance < Bot.AVOIDANCE_DISTANCE && effectiveDistance > 0) {
                    // Calculate repulsion strength (stronger when closer and more aligned)
                    const distanceStrength = (Bot.AVOIDANCE_DISTANCE - effectiveDistance) / Bot.AVOIDANCE_DISTANCE;
                    const alignmentStrength = dotProduct; // 0 to 1 based on alignment
                    const strength = distanceStrength * alignmentStrength;
                    const force = strength * Bot.AVOIDANCE_FORCE;
                    
                    // Direction away from obstacle
                    const awayX = -dirToObstacle.x;
                    const awayZ = -dirToObstacle.z;
                    
                    avoidanceForce.x += awayX * force;
                    avoidanceForce.z += awayZ * force;
                }
            }
        }
        
        return avoidanceForce;
    }

    /**
     * Set velocity for the bot
     */
    public setVelocity(velocity: Vector3): void {
        this.velocity = velocity;
    }

    /**
     * Take damage
     */
    public takeDamage(damage: number): void {
        this.hp = Math.max(0, this.hp - damage);
    }

    /**
     * Check if bot is alive
     */
    public isAlive(): boolean {
        return this.hp > 0;
    }

    /**
     * Reset bot to initial state
     */
    public reset(position?: Vector3): void {
        if (position) {
            this.position = position;
        }
        this.velocity = { x: 0, y: 0, z: 0 };
        this.hp = 100;
    }
}
