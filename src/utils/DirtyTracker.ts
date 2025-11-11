import { Vector3 } from "../types";

// Generic type cho DirtyFields - tự động tạo từ interface T
export type DirtyFields<T> = {
    [K in keyof T]?: boolean;
};

export class DirtyTracker<T extends Record<string, any>> {
    private previousState: T;
    private currentState: T;
    private dirtyFields: DirtyFields<T> = {};
    private threshold: number;

    constructor(initialState: T, threshold: number = 0.001) {
        this.previousState = this.deepClone(initialState);
        this.currentState = this.deepClone(initialState);
        this.threshold = threshold;
    }

    /**
     * Cập nhật state mới và kiểm tra các field đã thay đổi
     */
    updateState(newState: Partial<T>): DirtyFields<T> {
      
        this.dirtyFields = {};

        // Duyệt qua tất cả các keys của newState
        for (const key in newState) {
            if (newState.hasOwnProperty(key)) {
                const newValue = newState[key];
                const currentValue = this.currentState[key];

                // Kiểm tra nếu giá trị đã thay đổi
                if (!this.areValuesEqual(currentValue, newValue)) {
                    this.dirtyFields[key] = true;
                    this.currentState[key] = this.isVector3(newValue) 
                        ? { ...newValue } as any
                        : newValue;
                }
            }
        }

        return this.dirtyFields;
    }

    /**
     * Lấy chỉ những field đã thay đổi để gửi về client
     */
    getChangedData(): Partial<T> {
        const changedData: Partial<T> = {};

        for (const key in this.dirtyFields) {
            if (this.dirtyFields[key]) {
                const value = this.currentState[key];
                changedData[key] = this.isVector3(value) 
                    ? { ...value } as any
                    : value;
            }
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
    getCurrentState(): T {
        return this.deepClone(this.currentState);
    }

    /**
     * So sánh hai giá trị có bằng nhau không
     * Hỗ trợ: number, string, Vector3, boolean, v.v.
     */
    private areValuesEqual(a: any, b: any): boolean {
        if (a === undefined || b === undefined) return a === b;

        // Kiểm tra nếu là Vector3
        if (this.isVector3(a) && this.isVector3(b)) {
            return this.areVector3Equal(a, b);
        }

        // Kiểm tra nếu là number
        if (typeof a === 'number' && typeof b === 'number') {
            return Math.abs(a - b) <= this.threshold;
        }

        // So sánh trực tiếp cho các kiểu khác
        return a === b;
    }

    /**
     * Kiểm tra có phải Vector3 không
     */
    private isVector3(value: any): value is Vector3 {
        return value && 
               typeof value === 'object' && 
               'x' in value && 
               'y' in value && 
               'z' in value;
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