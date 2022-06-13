import 'axios';
import crypto from 'crypto';

import { discord } from '../../config.js';
import { get_user, refresh_token } from '../util/discord_api.js';
import { update_user } from '../util/api.js';

// Discord Oauth2 scopes
const scopes = ['identify', 'guilds'];

// Build the URL for Discord's Oauth2 flow for clients to authenticate on
const discord_authorize_endpoint = `${discord.api_url}/oauth2/authorize?client_id=${
	discord.client_id
}&redirect_uri=${encodeURIComponent(discord.redirect_uri)}&response_type=code&scope=${scopes.join('%20')}`;

// Middleware that redirects users to authorize a Discord Oauth2 token for the app before any further use is allowed and also handles refreshing the token
export const discord_auth = async (req, res, next) => {
	if (req.path == '/login') {
		// Pass if /login
		next();
	} else if (!req.session.discord_token) {
		console.log(req.session);
		// Redirect to Discord Oauth2 flow if no token
		const state = crypto.randomBytes(16).toString('base64url'); // Random state variable for protection against CSRF attacks
		req.session.discord_oauth_state = state;
		res.redirect(`${discord_authorize_endpoint}&state=${state}`);
	} else {
		const cur_time = new Date().getTime() / 1000;
		if (cur_time > req.session.discord_token.expiry + 5) {
			// Add 5 seconds of buffer to the expiry timestamp
			refresh_token(req.query.code).then(({ status, token }) => {
				token.expiry = cur_time + token.expires_in; // Calculate the timestamp for the expiration for easier comparison elsewhere
				req.session.discord_token = token; // Store whole token response in user session for later use in API calls and stronger authentication of some requests
			});
		}
		if (cur_time > req.session.discord_user.updated + 3600) {
			// Update user data cached in session every hour
			console.log('Updating cached user data');
			await update_user(req);
		}
		next();
	}
};

// Place at the front of routes that require strong authentication, for example non-read interactions with the bets API
export const verify_discord_token = async (req, res, next) => {
	const { status } = get_user(req.session.discord_token);
	if (status != 200) {
		res.status(401).send('Unauthorized');
	}
	next();
};

export default [discord_auth, verify_discord_token];
