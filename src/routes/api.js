import { json, Router } from 'express';
import {
	delete_bet,
	delete_guild,
	get_bet,
	get_guild,
	get_user_guilds,
	patch_bet,
	patch_guild,
	post_bet,
	post_guild
} from '../controllers/api.js';

export const apiRouter = Router();

apiRouter.use(json());

apiRouter.get('/user_guilds', get_user_guilds);

apiRouter.get('/guild', get_guild);
apiRouter.post('/guild', post_guild);
apiRouter.patch('/guild', patch_guild);
apiRouter.delete('/guild', delete_guild);

apiRouter.get('/bet', get_bet);
apiRouter.post('/bet', post_bet);
apiRouter.patch('/bet', patch_bet);
apiRouter.delete('/bet', delete_bet);

export default apiRouter;
