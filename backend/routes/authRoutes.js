const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {

        const { username, email, password } = req.body;

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                message: "An account with this email already exists."
            });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                message: "This username is already taken. Please choose a different one."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({
            message: "User Registered Successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Check username availability
router.get("/check-username", async (req, res) => {
    try {
        const { username } = req.query;
        if (!username || username.trim().length < 3) {
            return res.json({ available: false, message: "Username must be at least 3 characters." });
        }
        const existing = await User.findOne({ username: username.trim() });
        if (existing) {
            return res.json({ available: false, message: "This username is already taken. Please choose a different one." });
        }
        return res.json({ available: true, message: "Username is available!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
const jwt = require("jsonwebtoken");

router.post("/login", async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid password"
            });
        }

        if (user.is2FAEnabled) {
            // Generate a temporary 2FA code
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.twoFactorSecret = otp;
            await user.save();

            return res.json({
                requires2FA: true,
                email: user.email,
                otp // Return OTP in response for mock/simulation purposes
            });
        }

        const token = jwt.sign(
            { id: user._id },
            "mysecretkey",
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login Successful",
            token
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Verify 2FA code during login
router.post("/login/2fa-verify", async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ message: "Email and code are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.twoFactorSecret !== code) {
            return res.status(400).json({ message: "Invalid 2FA verification code" });
        }

        // Clear secret after successful login to prevent reuse
        user.twoFactorSecret = "";
        await user.save();

        const token = jwt.sign(
            { id: user._id },
            "mysecretkey",
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login Successful",
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mock forgot password endpoint (generates and returns an OTP)
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found with this email" });

        // Generate a 6-digit mock OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        res.json({ message: "OTP sent to your email address", otp, email });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mock OTP verification and reset password endpoint
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "Email, OTP, and new password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (otp.length !== 6) {
            return res.status(400).json({ message: "Invalid OTP code" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password reset successful!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});