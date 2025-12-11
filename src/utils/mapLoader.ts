/**
 * Map Loader Utility
 * Load maps từ JSON files
 */

import fs from 'fs';
import path from 'path';
import { mapService } from '../services/mapService';
import { MapData } from '../types';

export class MapLoader {
    private static mapsDirectory = path.join(__dirname, '../../maps');

    /**
     * Load tất cả maps từ thư mục maps/
     */
    public static loadAllMapsFromDirectory(): void {
        try {
            // Kiểm tra thư mục maps có tồn tại không
            if (!fs.existsSync(this.mapsDirectory)) {
                console.log('[MapLoader] Maps directory not found, creating...');
                fs.mkdirSync(this.mapsDirectory, { recursive: true });
                return;
            }

            // Đọc tất cả files .json trong thư mục
            const files = fs.readdirSync(this.mapsDirectory)
                .filter(file => file.endsWith('.json'));

            console.log(`[MapLoader] Found ${files.length} map files`);

            // Load từng map
            for (const file of files) {
                try {
                    const filePath = path.join(this.mapsDirectory, file);
                    this.loadMapFromFile(filePath);
                } catch (error) {
                    console.error(`[MapLoader] Error loading map from ${file}:`, error);
                }
            }

            console.log(`[MapLoader] Loaded ${files.length} maps`);
        } catch (error) {
            console.error('[MapLoader] Error loading maps:', error);
        }
    }

    /**
     * Load một map từ file
     */
    public static loadMapFromFile(filePath: string): MapData {
        console.log(`[MapLoader] Loading map from: ${filePath}`);
        
        const jsonData = fs.readFileSync(filePath, 'utf8');
        const mapData = mapService.loadMapFromJSON(jsonData);
        
        console.log(`[MapLoader] Loaded map: ${mapData.name} (ID: ${mapData.id})`);
        return mapData;
    }

    /**
     * Save map to file
     */
    public static saveMapToFile(mapId: string, filename?: string): boolean {
        try {
            const mapJson = mapService.exportMapToJSON(mapId);
            if (!mapJson) {
                console.error(`[MapLoader] Map ${mapId} not found`);
                return false;
            }

            // Tạo filename nếu không được cung cấp
            const file = filename || `${mapId}.json`;
            const filePath = path.join(this.mapsDirectory, file);

            // Tạo thư mục nếu chưa tồn tại
            if (!fs.existsSync(this.mapsDirectory)) {
                fs.mkdirSync(this.mapsDirectory, { recursive: true });
            }

            fs.writeFileSync(filePath, mapJson, 'utf8');
            console.log(`[MapLoader] Saved map to: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`[MapLoader] Error saving map:`, error);
            return false;
        }
    }

    /**
     * Export default training_ground map to file
     */
    public static exportDefaultMap(): void {
        console.log('[MapLoader] Exporting default training_ground map...');
        this.saveMapToFile('training_ground');
    }
}
