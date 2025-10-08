import { Request, Response } from 'express';
import dotenv from "dotenv"; 
import { ApiResponse } from '../types';
dotenv.config();

export class PublicServices {

    
    static testFunction(walletAddress: string): any {
       
        const testData = {} 
        return testData;
    }
}

export const getDataAPI = async (req: Request, res: Response) => {

    try {
        
        const {walletId} = req.params!;
 
        const response: ApiResponse = {
            success: true,
            message: `get Data success`,
            data: PublicServices.testFunction(walletId)
        }
        res.json(response);

    } catch (error) {
        console.error('Error retrieving data:', error);
        const errorResponse: ApiResponse = {
            success: false,
            message: 'Failed to retrieve data',
        };
        res.status(500).json(errorResponse);
    }
};

export const postDataAPI = async (req: Request, res: Response) => {

    try {
        const {walletId} = req.params!;

        const { data } = req.body;
 
        const response: ApiResponse = {
            success: true,
            message: `get Data success`,
            data: PublicServices.testFunction(walletId)
        }
        res.json(response);

    } catch (error) {
        console.error('Error retrieving data:', error);
        const errorResponse: ApiResponse = {
            success: false,
            message: 'Failed to retrieve data',
        };
        res.status(500).json(errorResponse);
    }
};