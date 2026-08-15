const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    let token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({
            message: "Access Denied"
        });
    }

    // Strip "Bearer " prefix if present
    if (token.startsWith("Bearer ")) {
        token = token.slice(7);
    }

    try {
        const verified = jwt.verify(
            token,
            "mysecretkey"
        );

        // Security check: Check if session is revoked/active
        const user = await User.findById(verified.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // If the user has active sessions, verify this token is one of them
        if (user.sessions && user.sessions.length > 0) {
            const hasActiveSession = user.sessions.some(s => s.token === token);
            if (!hasActiveSession) {
                return res.status(401).json({ message: "Session revoked or expired" });
            }
        }

        req.user = verified;
        next();

    } catch (error) {
        res.status(401).json({
            message: "Invalid Token"
        });
    }
};

module.exports = authMiddleware;