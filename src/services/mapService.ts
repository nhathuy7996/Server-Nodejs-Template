/**
 * Map Service
 * Quản lý map data và cung cấp map information cho clients
 */

import { MapData, ObstacleShape, Vector3 } from '../types';

export class MapService {
    private static instance: MapService;
    private maps: Map<string, MapData> = new Map();

    private constructor() {
        // Initialize default maps
        this.initializeDefaultMaps();
    }

    public static getInstance(): MapService {
        if (!MapService.instance) {
            MapService.instance = new MapService();
        }
        return MapService.instance;
    }

    /**
     * Khởi tạo các map mặc định
     */
    private initializeDefaultMaps(): void {
        // Map 1: Training Ground - Simple map with basic obstacles
        const trainingGround: MapData = {
            id: 'training_ground',
            name: 'Training Ground',
            width: 100,
            length: 100,
            obstacles: [
                // Walls around the map
                {
                    id: 'wall_north',
                    shape: ObstacleShape.BOX,
                    position: { x: 0, y: 2.5, z: 50 },
                    size: { x: 100, y: 5, z: 1 }
                },
                {
                    id: 'wall_south',
                    shape: ObstacleShape.BOX,
                    position: { x: 0, y: 2.5, z: -50 },
                    size: { x: 100, y: 5, z: 1 }
                },
                {
                    id: 'wall_east',
                    shape: ObstacleShape.BOX,
                    position: { x: 50, y: 2.5, z: 0 },
                    size: { x: 1, y: 5, z: 100 }
                },
                {
                    id: 'wall_west',
                    shape: ObstacleShape.BOX,
                    position: { x: -50, y: 2.5, z: 0 },
                    size: { x: 1, y: 5, z: 100 }
                },
                // Some boxes in the center
                {
                    id: 'center_box_1',
                    shape: ObstacleShape.BOX,
                    position: { x: 0, y: 1, z: 0 },
                    size: { x: 4, y: 2, z: 4 }
                },
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
                // Some cylinders
                {
                    id: 'pillar_1',
                    shape: ObstacleShape.CYLINDER,
                    position: { x: -20, y: 2.5, z: 20 },
                    size: { x: 1.5, y: 5, z: 1.5 }
                },
                {
                    id: 'pillar_2',
                    shape: ObstacleShape.CYLINDER,
                    position: { x: 20, y: 2.5, z: 20 },
                    size: { x: 1.5, y: 5, z: 1.5 }
                },
                {
                    id: 'pillar_3',
                    shape: ObstacleShape.CYLINDER,
                    position: { x: -20, y: 2.5, z: -20 },
                    size: { x: 1.5, y: 5, z: 1.5 }
                },
                {
                    id: 'pillar_4',
                    shape: ObstacleShape.CYLINDER,
                    position: { x: 20, y: 2.5, z: -20 },
                    size: { x: 1.5, y: 5, z: 1.5 }
                }
            ],
            spawnPoints: [
                { x: 0, y: 0, z: -30 },
                { x: -5, y: 0, z: -30 },
                { x: 5, y: 0, z: -30 },
                { x: -10, y: 0, z: -30 },
                { x: 10, y: 0, z: -30 }
            ]
        };

        this.maps.set(trainingGround.id, trainingGround);

        console.log(`[MapService] Initialized ${this.maps.size} maps`);
    }

    /**
     * Lấy map data theo ID
     */
    public getMap(mapId: string): MapData | undefined {
        return this.maps.get(mapId);
    }

    /**
     * Lấy tất cả maps
     */
    public getAllMaps(): MapData[] {
        return Array.from(this.maps.values());
    }

    /**
     * Thêm map mới
     */
    public addMap(mapData: MapData): void {
        this.maps.set(mapData.id, mapData);
        console.log(`[MapService] Added map: ${mapData.id}`);
    }

    /**
     * Load map từ JSON file (để mở rộng sau này)
     */
    public loadMapFromJSON(jsonData: string): MapData {
        const mapData: MapData = JSON.parse(jsonData);
        this.addMap(mapData);
        return mapData;
    }

    /**
     * Lấy spawn point ngẫu nhiên cho player
     */
    public getRandomSpawnPoint(mapId: string): Vector3 | null {
        const map = this.getMap(mapId);
        if (!map || !map.spawnPoints || map.spawnPoints.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * map.spawnPoints.length);
        return map.spawnPoints[randomIndex];
    }

    /**
     * Export map ra JSON string
     */
    public exportMapToJSON(mapId: string): string | null {
        const map = this.getMap(mapId);
        if (!map) {
            return null;
        }
        return JSON.stringify(map, null, 2);
    }
}

// Export singleton instance
export const mapService = MapService.getInstance();
