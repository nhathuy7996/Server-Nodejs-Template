# Steering Avoidance - Bot Navigation System

## Tổng quan

Steering avoidance là thuật toán điều hướng giúp bot tự động tránh các vật cản (obstacles) trong khi di chuyển đến mục tiêu. Hệ thống sử dụng **raycast** để phát hiện obstacle gần nhất trong hướng di chuyển, sau đó áp dụng **avoidance force** để tránh va chạm.

## Tại sao dùng Raycast?

### So sánh với cách cũ (check tất cả obstacles):

| Cách tiếp cận | Complexity | Vấn đề |
|---------------|------------|---------|
| **Check all obstacles** | O(n) mỗi frame | - Bot bị đẩy bởi nhiều obstacles cùng lúc<br>- Lực avoidance không nhất quán<br>- Tốn performance với map lớn |
| **Raycast (nearest only)** | O(n) nhưng early exit | - Chỉ tránh obstacle quan trọng nhất<br>- Behavior dự đoán được<br>- Tối ưu hơn (có thể spatial partition) |

### Ưu điểm Raycast:

1. **Focused avoidance**: Chỉ tránh obstacle nguy hiểm nhất (gần nhất trong hướng đi)
2. **Predictable**: Behavior rõ ràng, không bị xung đột giữa nhiều lực
3. **Optimizable**: Có thể dùng spatial hashing/quadtree để giảm từ O(n) xuống O(log n)
4. **Natural**: Giống cách người/động vật di chuyển (nhìn thẳng, tránh cái trước mặt)

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
│   2. Raycast for Nearest Obstacle           │
│      - Cast ray theo hướng velocity         │
│      - Tìm obstacle gần nhất intersect ray  │
│      - Calculate avoidance force            │
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

### 2. Raycast Avoidance (calculateAvoidanceForce)

**Mục đích**: Phát hiện obstacle gần nhất trong hướng di chuyển và tạo lực tránh

#### 2.1. Setup Ray

```typescript
// Normalize current velocity to get movement direction
const moveDir = normalize(velocity);

// Ray parameters
const rayOrigin = bot.position;
const rayDirection = moveDir;
const rayLength = AVOIDANCE_DISTANCE; // 3.0 units
```

**Visualization**:
```
     rayLength = 3.0
    <------------->
Bot =============> (movement direction)
    ^
    rayOrigin
```

#### 2.2. Ray-Obstacle Intersection Test

**Thuật toán**: Kiểm tra ray có cắt sphere (obstacle + bot radius)

```typescript
for (const obstacle of obstacles) {
    // 1. Vector từ bot đến obstacle
    const toObstacle = obstacle.position - bot.position;
    
    // 2. Project obstacle lên ray (dot product)
    const projection = dot(toObstacle, moveDir);
    
    // 3. Skip nếu obstacle ở phía sau hoặc quá xa
    if (projection <= 0 || projection > rayLength) {
        continue; // Early exit - không cần tính tiếp
    }
    
    // 4. Tìm điểm gần nhất trên ray với obstacle center
    const closestPoint = rayOrigin + moveDir * projection;
    
    // 5. Khoảng cách từ obstacle center đến ray
    const distanceToRay = length(obstacle.position - closestPoint);
    
    // 6. Check intersection với sphere bounding
    const totalRadius = obstacleRadius + BOT_RADIUS;
    
    if (distanceToRay <= totalRadius) {
        // Ray intersects! Calculate intersection distance
        const intersectionOffset = sqrt(totalRadius² - distanceToRay²);
        const intersectionDistance = projection - intersectionOffset;
        
        // Track nearest obstacle
        if (intersectionDistance < nearestDistance) {
            nearestObstacle = obstacle;
            nearestDistance = intersectionDistance;
        }
    }
}
```

**Visualization của Ray-Sphere Intersection**:
```
                  obstacle
                     ●
                    /│\
          totalRadius│ distanceToRay
                    \│/
Bot ─────────────────●──────────> ray
    ^                ^
    │                closestPoint
    rayOrigin
    
    <--------------->
      projection
      
    <--------->
    intersectionDistance
```

**Giải thích các bước**:

1. **Projection**: Chiếu obstacle center lên ray để tìm vị trí gần nhất
   - `projection > 0`: Obstacle ở phía trước
   - `projection ≤ 0`: Obstacle ở phía sau → skip
   - `projection > rayLength`: Obstacle quá xa → skip

2. **Distance to Ray**: Khoảng cách vuông góc từ obstacle đến ray
   - Nếu `distanceToRay ≤ totalRadius` → ray cắt sphere
   - Nếu `distanceToRay > totalRadius` → không cắt

3. **Intersection Distance**: Vị trí giao điểm đầu tiên trên ray
   - Sử dụng Pythagorean theorem: `offset = sqrt(r² - d²)`
   - `intersectionDistance = projection - offset`

#### 2.3. Force Calculation

```typescript
if (nearestObstacle) {
    // Direction away from obstacle (perpendicular push)
    const dirAway = normalize(bot.position - obstacle.position);
    
    // Force strength based on distance
    const distanceStrength = (rayLength - nearestDistance) / rayLength;
    // Gần → nearestDistance nhỏ → strength lớn
    // Xa  → nearestDistance lớn → strength nhỏ
    
    const force = distanceStrength * AVOIDANCE_FORCE;
    
    // Apply force perpendicular to obstacle
    avoidanceForce = dirAway * force;
}
```

