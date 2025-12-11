/**
 * Collision Detection Examples
 * Minh họa cách sử dụng CollisionDetector
 */

import { CollisionDetector } from '../utils/collisionDetector';
import { Obstacle, ObstacleShape, Vector3 } from '../types';

// ============================================
// PLAYER SETTINGS
// ============================================
const PLAYER_RADIUS = 0.5;
const PLAYER_HEIGHT = 1.8;

// ============================================
// SAMPLE OBSTACLES
// ============================================

const obstacles: Obstacle[] = [
    // Box obstacle
    {
        id: 'box_1',
        shape: ObstacleShape.BOX,
        position: { x: 10, y: 1, z: 10 },
        size: { x: 4, y: 2, z: 4 }
    },
    // Cylinder obstacle
    {
        id: 'pillar_1',
        shape: ObstacleShape.CYLINDER,
        position: { x: -10, y: 2.5, z: -10 },
        size: { x: 1.5, y: 5, z: 1.5 } // radius=1.5, height=5
    },
    // Wall
    {
        id: 'wall',
        shape: ObstacleShape.BOX,
        position: { x: 0, y: 2.5, z: 20 },
        size: { x: 40, y: 5, z: 1 }
    }
];

// ============================================
// TEST CASES
// ============================================

console.log('=== COLLISION DETECTION TESTS ===\n');

// Test 1: Position không va chạm
console.log('Test 1: Safe position (0, 0, 0)');
const pos1: Vector3 = { x: 0, y: 0, z: 0 };
const result1 = CollisionDetector.checkCollision(
    pos1,
    PLAYER_RADIUS,
    PLAYER_HEIGHT,
    obstacles
);
console.log(`Has collision: ${result1.hasCollision}`);
console.log('');

// Test 2: Va chạm với box
console.log('Test 2: Collision with box at (10, 0, 10)');
const pos2: Vector3 = { x: 10, y: 0, z: 10 };
const result2 = CollisionDetector.checkCollision(
    pos2,
    PLAYER_RADIUS,
    PLAYER_HEIGHT,
    obstacles
);
console.log(`Has collision: ${result2.hasCollision}`);
if (result2.obstacle) {
    console.log(`Collided with: ${result2.obstacle.id} (${result2.obstacle.shape})`);
}
console.log('');

// Test 3: Va chạm với cylinder
console.log('Test 3: Collision with cylinder at (-10, 0, -10)');
const pos3: Vector3 = { x: -10, y: 0, z: -10 };
const result3 = CollisionDetector.checkCollision(
    pos3,
    PLAYER_RADIUS,
    PLAYER_HEIGHT,
    obstacles
);
console.log(`Has collision: ${result3.hasCollision}`);
if (result3.obstacle) {
    console.log(`Collided with: ${result3.obstacle.id} (${result3.obstacle.shape})`);
}
console.log('');

// Test 4: Gần box nhưng không chạm (edge case)
console.log('Test 4: Near box but no collision (11.5, 0, 11.5)');
const pos4: Vector3 = { x: 11.5, y: 0, z: 11.5 };
const result4 = CollisionDetector.checkCollision(
    pos4,
    PLAYER_RADIUS,
    PLAYER_HEIGHT,
    obstacles
);
console.log(`Has collision: ${result4.hasCollision}`);
console.log('');

// Test 5: Va chạm với wall
console.log('Test 5: Collision with wall at (0, 0, 19)');
const pos5: Vector3 = { x: 0, y: 0, z: 19 };
const result5 = CollisionDetector.checkCollision(
    pos5,
    PLAYER_RADIUS,
    PLAYER_HEIGHT,
    obstacles
);
console.log(`Has collision: ${result5.hasCollision}`);
if (result5.obstacle) {
    console.log(`Collided with: ${result5.obstacle.id}`);
}
console.log('');

// ============================================
// MAP BOUNDS TESTS
// ============================================

console.log('=== MAP BOUNDS TESTS ===\n');

const MAP_WIDTH = 50;
const MAP_LENGTH = 50;

