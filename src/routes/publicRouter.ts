import express from 'express'; 
import { getDataAPI, postDataAPI, PublicServices } from '../services/publicServices';


const publicRouter = express.Router();
publicRouter.get('/getData', getDataAPI);
publicRouter.post('/postData',  postDataAPI);

export default publicRouter; 