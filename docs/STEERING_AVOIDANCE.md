# Steering Avoidance - Bot Navigation System

## Tổng quan

Steering avoidance là thuật toán điều hướng giúp bot tự động tránh các vật cản (obstacles) trong khi di chuyển đến mục tiêu. Hệ thống kết hợp giữa **desired velocity** (hướng đến target) và **avoidance force** (lực tránh vật cản) để tạo ra chuyển động mượt mà và tự nhiên.

## Kiến trúc

### 1. Bot Properties

```typescript
// Physics
private static readonly BOT_RADIUS = 0.5;        // Bán kính collision
private static readonly BOT_HEIGHT = 1.8;         // Chiều cao
private static readonly ARRIVAL_THRESHOLD = 1.0;  // Khoảng cách đến target

// Steering behavior
private static readonly AVOIDANCE_DISTANCE = 3.0; // Khoảng cách bắt đầu tránh
private static readonly AVOIDANCE_FORCE = 2.0;    // Độ mạnh lực tránh
```

### 2. Update Loop Flow

```
┌─────────────────────────────────────────────┐
│           Bot.update(deltaTime)             │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│   1. Get Desired Velocity (updatePatrol)    │
│      - Tính hướng đến target                │
│      - Normalized vector từ bot → target    │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│   2. Calculate Avoidance Force              │
│      - Detect obstacles in front            │
│      - Calculate repulsion forces           │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│   3. Combine Velocities                     │
│      velocity = desired + avoidance * 0.5   │
│      - Weighted combination                 │
│      - Normalize to unit vector             │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│   4. Calculate New Position                 │
│      newPos = pos + velocity * speed * dt   │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│   5. Collision Check                        │
│      - Check if newPos has collision        │
│      - If OK: update position               │
│      - If collision: select new target      │
└─────────────────────────────────────────────┘
```

## Chi tiết cơ chế

### 1. Desired Velocity (updatePatrol)

**Mục đích**: Xác định hướng bot muốn di chuyển (về phía target)

```typescript
private updatePatrol(): Vector3 {
    // Tính vector từ bot đến target
    const dx = targetPosition.x - position.x;
    const dz = targetPosition.z - position.z;
    const distance = sqrt(dx² + dz²);
    
    // Nếu đã đến target → chọn target mới
    if (distance <= ARRIVAL_THRESHOLD) {
        selectNewTarget();
        return {x: 0, z: 0};
    }
    
    // Return normalized direction (unit vector)
    return {
        x: dx / distance,
        z: dz / distance
    };
}
```

**Output**: Vector đơn vị (magnitude = 1) chỉ hướng đến target

### 2. Avoidance Force (calculateAvoidanceForce)

**Mục đích**: Tạo lực đẩy bot ra khỏi obstacles

#### 2.1. Phát hiện Obstacles

```typescript
for (const obstacle of obstacles) {
    // Vector từ bot đến obstacle
    const toObstacle = {
        x: obstacle.position.x - bot.position.x,
        z: obstacle.position.z - bot.position.z
    };
    
    const distance = sqrt(toObstacle.x² + toObstacle.z²);
}
```

#### 2.2. Front-Only Detection

**Chỉ tránh obstacles ở phía trước** để tránh bot bị đẩy ngược lại:

```typescript
// Dot product kiểm tra obstacle có ở phía trước không
const dotProduct = moveDir · dirToObstacle;

// dotProduct > 0 → obstacle ở phía trước (góc < 90°)
// dotProduct ≤ 0 → obstacle ở phía sau hoặc bên cạnh → bỏ qua
if (dotProduct > 0) {
    // Chỉ tính avoidance cho obstacles ở phía trước
}
```

**Giải thích Dot Product**:
- `dotProduct = cos(θ)` với θ là góc giữa hướng di chuyển và hướng đến obstacle
- `θ < 90°` → `dotProduct > 0` → obstacle ở phía trước
- `θ ≥ 90°` → `dotProduct ≤ 0` → obstacle ở phía sau/bên → không cần tránh

#### 2.3. Force Calculation

```typescript
// Khoảng cách hiệu dụng (trừ đi bán kính obstacle)
const obstacleRadius = max(obstacle.size.x, obstacle.size.z) / 2;
const effectiveDistance = distance - obstacleRadius;

// Chỉ tác động trong vùng AVOIDANCE_DISTANCE
if (effectiveDistance < AVOIDANCE_DISTANCE && effectiveDistance > 0) {
    
    // Strength dựa trên 2 yếu tố:
    
    // 1. Distance strength: càng gần càng mạnh
    const distanceStrength = 
        (AVOIDANCE_DISTANCE - effectiveDistance) / AVOIDANCE_DISTANCE;
    //  Ví dụ: distance=0.5, AVOIDANCE=3 → strength=0.83 (mạnh)
    //         distance=2.5, AVOIDANCE=3 → strength=0.17 (yếu)
    
    // 2. Alignment strength: càng thẳng hàng càng mạnh
    const alignmentStrength = dotProduct; // 0 đến 1
    //  Ví dụ: dotProduct=0.9 → obstacle gần như ngay trước mặt
    //         dotProduct=0.1 → obstacle ở góc mép
    
    // Tổng hợp
    const strength = distanceStrength * alignmentStrength;
    const force = strength * AVOIDANCE_FORCE;
    
    // Hướng đẩy: ngược với hướng đến obstacle
    avoidanceForce.x += -dirToObstacle.x * force;
    avoidanceForce.z += -dirToObstacle.z * force;
}
```

