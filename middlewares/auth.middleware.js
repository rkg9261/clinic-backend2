import jwt from "jsonwebtoken";

const authMiddleware = async (req, res, next) => {

    try {

        // GET TOKEN FROM HEADER
        const authHeader = req.headers.authorization;

        // CHECK TOKEN EXISTS
        if (!authHeader || !authHeader.startsWith("Bearer ")) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token missing"
            });
        }

        // EXTRACT TOKEN
        const token = authHeader.split(" ")[1];

        // VERIFY TOKEN
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type && decoded.type !== "access") {
            return res.status(401).json({
                success: false,
                message: "Invalid token type"
            });
        }

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

export default authMiddleware;

export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden. You do not have access to this resource"
            });
        }

        next();
    };
};
