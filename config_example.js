// Contains configuration for the project

// Do not use dotenv for prod
import 'dotenv/config';

export const session_secret = process.env.SESSION_SECRET;
export const port = process.env.PORT;
export const discord = {
	application_id: process.env.DISCORD_APPLICATION_ID,
	public_key: process.env.DISCORD_PUBLIC_KEY,
	client_id: process.env.DISCORD_CLIENT_ID,
	client_secret: process.env.DISCORD_CLIENT_SECRET,
	api_url: 'https://discord.com/api/v10',
	cdn_url: 'https://cdn.discordapp.com',
	redirect_uri: process.env.DISCORD_REDIRECT_URI
};

export default [session_secret, port, discord];