**Output**: Vector lực đẩy (có thể > 1) ra khỏi obstacles

### 3. Velocity Combination

**Weighted Combination**: Kết hợp 2 vectors với trọng số

```typescript
// Combine với weight 0.5 cho avoidance
velocity.x = desiredVelocity.x + avoidanceForce.x * 0.5;
velocity.z = desiredVelocity.z + avoidanceForce.z * 0.5;

// Normalize về unit vector
const magnitude = sqrt(velocity.x² + velocity.z²);

if (magnitude > 0.01) {
    velocity.x /= magnitude;
    velocity.z /= magnitude;
} else {
    // Fallback: nếu tổng quá nhỏ, giữ desired velocity
    velocity = desiredVelocity;
}
```

**Tại sao weight 0.5?**
- Desired velocity (weight 1.0): Hướng chính cần đi
- Avoidance force (weight 0.5): Điều chỉnh nhẹ để tránh
- Nếu avoidance quá mạnh → bot bị đẩy ra xa target
- Nếu avoidance quá yếu → bot vẫn đâm vào obstacle

### 4. Position Update

```typescript
newPosition = {
    x: position.x + velocity.x * speed * deltaTime,
    y: position.y,
    z: position.z + velocity.z * speed * deltaTime
};

// Velocity đã normalized → magnitude = 1
// → Tốc độ di chuyển = speed (3.0 units/s)
```

### 5. Collision Prevention

**Double-check** để đảm bảo bot không đi vào obstacle:

```typescript
const collisionResult = CollisionDetector.checkCollision(
    newPosition,
    BOT_RADIUS,
    BOT_HEIGHT,
    obstacles
);

if (!collisionResult.hasCollision) {
    position = newPosition; // An toàn → cập nhật
} else {
    selectNewTarget(); // Va chạm → target không khả thi, chọn mới
}
```

## Ví dụ Minh họa

### Tình huống 1: Bot gặp obstacle trước mặt

```
Target: (10, 10)
Bot: (0, 0)
Obstacle: (5, 5), radius=2

1. Desired Velocity:
   direction = normalize((10, 10) - (0, 0)) = (0.707, 0.707)

2. Avoidance Force:
   - Distance to obstacle = 7.07
   - Effective distance = 7.07 - 2 = 5.07
   - Distance strength = (3 - 5.07) / 3 = -0.69 → NO FORCE (quá xa)
   
3. Final Velocity = (0.707, 0.707) → đi thẳng

4. Khi đến gần obstacle (distance < 3):
   - Distance = 2.5, effective = 0.5
   - Distance strength = (3 - 0.5) / 3 = 0.83
   - Dot product = 0.95 (gần như thẳng)
   - Force strength = 0.83 * 0.95 = 0.79
   - Avoidance = -normalize(5,5) * 0.79 * 2 = (-1.12, -1.12)
   
   Final velocity = (0.707, 0.707) + (-1.12, -1.12) * 0.5
                  = (0.15, 0.15) → normalize → (0.707, 0.707)
   
   → Bot vẫn tiến về target nhưng hơi lệch để tránh obstacle
```

### Tình huống 2: Obstacle ở phía sau

```
Bot moving: (1, 0) direction
Obstacle: (-2, 0) behind bot

Dot product = (1, 0) · normalize((-2, 0)) = 1 * (-1) = -1 < 0
→ Không apply avoidance
→ Bot tiếp tục đi thẳng
```

## Target Selection (selectNewTarget)

**Đảm bảo target không nằm trong obstacle**:

```typescript
for (let attempt = 0; attempt < 10; attempt++) {
    // Random position trong map
    candidateTarget = randomPosition();
    
    // Check collision
    if (!hasCollision(candidateTarget)) {
        targetPosition = candidateTarget;
        return; // Tìm được vị trí hợp lệ
    }
}

// Fallback: chấp nhận target có thể va chạm
// (bot sẽ cố gắng đến gần nhất có thể)
```

## Ưu điểm của thuật toán

1. **Smooth movement**: Không bị giật cục do combine liên tục
2. **Efficient**: Chỉ tính toán obstacles trong phạm vi (3 units)
3. **Predictive**: Tránh trước khi va chạm (không chờ đến sát mới tránh)
4. **Natural**: Vẫn tiến về target, chỉ lệch nhẹ khi cần
5. **Directional**: Chỉ tránh obstacles ở phía trước (dot product check)

## Tham số điều chỉnh

| Parameter | Giá trị | Ảnh hưởng |
|-----------|---------|-----------|
| `AVOIDANCE_DISTANCE` | 3.0 | Khoảng cách bắt đầu tránh (lớn → tránh sớm hơn) |
| `AVOIDANCE_FORCE` | 2.0 | Độ mạnh lực tránh (lớn → tránh mạnh hơn) |
| `Avoidance weight` | 0.5 | Trọng số combine (lớn → ưu tiên tránh hơn đến target) |
| `ARRIVAL_THRESHOLD` | 1.0 | Khoảng cách coi như đã đến target |

## Kết luận

Steering avoidance tạo ra behavior tự nhiên cho bot bằng cách:
1. Luôn hướng về target (desired velocity)
2. Phát hiện obstacles ở phía trước (dot product)
3. Tạo lực đẩy tỷ lệ với khoảng cách và alignment
4. Kết hợp hai lực với trọng số hợp lý
5. Normalize để duy trì tốc độ ổn định
6. Kiểm tra va chạm cuối cùng để an toàn

→ Bot di chuyển mượt mà, tự động né tránh vật cản mà không bị kẹt hoặc dừng lại.
