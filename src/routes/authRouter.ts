import express from 'express';
import { Request, Response } from 'express';
import crypto from 'crypto'; 
import { utils } from '../utils'; 

const router = express.Router(); 

router.get('/nonce', async (req, res) => {

    const nonce = crypto.randomUUID().replace(/-/g, "");

    res.json({
        success: true,
        data: {
            nonce: nonce
        }
    });
}); 

router.post('/', async (req: Request, res: Response) => {
    try {
 
        const { userId } = req.body;
 
        // Generate JWT token
        const token = utils.tokenEncode( {userId: userId});

        // Return success with token and user data
        res.json({
            success: true,
            message: 'Authentication successful',
            data: {
                jwt: token,  
            }
        });

    } catch (error) {
        console.error('❌ Error in Telegram authentication:', error);
        res.status(500).json({
            success: false,
            message: '❌ Authentication failed'
        });
    }
});

export default router; 