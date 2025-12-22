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
    
    // Idle behavior
    private isIdle: boolean = false;
    private idleTimer: number = 0;
    private static readonly MIN_IDLE_DURATION = 1.0; // Thời gian idle tối thiểu (giây)
    private static readonly MAX_IDLE_DURATION = 3.0; // Thời gian idle tối đa (giây)
    
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
        // Update idle state
        if (this.isIdle) {
            this.idleTimer -= deltaTime;
            if (this.idleTimer <= 0) {
                this.isIdle = false;
                this.selectNewTarget();
            }
            // Don't move while idle
            this.velocity = { x: 0, y: 0, z: 0 };
            return;
        }
        
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
            // Enter idle state
            this.startIdle();
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
     * Calculate steering avoidance force using raycast
     * Cast ray in movement direction to find nearest obstacle
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
        
        // Raycast parameters
        const rayLength = Bot.AVOIDANCE_DISTANCE;
        let nearestObstacle: Obstacle | null = null;
        let nearestDistance = rayLength;
        
        // Cast ray to find nearest obstacle in movement direction
        for (const obstacle of this.obstacles) {
            // Get obstacle center and radius
            const obstacleCenter = {
                x: obstacle.position.x,
                z: obstacle.position.z
            };
            const obstacleRadius = Math.max(obstacle.size.x, obstacle.size.z) / 2;
            
            // Vector from bot to obstacle
            const toObstacle = {
                x: obstacleCenter.x - this.position.x,
                z: obstacleCenter.z - this.position.z
            };
            
            // Project obstacle onto ray (dot product)
            const projection = toObstacle.x * moveDir.x + toObstacle.z * moveDir.z;
            
            // Skip if obstacle is behind or too far
            if (projection <= 0 || projection > rayLength) {
                continue;
            }
            
            // Find closest point on ray to obstacle center
            const closestPointOnRay = {
                x: this.position.x + moveDir.x * projection,
                z: this.position.z + moveDir.z * projection
            };
            
            // Distance from obstacle center to ray
            const distanceToRay = Math.sqrt(
                Math.pow(obstacleCenter.x - closestPointOnRay.x, 2) +
                Math.pow(obstacleCenter.z - closestPointOnRay.z, 2)
            );
            
            // Check if ray intersects with obstacle (including bot radius)
            const totalRadius = obstacleRadius + Bot.BOT_RADIUS;
            
            if (distanceToRay <= totalRadius) {
                // Calculate actual intersection distance along ray
                const intersectionOffset = Math.sqrt(
                    Math.max(0, totalRadius * totalRadius - distanceToRay * distanceToRay)
                );
                const intersectionDistance = projection - intersectionOffset;
                
                // Track nearest obstacle
                if (intersectionDistance < nearestDistance && intersectionDistance > 0) {
                    nearestDistance = intersectionDistance;
                    nearestObstacle = obstacle;
                }
            }
        }
        
        // Apply avoidance force only for nearest obstacle
        if (nearestObstacle) {
            const obstacleCenter = {
                x: nearestObstacle.position.x,
                z: nearestObstacle.position.z
            };
            
            // Direction from obstacle to bot (perpendicular avoidance)
            const toBot = {
                x: this.position.x - obstacleCenter.x,
                z: this.position.z - obstacleCenter.z
            };
            
            const toBotMag = Math.sqrt(toBot.x * toBot.x + toBot.z * toBot.z);
            
            if (toBotMag > 0.01) {
                const dirAwayFromObstacle = {
                    x: toBot.x / toBotMag,
                    z: toBot.z / toBotMag
                };
                
                // Force strength based on distance (closer = stronger)
                const distanceStrength = (rayLength - nearestDistance) / rayLength;
                const force = distanceStrength * Bot.AVOIDANCE_FORCE;
                
                // Apply perpendicular force (away from obstacle)
                avoidanceForce.x = dirAwayFromObstacle.x * force;
                avoidanceForce.z = dirAwayFromObstacle.z * force;
            }
        }
        
        return avoidanceForce;
    }

    /**
     * Start idle state with random duration
     */
    private startIdle(): void {
        this.isIdle = true;
        // Random idle duration between MIN and MAX
        const randomDuration = Bot.MIN_IDLE_DURATION + 
            Math.random() * (Bot.MAX_IDLE_DURATION - Bot.MIN_IDLE_DURATION);
        this.idleTimer = randomDuration;
        this.velocity = { x: 0, y: 0, z: 0 };
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
