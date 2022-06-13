import axios from 'axios';
import { discord } from '../../config.js';

// Shorthand access to the Discord API routes for use in later functions
const discord_api = axios.create({
	baseURL: discord.api_url
});

export const discord_permissions = {
	ADMINISTRATOR: 1 << 3,
	MANAGE_GUILD: 1 << 5
};

const generate_headers = (token) => {
	return {
		headers: {
			Authorization: `${token.token_type ?? 'Bearer'} ${token.access_token ?? token}`
		}
	};
};

export const exchange_code = async (code) => {
	// Build payload for Oauth2 authorization code grant flow
	const data = {
		client_id: discord.client_id,
		client_secret: discord.client_secret,
		grant_type: 'authorization_code',
		code: code,
		redirect_uri: discord.redirect_uri
	};

	// Due to Oauth2's RFC spec Discord's Oauth2 API does not accept JSON formatted data, so the payload has to be sent as such
	const params = new URLSearchParams(data);

	const config = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		}
	};

	// Let errors bubble up, it's going to be at Discord's end 99% of the time and out of our control anyway
	const res = await discord_api.post('/oauth2/token', params.toString(), config);

	return { status: res.status, token: res.data };
};

export const refresh_token = async (token) => {
	// Build payload for Oauth2 refresh token grant flow
	const data = {
		client_id: discord.client_id,
		client_secret: discord.client_secret,
		grant_type: 'refresh_token',
		code: token
	};

	// Due to Oauth2's RFC spec Discord's Oauth2 API does not accept JSON formatted data, so the payload has to be sent as such
	const params = new URLSearchParams(data);

	const config = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		}
	};

	// Let errors bubble up, it's going to be at Discord's end 99% of the time and out of our control anyway
	const res = await discord_api.post('/oauth2/token', params.toString(), config);

	return { status: res.status, token: res.data };
};

// Gets the Discord user object of the token's user
export const get_user = async (token) => {
	const res = await discord_api.get('/users/@me', generate_headers(token));

	return { status: res.status, data: res.data };
};

// Gets partial Discord guild objects of the guilds the token's user is in
export const get_user_guilds = async (token) => {
	const res = await discord_api.get('/users/@me/guilds', generate_headers(token));

	return { status: res.status, guilds: res.data };
};

export default [exchange_code, refresh_token, get_user, get_user_guilds, discord_permissions];
