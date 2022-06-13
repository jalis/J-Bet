import { exchange_code, get_user_guilds, get_user } from '../util/discord_api.js';
import { update_user } from '../util/api.js';

export const loginController = async (req, res) => {
	// Validate the request before handling Oauth2 flow
	if (!req.query.code) {
		res.send('Invalid code');
	} else if (!req.session.discord_oauth_state || req.query.state != req.session.discord_oauth_state) {
		res.send('Invalid state');
	} else {
		delete req.session.discord_oauth_state; // Remove state variable from user session so it can't be reused
		exchange_code(req.query.code).then(async ({ status, token }) => {
			token.expiry = Math.round(new Date().getTime() / 1000) + token.expires_in; // Calculate the timestamp for the expiration for easier comparison elsewhere
			req.session.discord_token = token; // Store whole token response in user session for later use in API calls and stronger authentication of some requests

			await update_user(req);

			//res.json({status: 'success'});
			res.redirect('/');
		});
	}
};

export default loginController;