// Test 6: Position trong bounds
console.log('Test 6: Position in bounds (10, 0, 15)');
const pos6: Vector3 = { x: 10, y: 0, z: 15 };
const inBounds = CollisionDetector.isInMapBounds(pos6, MAP_WIDTH, MAP_LENGTH);
console.log(`Is in bounds: ${inBounds}`);
console.log('');

// Test 7: Position ngoài bounds
console.log('Test 7: Position out of bounds (30, 0, 30)');
const pos7: Vector3 = { x: 30, y: 0, z: 30 };
const outBounds = CollisionDetector.isInMapBounds(pos7, MAP_WIDTH, MAP_LENGTH);
console.log(`Is in bounds: ${outBounds}`);
console.log('');

// Test 8: Clamp position vào bounds
console.log('Test 8: Clamp position (100, 0, -100) to bounds');
const pos8: Vector3 = { x: 100, y: 5, z: -100 };
const clamped = CollisionDetector.clampToMapBounds(pos8, MAP_WIDTH, MAP_LENGTH);
console.log(`Original: (${pos8.x}, ${pos8.y}, ${pos8.z})`);
console.log(`Clamped:  (${clamped.x}, ${clamped.y}, ${clamped.z})`);
console.log('');

// ============================================
// PRACTICAL EXAMPLE: Movement with collision
// ============================================

console.log('=== MOVEMENT SIMULATION ===\n');

function tryMove(
    currentPos: Vector3,
    velocity: Vector3,
    deltaTime: number
): { newPos: Vector3; blocked: boolean } {
    // Calculate desired position
    const desiredPos: Vector3 = {
        x: currentPos.x + velocity.x * deltaTime,
        y: currentPos.y + velocity.y * deltaTime,
        z: currentPos.z + velocity.z * deltaTime
    };

    // Check map bounds
    if (!CollisionDetector.isInMapBounds(desiredPos, MAP_WIDTH, MAP_LENGTH)) {
        console.log('  ❌ Out of bounds!');
        return {
            newPos: CollisionDetector.clampToMapBounds(desiredPos, MAP_WIDTH, MAP_LENGTH),
            blocked: true
        };
    }

    // Check collision
    const collision = CollisionDetector.checkCollision(
        desiredPos,
        PLAYER_RADIUS,
        PLAYER_HEIGHT,
        obstacles
    );

    if (collision.hasCollision) {
        console.log(`  ❌ Collision with ${collision.obstacle?.id}!`);
        return { newPos: currentPos, blocked: true }; // Stay at current position
    }

    console.log('  ✅ Move allowed');
    return { newPos: desiredPos, blocked: false };
}

// Simulate player movement
let playerPos: Vector3 = { x: 0, y: 0, z: 0 };
const speed = 5.0; // units per second
const dt = 0.1; // 100ms update

console.log('Player starts at:', playerPos);
console.log('');

// Try moving towards box
console.log('Move 1: Moving towards box (velocity: +1, 0, +1)');
const velocity1: Vector3 = { x: 1, y: 0, z: 1 };
const move1 = tryMove(playerPos, velocity1, dt * speed);
playerPos = move1.newPos;
console.log('New position:', playerPos);
console.log('');

// Try moving forward (safe direction)
console.log('Move 2: Moving forward (velocity: 0, 0, +1)');
const velocity2: Vector3 = { x: 0, y: 0, z: 1 };
const move2 = tryMove(playerPos, velocity2, dt * speed);
playerPos = move2.newPos;
console.log('New position:', playerPos);
console.log('');

// Try moving to wall
console.log('Move 3: Moving to wall (velocity: 0, 0, +1) x 50 steps');
for (let i = 0; i < 50; i++) {
    const move = tryMove(playerPos, velocity2, dt * speed);
    if (move.blocked) {
        console.log(`  Blocked at step ${i + 1}!`);
        break;
    }
    playerPos = move.newPos;
}
console.log('Final position:', playerPos);
console.log('');

console.log('=== TESTS COMPLETE ===');
