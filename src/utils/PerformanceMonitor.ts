export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private stats: {
        totalUpdates: number;
        dirtyUpdates: number;
        totalDataSent: number;
        savedBandwidth: number;
        lastResetTime: number;
    };

    private constructor() {
        this.stats = {
            totalUpdates: 0,
            dirtyUpdates: 0,
            totalDataSent: 0,
            savedBandwidth: 0,
            lastResetTime: Date.now()
        };
    }

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Ghi nhận một lần update
     */
    recordUpdate(hasDirtyFields: boolean, dataSizeBytes: number): void {
        this.stats.totalUpdates++;
        
        if (hasDirtyFields) {
            this.stats.dirtyUpdates++;
            this.stats.totalDataSent += dataSizeBytes;
        } else {
            // Estimate bandwidth saved (if we sent full player state every time)
            const estimatedFullSize = 200; // bytes (approximate full player state)
            this.stats.savedBandwidth += estimatedFullSize;
        }
    }

    /**
     * Lấy thống kê hiệu suất
     */
    getStats(): {
        totalUpdates: number;
        dirtyUpdates: number;
        updateEfficiency: number;
        totalDataSent: number;
        savedBandwidth: number;
        bandwidthSavings: number;
        uptime: number;
    } {
        const uptime = Date.now() - this.stats.lastResetTime;
        const updateEfficiency = this.stats.totalUpdates > 0 
            ? (this.stats.dirtyUpdates / this.stats.totalUpdates) * 100 
            : 0;
        
        const totalDataWithoutOptimization = this.stats.totalUpdates * 200; // Estimated
        const bandwidthSavings = totalDataWithoutOptimization > 0 
            ? ((totalDataWithoutOptimization - this.stats.totalDataSent) / totalDataWithoutOptimization) * 100
            : 0;

        return {
            totalUpdates: this.stats.totalUpdates,
            dirtyUpdates: this.stats.dirtyUpdates,
            updateEfficiency: Math.round(updateEfficiency * 100) / 100,
            totalDataSent: this.stats.totalDataSent,
            savedBandwidth: this.stats.savedBandwidth,
            bandwidthSavings: Math.round(bandwidthSavings * 100) / 100,
            uptime
        };
    }

    /**
     * Reset statistics
     */
    reset(): void {
        this.stats = {
            totalUpdates: 0,
            dirtyUpdates: 0,
            totalDataSent: 0,
            savedBandwidth: 0,
            lastResetTime: Date.now()
        };
    }

    /**
     * Log performance summary
     */
    logSummary(): void {
        const stats = this.getStats();
        console.log('[PerformanceMonitor] Dirty Tracking Performance Summary:');
        console.log(`  - Total Updates: ${stats.totalUpdates}`);
        console.log(`  - Updates with Changes: ${stats.dirtyUpdates}`);
        console.log(`  - Update Efficiency: ${stats.updateEfficiency}%`);
        console.log(`  - Total Data Sent: ${(stats.totalDataSent / 1024).toFixed(2)} KB`);
        console.log(`  - Bandwidth Savings: ${stats.bandwidthSavings}%`);
        console.log(`  - Uptime: ${(stats.uptime / 1000).toFixed(2)} seconds`);
    }
}