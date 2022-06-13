import { Router } from 'express';
//import { exchange_code } from '../util/discord_api.js';

import loginController from '../controllers/login.js';

export const loginRouter = Router();

// Route to handle Discord's Oauth2 flow and store token response in user session
loginRouter.get('/', loginController);

export default loginRouter;
