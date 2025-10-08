import { Socket } from 'socket.io';
import { Request } from 'express';

export interface ApiResponse {
    success: boolean;
    message: string;
    data?: any;
}

export interface AuthenticatedSocket extends Socket {
    userId?: string; 
}

export interface AuthenticatedRequest extends Request{
    userId?: string
}

export interface Vector3{
    x: number,
    y: number,
    z: number,
}

export interface Vector2{
    x: number,
    y: number
}
