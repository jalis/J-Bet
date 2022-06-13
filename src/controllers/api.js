import { get_bet_user, update_user, get_bet as get_bet_from_db } from '../util/api.js';
import { FieldValue } from 'firebase-admin/firestore';

// Gets list of user's guilds, limitable to those they can manage
export const get_user_guilds = async (req, res) => {
	const user = req.session.discord_user;

	if (req.query.refresh) await update_user(req, res);

	if (req.query.type == 'managed') {
		return res.json(user.managed_guilds);
	} else if (req.query.type == 'joinable') {
		// TODO: Lists every guild that has been registered for betting and the user is a member of. Might be computationally heavy due to firestore's limit of 10 equality operators for an "in-array" comparison. Might be more prudent to just have server admins link their own pages
	} else {
		return res.json(user.guilds);
	}
};

// Attempt to create a new betting guild
export const post_guild = async (req, res) => {
	const user = req.session.discord_user;
	const payload = req.body;

	// Update user (and thus guild list)
	await update_user(req, res);

	// Check that user can manage the requested server, if not send 403 error
	const guild = user.managed_guilds.find((guild) => {
		return guild.id == payload.id;
	});
	if (!guild) return res.status(403).json({ status: 403, error: 'Not authorized to manage guild' });

	const guild_ref = req.db.collection('guilds').doc(guild.id);

	const guild_snapshot = await guild_ref.get();

	if (guild_snapshot.exists) return res.status(405).json({ status: 405, error: 'Betting guild already exists' });

	const db_res = await guild_ref.set({
		id: guild.id,
		name: guild.name,
		icon: guild.icon,
		startmoney: payload.startmoney,
		currency_prefix: payload.currency_prefix,
		currency_suffix: payload.currency_suffix
	});

	res.json({ status: '200' });
};
// Attempt to change betting guild settings
export const patch_guild = async (req, res) => {
	const user = req.session.discord_user;
	const payload = req.body;

	// Update user (and thus guild list)
	await update_user(req, res);

	// Check that user can manage the requested server, if not send 403 error
	const guild = user.managed_guilds.find((guild) => {
		return guild.id == payload.id;
	});

	if (!guild) return res.status(403).json({ status: 403, error: 'Not authorized to manage guild' });

	const guild_ref = req.db.collection('guilds').doc(guild.id);

	const guild_snapshot = await guild_ref.get();

	if (!guild_snapshot.exists) return res.status(405).json({ status: 405, error: 'Betting guild does not exist' });

	const db_res = await guild_ref.set(
		{
			startmoney: payload.startmoney,
			currency_prefix: payload.currency_prefix,
			currency_suffix: payload.currency_suffix
		},
		{ merge: true }
	);

	res.json({ status: 200 });
};
// Lists guild options
export const get_guild = async (req, res) => {
	const guild_id = req.query.id;

	const guild_snapshot = await req.db.collection('guilds').doc(guild_id).get();

	res.json({ status: 200, data: guild_snapshot.data() });
};
export const delete_guild = async (req, res) => {
	res.status(501).json({ status: 501, error: 'TODO' });
};
// Creating new bets
export const post_bet = async (req, res) => {
	const user = req.session.discord_user;
	const payload = req.body;
	const guild_id = payload.guild_id;
	const user_id = req.session.discord_user.id;

	if (typeof guild_id == 'number') guild_id = guild_id.toString();

	// Update user (and thus guild list)
	await update_user(req, res);

	// Check that user is a member of the guild they want to make a bet in
	const guild = user.guilds.find((guild) => {
		return guild.id == guild_id;
	});
	if (!guild) return res.status(403).json({ status: 403, error: 'Not a member of guild' });

	const bet_user = await get_bet_user(req, guild_id, user_id);

	// Check that the user has enough money to make the bet
	if (bet_user.money - bet_user.bound_money < payload.amount)
		return res.status(403).json({ status: 403, error: 'User does not have enough money' });

	// Update the user's bound money before the rest of the process. Return it if an error occurs later
	const user_ref = req.db.collection('guilds').doc(guild_id).collection('bet_users').doc(user_id);
	await user_ref.update({
		bound_money: FieldValue.increment(payload.amount)
	});

	const timestamp = new Date().getTime();
	const bet = {
		maker: user.id,
		taker: null,
		amount: payload.amount,
		subject: payload.subject, // TODO: User input sanitization?
		maker_resolution: null,
		taker_resolution: null,
		created: timestamp,
		taken: null,
		resolved: null,
		winner: null
	};

	try {
		const bets_ref = req.db.collection('guilds').doc(guild_id).collection('bets');
		const db_res = await bets_ref.add(bet);
		res.json({ status: 200, bet_id: db_res.id });
	} catch (err) {
		await user_ref.update({
			bound_money: FieldValue.increment(-payload.amount)
		});
		throw err;
	}
};
// Accepting bets and verifying results
export const patch_bet = async (req, res) => {
	const user = req.session.discord_user;
	const payload = req.body;
	const guild_id = payload.guild_id;
	const user_id = req.session.discord_user.id;
	const bet_id = req.payload.id;
	const action = payload.action;

	if (typeof guild_id == 'number') guild_id = guild_id.toString();

	// Update user (and thus guild list)
	await update_user(req, res);

	// Check that user is a member of the guild they want to interact with a bet in
	const guild = user.guilds.find((guild) => {
		return guild.id == guild_id;
	});
	if (!guild) return res.status(403).json({ status: 403, error: 'Not a member of guild' });

	const bet_user = await get_bet_user(req, guild_id, user_id);
	const bet = await get_bet_from_db(req, guild_id, bet_id);

	// Check that the user has enough money to make the bet
	if (bet_user.money - bet_user.bound_money < bet.amount)
		return res.status(403).json({ status: 403, error: 'User does not have enough money' });

	const bet_ref = req.db.collection('guilds').doc(guild_id).collection('bets').doc(bet_id);

	if (action == 'take-bet') {
		// Check that the user is not trying to accept his own bet
		if (user_id == bet.maker) return res.status(403).json({ status: 403, error: 'Cannot accept own bet' });

		// Update the user's bound money before the rest of the process. Return it if an error occurs later
		const user_ref = req.db.collection('guilds').doc(guild_id).collection('bet_users').doc(user_id);
		await user_ref.update({
			bound_money: FieldValue.increment(payload.amount)
		});

		try {
			const timestamp = new Date().getTime();
			await bet_ref.update({
				taker: user_id,
				taken: timestamp
			});
			res.json({ status: 200, bet_id: db_res.id });
		} catch (err) {
			await user_ref.update({
				bound_money: FieldValue.increment(-payload.amount)
			});
			throw err;
		}
	} else if (action == 'resolve-bet') {
		// Check that the bet has been taken
		if (!bet.taken) return res.status(403).json({ status: 403, error: 'Bet not yet taken' });

		// Check that the user accessing this route is either the bet maker or taker
		if (user_id != bet.maker && user_id != bet.taker)
			return res.status(403).json({ status: 403, error: 'Cannot resolve a bet user is not part of' });

		// Check that the payload has valid winner field
		if (payload.winner != 'maker' && payload.winner != 'taker')
			return res.status(400).json({ status: 400, error: 'Malformed payload' });

		const winner = payload.winner;
		bet[`${user_id == bet.maker ? 'maker' : 'taker'}_resolution`] = winner;

		if (bet.maker_resolution == bet.taker_resolution) {
			const timestamp = new Date().getTime();
			bet.resolved = timestamp;
			bet.winner = bet.maker_resolution;
			await bet_ref.update(bet);
			res.json({ status: 200, update: 'resolved', winner: bet.winner });
		} else {
			if (bet.maker_resolution == null || bet.taker_resolution == null) {
				res.json({ status: 200, update: 'wait' });
			} else {
				res.json({ status: 200, update: 'contested' });
			}
		}
	}
};
// Lists bet data
export const get_bet = async (req, res) => {
	const bet_id = req.query.id;
	const guild_id = req.query.guild_id;

	const bet = await get_bet_from_db(req, guild_id, bet_id);

	res.json({ status: 200, data: bet });
};
// Delete bet
// It's probably better to just use PATCH methods to cancel bets and leave the bet as is in the DB for history/logging
export const delete_bet = async (req, res) => {};

export default [get_user_guilds, post_guild, patch_guild, get_guild, delete_guild];
