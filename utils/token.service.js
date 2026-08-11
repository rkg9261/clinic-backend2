import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

const REFRESH_SALT_ROUNDS = 10;

export const signAccessToken = (user) =>
    jwt.sign(
        {
            id: user.id,
            role: user.role,
            branchId: user.branch_id ?? user.branchId ?? null,
            type: "access"
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
    );

const getRefreshExpiryDate = () => {
    const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
};

export const createRefreshToken = async (userId) => {
    const secret = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(secret, REFRESH_SALT_ROUNDS);
    const expiresAt = getRefreshExpiryDate();

    const [result] = await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [userId, tokenHash, expiresAt]
    );

    const plainToken = `${result.insertId}.${secret}`;
    return { plainToken, expiresAt };
};

const parseRefreshToken = (plainToken) => {
    const dotIndex = plainToken.indexOf(".");
    if (dotIndex === -1) return null;

    const id = Number(plainToken.slice(0, dotIndex));
    const secret = plainToken.slice(dotIndex + 1);

    if (!id || !secret) return null;

    return { id, secret };
};

const loadValidRefreshRow = async (tokenId) => {
    const [rows] = await db.query(
        `SELECT rt.id, rt.user_id, rt.token_hash, rt.expires_at,
                u.role, u.branch_id, u.is_active, u.email_verified
         FROM refresh_tokens rt
         INNER JOIN users u ON u.id = rt.user_id
         WHERE rt.id = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
         LIMIT 1`,
        [tokenId]
    );

    return rows[0] ?? null;
};

export const rotateRefreshToken = async (plainToken) => {
    const parsed = parseRefreshToken(plainToken);

    if (!parsed) {
        throw Object.assign(new Error("Invalid or expired refresh token"), { statusCode: 401 });
    }

    const row = await loadValidRefreshRow(parsed.id);

    if (!row) {
        throw Object.assign(new Error("Invalid or expired refresh token"), { statusCode: 401 });
    }

    const matches = await bcrypt.compare(parsed.secret, row.token_hash);

    if (!matches) {
        throw Object.assign(new Error("Invalid or expired refresh token"), { statusCode: 401 });
    }

    if (row.is_active === 0) {
        throw Object.assign(new Error("Account is inactive"), { statusCode: 403 });
    }

    await db.query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?",
        [row.id]
    );

    const user = {
        id: row.user_id,
        role: row.role,
        branch_id: row.branch_id,
        email_verified: row.email_verified
    };

    const accessToken = signAccessToken(user);
    const { plainToken: newRefreshToken, expiresAt } = await createRefreshToken(user.id);

    return {
        accessToken,
        refreshToken: newRefreshToken,
        refreshExpiresAt: expiresAt,
        user
    };
};

export const revokeRefreshToken = async (plainToken) => {
    const parsed = parseRefreshToken(plainToken);
    if (!parsed) return false;

    const row = await loadValidRefreshRow(parsed.id);
    if (!row) return false;

    const matches = await bcrypt.compare(parsed.secret, row.token_hash);
    if (!matches) return false;

    await db.query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?",
        [row.id]
    );

    return true;
};

export const revokeAllUserRefreshTokens = async (userId) => {
    await db.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = ? AND revoked_at IS NULL`,
        [userId]
    );
};

export const issueAuthTokens = async (user) => {
    const accessToken = signAccessToken(user);
    const { plainToken: refreshToken, expiresAt: refreshExpiresAt } =
        await createRefreshToken(user.id);

    return { accessToken, refreshToken, refreshExpiresAt };
};