**Output**: Vector lực đẩy **chỉ từ 1 obstacle gần nhất**

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

### Tình huống 1: Bot tiến thẳng vào obstacle

```
Setup:
- Bot at (0, 0), moving direction (1, 0) [East]
- Target at (10, 0)
- Obstacle at (3, 0), radius=1

Raycast:
1. Ray: origin=(0,0), dir=(1,0), length=3
2. toObstacle = (3, 0) - (0, 0) = (3, 0)
3. projection = dot((3, 0), (1, 0)) = 3 * 1 + 0 * 0 = 3
4. Check: projection (3) > 0 ✓ và ≤ rayLength (3) ✓
5. closestPoint = (0, 0) + (1, 0) * 3 = (3, 0)
6. distanceToRay = length((3, 0) - (3, 0)) = 0 (ray đi qua tâm!)
7. totalRadius = 1 + 0.5 = 1.5
8. distanceToRay (0) ≤ totalRadius (1.5) ✓ INTERSECT
9. intersectionOffset = sqrt(1.5² - 0²) = 1.5
10. intersectionDistance = 3 - 1.5 = 1.5 units

Avoidance:
- dirAway = normalize((0, 0) - (3, 0)) = normalize((-3, 0)) = (-1, 0)
- distanceStrength = (3 - 1.5) / 3 = 0.5
- force = 0.5 * 2.0 = 1.0
- avoidanceForce = (-1, 0) * 1.0 = (-1.0, 0)

Final velocity:
- desired = (1, 0)
- velocity = (1, 0) + (-1, 0) * 0.5 = (0.5, 0)
- normalized = (1, 0) [vẫn đi thẳng nhưng có lực cản]

→ Khi gần hơn, lực tránh sẽ mạnh hơn và bot sẽ lệch hướng
```

### Tình huống 2: Bot đi chéo qua obstacle

```
Setup:
- Bot at (0, 0), moving direction (1, 0) [East]
- Obstacle at (2, 1), radius=1

Raycast:
1. toObstacle = (2, 1) - (0, 0) = (2, 1)
2. projection = dot((2, 1), (1, 0)) = 2 * 1 + 1 * 0 = 2
3. closestPoint = (0, 0) + (1, 0) * 2 = (2, 0)
4. distanceToRay = length((2, 1) - (2, 0)) = 1
5. totalRadius = 1 + 0.5 = 1.5
6. distanceToRay (1) ≤ totalRadius (1.5) ✓ INTERSECT
7. intersectionOffset = sqrt(1.5² - 1²) = sqrt(1.25) = 1.12
8. intersectionDistance = 2 - 1.12 = 0.88 units

Avoidance:
- dirAway = normalize((0, 0) - (2, 1)) = normalize((-2, -1)) 
          = (-0.894, -0.447)
- distanceStrength = (3 - 0.88) / 3 = 0.71
- force = 0.71 * 2.0 = 1.42
- avoidanceForce = (-0.894, -0.447) * 1.42 = (-1.27, -0.63)

Final velocity:
- desired = (1, 0)
- velocity = (1, 0) + (-1.27, -0.63) * 0.5 = (0.365, -0.315)
- normalized = (0.757, -0.653)

→ Bot lệch xuống dưới để tránh obstacle ở phía trên
```

### Tình huống 3: Multiple obstacles - chỉ tránh gần nhất

```
Bot at (0, 0), dir (1, 0)
Obstacle A at (1.5, 0), radius=0.5   → intersect at 0.5 units
Obstacle B at (2.5, 0.5), radius=0.5 → intersect at 1.8 units  
Obstacle C at (4, 0), radius=1       → intersect at 2.5 units
Obstacle D at (0.5, 2), radius=0.5   → no intersect (distanceToRay > totalRadius)

Raycast results:
- A: intersectionDistance = 0.5 ← NEAREST!
- B: intersectionDistance = 1.8
- C: intersectionDistance = 2.5
- D: không intersect

Result: 
→ Chỉ áp dụng avoidance force cho Obstacle A
→ Behavior rõ ràng, không bị xung đột giữa nhiều lực
→ Bot sẽ tránh A trước, sau đó mới quan tâm B, C
```

### Tình huống 4: Obstacle ở phía sau

```
Bot at (5, 5), moving direction (1, 0) [East]
Obstacle at (3, 5), radius=1

Raycast:
1. toObstacle = (3, 5) - (5, 5) = (-2, 0)
2. projection = dot((-2, 0), (1, 0)) = -2 * 1 = -2
3. projection (-2) ≤ 0 → SKIP (obstacle ở phía sau)

Result: Không apply avoidance force
→ Bot tiếp tục đi thẳng, không bị ảnh hưởng
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

## Ưu điểm của Raycast Approach

1. **Single target**: Chỉ tránh 1 obstacle → behavior ổn định, không bị chaos
2. **Early detection**: Phát hiện obstacle xa 3 units → thời gian phản ứng tốt
3. **Predictable**: Luôn tránh cái gần nhất → không bị xung đột lực
4. **Scalable**: Dễ optimize với spatial structures (quadtree, grid)
5. **Natural**: Giống AI trong game AAA và cách sinh vật thực tế di chuyển
6. **No conflicting forces**: Không bị nhiều obstacles đẩy cùng lúc
7. **Efficient**: Early exit khi obstacle ở phía sau hoặc quá xa

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
