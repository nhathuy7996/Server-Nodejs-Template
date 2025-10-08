import jwt from 'jsonwebtoken';
import dotenv from "dotenv"; 

dotenv.config();

export const utils = {

     getMinutesPassed : function (startAt: string) {
        const startDate = new Date(startAt);
        const currentDate = new Date();
        const diffInMilliseconds = currentDate.getTime() - startDate.getTime();
        return Math.floor(diffInMilliseconds / (1000 * 60)); // Chuyển đổi từ milliseconds sang phút
    },

    tokenDecode(token: string): any{
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        console.log('🔍 JWT Secret status:', process.env.JWT_SECRET ? 'Using environment JWT_SECRET' : 'Using default secret');
        
        try {
            const decoded = jwt.verify(token, secret);
            return decoded;
        } catch (error) {
            console.error('❌ JWT verification failed:', error);
            console.error('🔍 Token preview:', token.substring(0, 50) + '...');
            console.error('🔍 Secret being used:', secret.substring(0, 10) + '...');
            throw error;
        }
    },

    tokenEncode(data: any): string{
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        console.log('🔍 Creating JWT with secret:', process.env.JWT_SECRET ? 'Using environment JWT_SECRET' : 'Using default secret');
        
        const token = jwt.sign(data, secret, { expiresIn: '7d' });
        console.log('✅ JWT token created successfully');
        console.log('🔍 Token:', token);
        return token;
    }

}