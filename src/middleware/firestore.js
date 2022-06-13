//import { Store } from "express-session";
//import { deleteDoc, doc, getDoc, setDoc, exists } from "firebase-admin/firestore";
// Middleware that includes the Firestore db object in the req object for easier access in routes
export const firestore_middleware = (req, res, next) => {
	req.db = req.app.db;
	next();
};

export default [firestore_middleware];
