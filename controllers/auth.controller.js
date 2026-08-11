import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import { issueAuthTokens, rotateRefreshToken, revokeRefreshToken } from "../utils/token.service.js";
import {
    sendUserVerificationEmail,
    verifyEmailByToken
} from "../utils/verification.service.js";

const SALT_ROUNDS = 10;

const ALLOWED_ROLES = ["PATIENT", "ADMIN", "CLINIC"];

const normalizeRole = (role) => {
    const normalized = String(role).trim().toUpperCase();
    if (normalized === "USER") return "PATIENT";
    return normalized;
};

const isEmailVerificationRequired = () =>
    process.env.REQUIRE_EMAIL_VERIFICATION !== "false";

const formatUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    branchId: user.branch_id ?? null,
    emailVerified: Boolean(user.email_verified)
});

const buildAuthResponse = async (user, message) => {
    const { accessToken, refreshToken, refreshExpiresAt } = await issueAuthTokens(user);

    return {
        success: true,
        message,
        data: {
            accessToken,
            refreshToken,
            refreshExpiresAt,
            user: formatUser(user)
        }
    };
};

export const register = async (req, res) => {
    try {
        const { name, email, mobile, password, role, branchId } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        let targetRole = "PATIENT";
        const createdByAdmin = req.user?.role === "ADMIN";

        if (role) {
            const normalizedRole = normalizeRole(role);

            if (!ALLOWED_ROLES.includes(normalizedRole)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role. Use PATIENT, ADMIN, or CLINIC"
                });
            }

            if (normalizedRole === "PATIENT") {
                targetRole = "PATIENT";
            } else {
                if (!createdByAdmin) {
                    return res.status(403).json({
                        success: false,
                        message: "Only admins can register ADMIN or CLINIC accounts"
                    });
                }
                targetRole = normalizedRole;
            }
        }

        if (targetRole === "CLINIC" && !branchId) {
            return res.status(400).json({
                success: false,
                message: "branchId is required for CLINIC"
            });
        }

        if (targetRole !== "CLINIC" && branchId) {
            return res.status(400).json({
                success: false,
                message: "branchId is only allowed for CLINIC"
            });
        }

        if (targetRole === "CLINIC") {
            const [branchRows] = await db.query(
                "SELECT id FROM branches WHERE id = ? AND is_active = 1 LIMIT 1",
                [branchId]
            );

            if (!branchRows[0]) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid or inactive branch"
                });
            }
        }

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ? OR (mobile IS NOT NULL AND mobile = ?) LIMIT 1",
            [email.trim().toLowerCase(), mobile?.trim() || null]
        );

        if (existing[0]) {
            return res.status(409).json({
                success: false,
                message: "Email or mobile already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const emailVerified = createdByAdmin && targetRole !== "PATIENT" ? 1 : 0;

        const [result] = await db.query(
            `INSERT INTO users (name, email, mobile, password, role, branch_id, email_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                email.trim().toLowerCase(),
                mobile?.trim() || null,
                hashedPassword,
                targetRole,
                targetRole === "CLINIC" ? branchId : null,
                emailVerified
            ]
        );

        const user = {
            id: result.insertId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            mobile: mobile?.trim() || null,
            role: targetRole,
            branch_id: targetRole === "CLINIC" ? branchId : null,
            email_verified: emailVerified
        };

        let emailResult = null;

        if (!emailVerified) {
            emailResult = await sendUserVerificationEmail(user);
        }

        if (!emailVerified && isEmailVerificationRequired()) {
            return res.status(201).json({
                success: true,
                message: "Registered successfully. Please verify your email to log in.",
                data: {
                    user: formatUser(user),
                    emailSent: emailResult?.sent ?? false,
                    ...(emailResult?.verifyUrl && { devVerifyUrl: emailResult.verifyUrl })
                }
            });
        }

        return res.status(201).json(
            await buildAuthResponse(user, `${targetRole} registered successfully`)
        );
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const roleBasedLogin = async (req, res) => {
    try {
        const identifier = req.body.identifier || req.body.email || req.body.mobile;
        const { password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "identifier/email/mobile and password are required"
            });
        }

        const normalizedIdentifier = String(identifier).trim().toLowerCase();
        const query = `SELECT id, name, email, mobile, password, role, branch_id, is_active, email_verified
                       FROM users WHERE email = ? OR mobile = ? LIMIT 1`;
        const params = [normalizedIdentifier, String(identifier).trim()];

        const [rows] = await db.query(query, params);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        if (user.is_active === 0) {
            return res.status(403).json({
                success: false,
                message: "Account is inactive"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        // const hashedPassword = await bcrypt.hash("secret123", 10);
        // console.log(hashedPassword)
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        return res.status(200).json(
            await buildAuthResponse(user, `${user.role} login successful`)
        );
    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "refreshToken is required"
            });
        }

        const result = await rotateRefreshToken(refreshToken);

        return res.status(200).json({
            success: true,
            message: "Token refreshed",
            data: {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                refreshExpiresAt: result.refreshExpiresAt
            }
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const token = req.query.token || req.body.token;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is required"
            });
        }

        const result = await verifyEmailByToken(token);

        return res.status(200).json({
            success: true,
            message: result.alreadyVerified
                ? "Email was already verified"
                : "Email verified successfully"
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "email is required"
            });
        }

        const [rows] = await db.query(
            `SELECT id, name, email, email_verified FROM users WHERE email = ? LIMIT 1`,
            [email.trim().toLowerCase()]
        );

        const user = rows[0];

        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If the account exists, a verification email has been sent"
            });
        }

        if (user.email_verified === 1) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified"
            });
        }

        const emailResult = await sendUserVerificationEmail(user);

        return res.status(200).json({
            success: true,
            message: "Verification email sent",
            ...(emailResult?.verifyUrl && { devVerifyUrl: emailResult.verifyUrl })
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
