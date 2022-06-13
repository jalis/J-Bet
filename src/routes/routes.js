import { Router } from 'express';

import loginRouter from './login.js';
import apiRouter from './api.js';
import { discord_permissions, get_user_guilds, get_user } from '../util/discord_api.js';
import serveStatic from 'serve-static';

export const router = Router();

// TODO: Consolidating routes from multiple sourcefiles best-practices

router.use(serveStatic('public'));

router.use('/login', loginRouter);
router.use('/api', apiRouter);

export default router;
