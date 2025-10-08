import {  Response } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';
import dotenv from "dotenv"; 

dotenv.config();

export class PrivateServices {

    
    static testFunction(walletAddress: string): any {
       
        const testData = {} 

        return testData;
    }


}

export const getDataAPI = async (req: AuthenticatedRequest, res: Response) => {

    try {
        console.log(req.userId);
        const walletId = req.userId!;
 
        const response: ApiResponse = {
            success: true,
            message: `get Data success`,
            data: PrivateServices.testFunction(walletId)
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

export const postDataAPI = async (req: AuthenticatedRequest, res: Response) => {

    try {
        console.log(req.userId);
        const walletId = req.userId!;

        const { data } = req.body;
 
        const response: ApiResponse = {
            success: true,
            message: `get Data success`,
            data: PrivateServices.testFunction(walletId)
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
