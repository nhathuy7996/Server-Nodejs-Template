/**
 * Script để export default training_ground map ra file JSON
 * Chạy: ts-node SERVER/src/scripts/exportDefaultMap.ts
 */

import { mapService } from '../services/mapService';
import { MapLoader } from '../utils/mapLoader';

console.log('Exporting default training_ground map...');
MapLoader.exportDefaultMap();
console.log('Done!');
