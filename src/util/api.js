import { get_user_guilds, get_user, discord_permissions } from '../util/discord_api.js';

export const update_user = async (req) => {
	// Update the user object in the Firestore database after successful auth
	const raw_user_data = await get_user(req.session.discord_token);
	const raw_guild_data = await get_user_guilds(req.session.discord_token);

	const user_data = {
		// Save raw data from /users/@me for later use, if there are any
		rawData: raw_user_data.data
	};

	const managed_guilds = raw_guild_data.guilds.filter((guild) => {
		// Filter out guilds that the user does not have sufficient perms to manage this app for
		let n = parseInt(guild.permissions);
		let m = discord_permissions.ADMINISTRATOR | discord_permissions.MANAGE_GUILD; // Limit access to users with MANAGE_GUILD or ADMINISTRATOR permission
		return n & m || guild.owner; // Also pass test if the user is the guild's owner, I do not know if it's possible for a Guild's owner to not have ADMINISTRATOR permissions but better safe than sorry
	});

	const guild_mapper = (guild) => {
		// Map only necessary fields into the database
		return {
			id: guild.id,
			name: guild.name,
			permissions: guild.permissions,
			owner: guild.owner,
			icon: guild.icon
		};
	};

	const member_guild_list = raw_guild_data.guilds.map(guild_mapper);
	const managed_guild_list = managed_guilds.map(guild_mapper);

	Object.assign(user_data, {
		// Form user object for database and caching in session
		id: raw_user_data.data.id,
		username: raw_user_data.data.username,
		guilds: member_guild_list,
		managed_guilds: managed_guild_list,
		updated: Math.round(new Date().getTime() / 1000)
	});

	const db_res = await req.db.collection('users').doc(user_data.id).set(user_data, { merge: true });

	req.session.discord_user = user_data;

	return user_data;
};

export const get_bet_user = async (req, guild_id, user_id) => {
	const user_ref = req.db.collection('guilds').doc(guild_id).collection('bet_users').doc(user_id);
	const user_snapshot = await user_ref.get();

	if (!user_snapshot.exists) {
		const guild_snapshot = await req.db.collection('guilds').doc(guild_id).get();
		const startmoney = guild_snapshot.data().startmoney;
		const user = {
			id: user_id,
			money: startmoney,
			bound_money: 0
		};
		await user_ref.set(user);

		return user;
	} else return user_snapshot.data();
};
export const get_bet = async (req, guild_id, bet_id) => {
	const bet = await req.db.collection('guilds').doc(guild_id).collection('bets').doc(bet_id).get();
	return bet.data();
};
