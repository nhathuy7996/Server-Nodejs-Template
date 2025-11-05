import { Vector3 } from "../types";

export interface PlayerState {
    position: Vector3;
    rotation: Vector3;
    velocity: Vector3;
    health: number;
    speed: number;
}

export interface DirtyFields {
    position?: boolean;
    rotation?: boolean;
    velocity?: boolean;
    health?: boolean;
    speed?: boolean;
}

export class DirtyTracker {
    private previousState: PlayerState;
    private currentState: PlayerState;
    private dirtyFields: DirtyFields = {};
    private threshold: number;

    constructor(initialState: PlayerState, threshold: number = 0.001) {
        this.previousState = this.deepClone(initialState);
        this.currentState = this.deepClone(initialState);
        this.threshold = threshold;
    }

    /**
     * Cập nhật state mới và kiểm tra các field đã thay đổi
     */
    updateState(newState: Partial<PlayerState>): DirtyFields {
        this.dirtyFields = {};

        // Kiểm tra từng field
        if (newState.position && !this.areVector3Equal(this.currentState.position, newState.position)) {
            this.dirtyFields.position = true;
            this.currentState.position = { ...newState.position };
        }

        if (newState.rotation && !this.areVector3Equal(this.currentState.rotation, newState.rotation)) {
            this.dirtyFields.rotation = true;
            this.currentState.rotation = { ...newState.rotation };
        }

        if (newState.velocity && !this.areVector3Equal(this.currentState.velocity, newState.velocity)) {
            this.dirtyFields.velocity = true;
            this.currentState.velocity = { ...newState.velocity };
        }

        if (newState.health !== undefined && Math.abs(this.currentState.health - newState.health) > this.threshold) {
            this.dirtyFields.health = true;
            this.currentState.health = newState.health;
        }

        if (newState.speed !== undefined && Math.abs(this.currentState.speed - newState.speed) > this.threshold) {
            this.dirtyFields.speed = true;
            this.currentState.speed = newState.speed;
        }

        return this.dirtyFields;
    }

    /**
     * Lấy chỉ những field đã thay đổi để gửi về client
     */
    getChangedData(): Partial<PlayerState> {
        const changedData: Partial<PlayerState> = {};

        if (this.dirtyFields.position) {
            changedData.position = { ...this.currentState.position };
        }

        if (this.dirtyFields.rotation) {
            changedData.rotation = { ...this.currentState.rotation };
        }

        if (this.dirtyFields.velocity) {
            changedData.velocity = { ...this.currentState.velocity };
        }

        if (this.dirtyFields.health) {
            changedData.health = this.currentState.health;
        }

        if (this.dirtyFields.speed) {
            changedData.speed = this.currentState.speed;
        }

        return changedData;
    }

    /**
     * Kiểm tra có thay đổi nào không
     */
    hasDirtyFields(): boolean {
        return Object.keys(this.dirtyFields).length > 0;
    }

    /**
     * Reset dirty fields sau khi đã gửi data
     */
    clearDirtyFields(): void {
        this.previousState = this.deepClone(this.currentState);
        this.dirtyFields = {};
    }

    /**
     * Lấy toàn bộ state hiện tại
     */
    getCurrentState(): PlayerState {
        return this.deepClone(this.currentState);
    }

    /**
     * So sánh hai Vector3 có bằng nhau không (với threshold)
     */
    private areVector3Equal(a: Vector3, b: Vector3): boolean {
        return Math.abs(a.x - b.x) <= this.threshold &&
               Math.abs(a.y - b.y) <= this.threshold &&
               Math.abs(a.z - b.z) <= this.threshold;
    }

    /**
     * Deep clone object
     */
    private deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }
}