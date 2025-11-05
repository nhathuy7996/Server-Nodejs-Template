# Dirty Tracking System

## Tổng quan

Hệ thống Dirty Tracking được thiết kế để tối ưu hóa bandwidth và hiệu suất bằng cách chỉ gửi những thông tin đã thay đổi (dirty fields) từ server về client thay vì gửi toàn bộ player state mỗi lần update.

## Các thành phần chính

### 1. DirtyTracker Class (`/src/utils/DirtyTracker.ts`)
- Theo dõi các thay đổi trong player state
- So sánh state hiện tại với state trước đó
- Đánh dấu những field đã thay đổi
- Cung cấp chỉ những dữ liệu cần thiết để gửi đi

**Tính năng:**
- Threshold-based comparison (tránh update với thay đổi quá nhỏ)
- Vector3 comparison với tolerance
- Efficient field tracking
- Deep cloning để tránh reference issues

### 2. GameController Enhancement (`/src/controllers/game/GameController.ts`)
- Tích hợp DirtyTracker vào Player objects
- Rate limiting để tránh spam broadcasts
- Optimized broadcasting logic
- Performance monitoring

**Tính năng:**
- Rate limiting: Tối đa 20 FPS broadcast
- Chỉ broadcast khi có thay đổi thực sự
- Automatic cleanup của dirty fields
- Performance metrics và logging

### 3. PerformanceMonitor (`/src/utils/PerformanceMonitor.ts`)
- Theo dõi hiệu suất của dirty tracking system
- Tính toán bandwidth savings
- Logging và statistics
- Singleton pattern để global monitoring

**Metrics:**
- Total updates vs dirty updates
- Bandwidth usage và savings
- Update efficiency percentage
- Uptime tracking

## Cách hoạt động

### Server Side Flow:

1. **Player Movement Update:**
   ```typescript
   // Client gửi movement data
   onPlayerMove(socket, data) {
       this.updatePlayerState(playerId, {
           position: newPosition,
           rotation: newRotation,
           velocity: newVelocity
       });
   }
   ```

2. **Dirty Tracking:**
   ```typescript
   // DirtyTracker so sánh và đánh dấu changes
   const dirtyFields = dirtyTracker.updateState(newState);
   // Chỉ những field thay đổi mới được đánh dấu
   ```

3. **Optimized Broadcasting:**
   ```typescript
   // Chỉ gửi data khi có thay đổi và rate limiting allow
   if (player.dirtyTracker.hasDirtyFields()) {
       const changedData = player.dirtyTracker.getChangedData();
       // Broadcast chỉ changed fields
   }
   ```

### Client Side Integration:

1. **Nhận Partial Updates:**
   ```typescript
   socket.on('game:playerUpdates', (data) => {
       // Chỉ cập nhật những field đã thay đổi
       if (updateData.position) player.position = updateData.position;
       if (updateData.rotation) player.rotation = updateData.rotation;
   });
   ```

2. **Full State Sync:**
   ```typescript
   socket.on('game:allPlayersState', (data) => {
       // Nhận toàn bộ state khi join hoặc sync
       this.players = data.players;
   });
   ```

## Lợi ích

### 1. Bandwidth Optimization
- Giảm 60-80% dữ liệu truyền tải so với full state broadcasts
- Rate limiting tránh spam updates
- Chỉ gửi khi thực sự cần thiết

### 2. Performance Improvement
- Giảm CPU usage cho JSON serialization
- Ít network packets hơn
- Smoother gameplay với ít lag

### 3. Scalability
- Hỗ trợ nhiều players hơn với cùng bandwidth
- Automatic performance monitoring
- Easy to tune thresholds và rates

## Configuration Options

### DirtyTracker Threshold
```typescript
// Tạo với custom threshold
new DirtyTracker(initialState, 0.01); // 1cm tolerance cho position
```

### Broadcast Rate Limiting
```typescript
// Trong GameController
private static readonly MAX_BROADCAST_RATE = 20; // 20 FPS max
private static readonly MIN_BROADCAST_INTERVAL = 50; // 50ms min
```

### Performance Monitoring
```typescript
// Log stats mỗi phút
private static readonly STATS_LOG_INTERVAL = 60000;
```

## Events

### Server → Client Events:
- `game:playerUpdates`: Partial updates với dirty fields
- `game:allPlayersState`: Full state của tất cả players

### Client → Server Events:
- `player:onMove`: Movement data từ client
- `player:requestSync`: Request full state sync

## Usage Example

### Server Implementation:
```typescript
export class MyGame extends GameController {
    onPlayerMove(socket: AuthenticatedSocket, data: string): void {
        const player = this.players.find(p => p.socket.userId === socket.userId);
        if (!player) return;

        const parsedData = JSON.parse(data);
        
        // Automatic dirty tracking
        this.updatePlayerState(player.id, {
            position: parsedData.position,
            rotation: parsedData.rotation,
            velocity: parsedData.velocity
        });
    }
}
```

### Client Implementation:
```typescript
socket.on('game:playerUpdates', (data) => {
    for (const [playerId, updates] of Object.entries(data.updates)) {
        // Apply chỉ những field đã thay đổi
        if (updates.position) this.updatePlayerPosition(playerId, updates.position);
        if (updates.rotation) this.updatePlayerRotation(playerId, updates.rotation);
    }
});
```

## Performance Tips

1. **Adjust Thresholds**: Set reasonable thresholds để tránh micro-updates
2. **Rate Limiting**: Điều chỉnh MAX_BROADCAST_RATE dựa trên game requirements
3. **Monitoring**: Sử dụng PerformanceMonitor để tune parameters
4. **Client Interpolation**: Implement smooth interpolation trên client để compensate cho reduced update rate

## Monitoring và Debugging

### Performance Stats:
```typescript
// Check performance
const stats = PerformanceMonitor.getInstance().getStats();
console.log(`Bandwidth savings: ${stats.bandwidthSavings}%`);
console.log(`Update efficiency: ${stats.updateEfficiency}%`);
```

### Debug Logging:
- Server logs performance summary mỗi phút
- Track update counts và data sizes
- Monitor bandwidth savings

## Future Improvements

1. **Compression**: Thêm data compression cho updates
2. **Prediction**: Client-side prediction để giảm perceived lag
3. **Adaptive Rate**: Adaptive broadcast rate dựa trên network conditions
4. **Field Priorities**: Priority-based updates cho important fields
5. **Delta Compression**: Chỉ gửi differences thay vì absolute values