import { FirestoreStore } from '@google-cloud/connect-firestore';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import express from 'express';
import session from 'express-session';

import { session_secret, port } from './config.js';
import { router } from './src/routes/routes.js';

import { discord_auth, verify_discord_token } from './src/middleware/discord_auth.js';
import { firestore_middleware } from './src/middleware/firestore.js';

export const app = express();

const firebase_app = initializeApp({
	credential: applicationDefault()
});

app.db = getFirestore(firebase_app);

// Setup app to use Firestore as session engine
app.use(
	session({
		store: new FirestoreStore({
			dataset: getFirestore(firebase_app),
			kind: 'express-sessions'
		}),
		secret: session_secret,
		resave: false,
		saveUninitialized: true
	})
);

// Add Firestore db object to req for future routes
app.use(firestore_middleware);

// Have every request go through the discord_auth middleware, which stops un-authorized access to all routes but /login
app.use(discord_auth);
// More strongly verify auth for POST, PATCH and DELETE requests
app.post(verify_discord_token);
app.patch(verify_discord_token);
app.delete(verify_discord_token);

// router contains all routes in the app, and is consolidated in ./src/routes/routes.js
app.use(router);

app.listen(port, () => {
	console.log(`App listening on port ${port}! NODE_ENV=${process.env.NODE_ENV}`);
});

export default [app];
