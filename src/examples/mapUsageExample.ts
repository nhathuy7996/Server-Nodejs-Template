/**
 * Example: How to use MapService and MapLoader
 * 
 * Các cách để tạo và quản lý maps
 */

import { mapService } from '../services/mapService';
import { MapLoader } from '../utils/mapLoader';
import { MapData, ObstacleShape } from '../types';

// ============================================
// 1. SỬ DỤNG MAP SERVICE
// ============================================

// Lấy map hiện có
const trainingGround = mapService.getMap('training_ground');
if (trainingGround) {
    console.log(`Map: ${trainingGround.name}`);
    console.log(`Size: ${trainingGround.width}x${trainingGround.length}`);
    console.log(`Obstacles: ${trainingGround.obstacles.length}`);
}

// Lấy tất cả maps
const allMaps = mapService.getAllMaps();
console.log(`Total maps: ${allMaps.length}`);

// Lấy spawn point ngẫu nhiên
const spawnPoint = mapService.getRandomSpawnPoint('training_ground');
console.log('Spawn point:', spawnPoint);

// ============================================
// 2. TẠO MAP MỚI BẰNG CODE
// ============================================

const customMap: MapData = {
    id: 'custom_arena',
    name: 'Custom Arena',
    width: 60,
    length: 60,
    obstacles: [
        // Tường xung quanh
        {
            id: 'wall_n',
            shape: ObstacleShape.BOX,
            position: { x: 0, y: 2.5, z: 30 },
            size: { x: 60, y: 5, z: 1 }
        },
        {
            id: 'wall_s',
            shape: ObstacleShape.BOX,
            position: { x: 0, y: 2.5, z: -30 },
            size: { x: 60, y: 5, z: 1 }
        },
        {
            id: 'wall_e',
            shape: ObstacleShape.BOX,
            position: { x: 30, y: 2.5, z: 0 },
            size: { x: 1, y: 5, z: 60 }
        },
        {
            id: 'wall_w',
            shape: ObstacleShape.BOX,
            position: { x: -30, y: 2.5, z: 0 },
            size: { x: 1, y: 5, z: 60 }
        },
        // Một số boxes
        {
            id: 'box_1',
            shape: ObstacleShape.BOX,
            position: { x: -10, y: 1.5, z: 10 },
            size: { x: 3, y: 3, z: 3 }
        },
        {
            id: 'box_2',
            shape: ObstacleShape.BOX,
            position: { x: 10, y: 1.5, z: -10 },
            size: { x: 3, y: 3, z: 3 }
        },
        // Một số cylinders (pillars)
        {
            id: 'pillar_1',
            shape: ObstacleShape.CYLINDER,
            position: { x: 0, y: 3, z: 0 },
            size: { x: 2, y: 6, z: 2 } // radius=2, height=6
        },
        {
            id: 'pillar_2',
            shape: ObstacleShape.CYLINDER,
            position: { x: -15, y: 2.5, z: 15 },
            size: { x: 1.5, y: 5, z: 1.5 }
        },
        {
            id: 'pillar_3',
            shape: ObstacleShape.CYLINDER,
            position: { x: 15, y: 2.5, z: -15 },
            size: { x: 1.5, y: 5, z: 1.5 }
        }
    ],
    spawnPoints: [
        { x: 0, y: 0, z: -20 },
        { x: -5, y: 0, z: -20 },
        { x: 5, y: 0, z: -20 },
        { x: -10, y: 0, z: -20 },
        { x: 10, y: 0, z: -20 }
    ]
};

// Thêm map vào service
mapService.addMap(customMap);
console.log('Added custom map!');

// ============================================
// 3. EXPORT MAP RA FILE
// ============================================

// Export map ra JSON file
const exported = MapLoader.saveMapToFile('custom_arena', 'custom_arena.json');
if (exported) {
    console.log('Map exported to SERVER/maps/custom_arena.json');
}

// Export default training ground map
MapLoader.exportDefaultMap();
console.log('Default map exported to SERVER/maps/training_ground.json');

// ============================================
// 4. LOAD MAP TỪ FILE
// ============================================

// Load tất cả maps từ thư mục maps/
MapLoader.loadAllMapsFromDirectory();

// Load một map cụ thể
try {
    const loadedMap = MapLoader.loadMapFromFile('./maps/custom_arena.json');
    console.log(`Loaded map: ${loadedMap.name}`);
} catch (error) {
    console.error('Error loading map:', error);
}

// ============================================
// 5. SỬ DỤNG TRONG GAME CONTROLLER
// ============================================

// Example: Trong NormalMapGame constructor
/*
import { mapService } from '../../../services/mapService';

constructor(io: Server, mapId: string = 'training_ground') {
    super(io);
    
    // Load map data
    const map = mapService.getMap(mapId);
    if (!map) {
        throw new Error(`Map ${mapId} not found`);
    }
    this.mapData = map;
    
    console.log(`Game initialized with map: ${this.mapData.name}`);
}
*/

// ============================================
// 6. EXPORT MAP RA JSON STRING (để gửi cho client)
// ============================================

const mapJson = mapService.exportMapToJSON('training_ground');
if (mapJson) {
    console.log('Map JSON:');
    console.log(mapJson);
    
    // Có thể parse lại
    const parsed: MapData = JSON.parse(mapJson);
    console.log(`Parsed map: ${parsed.name}`);
}
