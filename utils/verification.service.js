import crypto from "crypto";
import { db } from "../config/db.js";
import { sendVerificationEmail } from "./email.service.js";

const VERIFICATION_HOURS = 24;

export const createEmailVerificationToken = () =>
    crypto.randomBytes(32).toString("hex");

export const getVerificationExpiry = () => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VERIFICATION_HOURS);
    return expiresAt;
};

export const assignVerificationToUser = async (userId) => {
    const token = createEmailVerificationToken();
    const expiresAt = getVerificationExpiry();

    await db.query(
        `UPDATE users
         SET email_verification_token = ?,
             email_verification_expires = ?,
             email_verified = 0
         WHERE id = ?`,
        [token, expiresAt, userId]
    );

    return token;
};

export const sendUserVerificationEmail = async (user) => {
    const token = await assignVerificationToUser(user.id);

    return sendVerificationEmail({
        to: user.email,
        name: user.name,
        token
    });
};

export const verifyEmailByToken = async (token) => {
    const [rows] = await db.query(
        `SELECT id, email_verified, email_verification_expires
         FROM users
         WHERE email_verification_token = ?
         LIMIT 1`,
        [token]
    );

    const user = rows[0];

    if (!user) {
        throw Object.assign(new Error("Invalid verification token"), { statusCode: 400 });
    }

    if (user.email_verified === 1) {
        return { alreadyVerified: true };
    }

    if (new Date(user.email_verification_expires) < new Date()) {
        throw Object.assign(new Error("Verification token has expired"), { statusCode: 400 });
    }

    await db.query(
        `UPDATE users
         SET email_verified = 1,
             email_verification_token = NULL,
             email_verification_expires = NULL
         WHERE id = ?`,
        [user.id]
    );

    return { alreadyVerified: false };
};
