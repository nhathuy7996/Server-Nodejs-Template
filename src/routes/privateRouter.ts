import { Router } from 'express'; 
import { getDataAPI, postDataAPI } from '../services/privateServices';


const privateRouter = Router();

//usersDataRouter.get('/getClaimPayload', getClaimPayload);
privateRouter.get('/getData', getDataAPI);
privateRouter.post('/postData', postDataAPI);

export default privateRouter; 