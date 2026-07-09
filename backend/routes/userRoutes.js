const express = require("express");
const User = require("../models/User");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/profile",
    authMiddleware,
    async (req, res) => {
        const user = await User.findById(req.user.id)
            .select("-password")
            .populate("followers", "username profilePic")
            .populate("following", "username profilePic");
        res.json(user);
    }
);

router.put(
    "/profile",
    authMiddleware,
    async (req, res) => {
        try {
            const { bio, profilePic, coverPic, websiteLinks } = req.body;
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (bio !== undefined) user.bio = bio;
            if (profilePic !== undefined) user.profilePic = profilePic;
            if (coverPic !== undefined) user.coverPic = coverPic;
            if (websiteLinks !== undefined && Array.isArray(websiteLinks)) {
                user.websiteLinks = websiteLinks.slice(0, 3);
            }
            await user.save();
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

router.get(
    "/search",
    authMiddleware,
    async (req, res) => {
        try {
            const query = req.query.q || "";
            const users = await User.find({
                username: { $regex: query, $options: "i" }
            }).select("username email bio profilePic followers following");
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

router.get(
    "/suggestions",
    authMiddleware,
    async (req, res) => {
        try {
            const currentUser = await User.findById(req.user.id);
            const users = await User.find({
                _id: { $ne: req.user.id, $nin: currentUser.following }
            }).limit(5).select("username email bio profilePic");
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

router.get(
    "/profile/:id",
    authMiddleware,
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id)
                .select("-password")
                .populate("followers", "username profilePic")
                .populate("following", "username profilePic");
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);
router.put(
    "/follow/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const currentUser = await User.findById(req.user.id);
            const targetUser = await User.findById(req.params.id);

            if (!targetUser) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            if (currentUser.blockedUsers && currentUser.blockedUsers.includes(req.params.id)) {
                return res.status(400).json({ message: "You have blocked this user" });
            }
            if (targetUser.blockedUsers && targetUser.blockedUsers.includes(req.user.id)) {
                return res.status(400).json({ message: "This user has blocked you" });
            }

            if (currentUser.following.includes(req.params.id)) {
                return res.status(400).json({
                    message: "Already following"
                });
            }

            currentUser.following.push(req.params.id);
            targetUser.followers.push(req.user.id);

            await currentUser.save();
            await targetUser.save();

            // Create follow notification
            const notification = new Notification({
                sender: req.user.id,
                recipient: req.params.id,
                type: "follow"
            });
            await notification.save();

            // Return custom event trigger indicator if needed, we'll emit from socket
            res.json({
                message: "User followed",
                notification
            });

        } catch (error) {

            res.status(500).json({
                message: error.message
            });

        }
    }
);
router.put(
    "/unfollow/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const currentUser = await User.findById(req.user.id);
            const targetUser = await User.findById(req.params.id);

            currentUser.following =
                currentUser.following.filter(
                    id => id.toString() !== req.params.id
                );

            targetUser.followers =
                targetUser.followers.filter(
                    id => id.toString() !== req.user.id
                );

            await currentUser.save();
            await targetUser.save();

            res.json({
                message: "User unfollowed"
            });

        } catch (error) {

            res.status(500).json({
                message: error.message
            });

        }
    }
);

router.get(
    "/by-username/:username",
    authMiddleware,
    async (req, res) => {
        try {
            const user = await User.findOne({ username: req.params.username }).select("_id");
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

// Toggle private account privacy
router.put("/privacy", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        user.isPrivate = !user.isPrivate;
        await user.save();
        res.json({ message: `Account is now ${user.isPrivate ? "private" : "public"}`, isPrivate: user.isPrivate });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Block/Unblock a user
router.put("/block/:id", authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const targetUserId = req.params.id;

        if (currentUser.blockedUsers.includes(targetUserId)) {
            currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== targetUserId);
            await currentUser.save();
            res.json({ message: "User unblocked successfully", isBlocked: false });
        } else {
            currentUser.blockedUsers.push(targetUserId);
            // Unfollow them
            currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
            // Remove them from followers
            currentUser.followers = currentUser.followers.filter(id => id.toString() !== targetUserId);
            await currentUser.save();
            
            // Unfollow from their side too
            const targetUser = await User.findById(targetUserId);
            if (targetUser) {
                targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.user.id);
                targetUser.following = targetUser.following.filter(id => id.toString() !== req.user.id);
                await targetUser.save();
            }
            res.json({ message: "User blocked successfully", isBlocked: true });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle focus mode
router.put("/focus-mode", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        user.focusMode = !user.focusMode;
        await user.save();
        res.json({ message: `Focus mode ${user.focusMode ? "activated" : "deactivated"}`, focusMode: user.focusMode, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create collection
router.post("/collections", authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: "Collection name is required" });
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        
        const exists = user.savedCollections.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
        if (exists) return res.status(400).json({ message: "Collection already exists" });
        
        user.savedCollections.push({ name: name.trim(), posts: [] });
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete collection
router.delete("/collections/:name", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        
        user.savedCollections = user.savedCollections.filter(c => c.name.toLowerCase() !== req.params.name.toLowerCase());
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add post to collection
router.put("/collections/add", authMiddleware, async (req, res) => {
    try {
        const { collectionName, postId } = req.body;
        if (!collectionName || !postId) return res.status(400).json({ message: "Collection name and post ID are required" });
        
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        
        const collection = user.savedCollections.find(c => c.name.toLowerCase() === collectionName.toLowerCase());
        if (!collection) return res.status(404).json({ message: "Collection not found" });
        
        if (collection.posts.includes(postId)) {
            return res.status(400).json({ message: "Post already in collection" });
        }
        
        collection.posts.push(postId);
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Remove post from collection
router.put("/collections/remove", authMiddleware, async (req, res) => {
    try {
        const { collectionName, postId } = req.body;
        if (!collectionName || !postId) return res.status(400).json({ message: "Collection name and post ID are required" });
        
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        
        const collection = user.savedCollections.find(c => c.name.toLowerCase() === collectionName.toLowerCase());
        if (!collection) return res.status(404).json({ message: "Collection not found" });
        
        collection.posts = collection.posts.filter(id => id.toString() !== postId);
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update chat theme for a thread
router.put("/chat-theme", authMiddleware, async (req, res) => {
    try {
        const { threadId, theme } = req.body;
        if (!threadId || !theme) return res.status(400).json({ message: "Thread ID and Theme name are required" });
        
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        
        if (!user.chatThemes) user.chatThemes = new Map();
        user.chatThemes.set(threadId.toString(), theme);
        
        await user.save();
        res.json({ message: "Chat theme updated successfully", chatThemes: user.chatThemes });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle 2FA security settings
router.put("/2fa/toggle", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        
        user.is2FAEnabled = !user.is2FAEnabled;
        if (user.is2FAEnabled) {
            // Generate a mock 6-digit verification code/secret
            user.twoFactorSecret = Math.floor(100000 + Math.random() * 900000).toString();
        } else {
            user.twoFactorSecret = "";
        }
        await user.save();
        res.json({ 
            message: `2FA ${user.is2FAEnabled ? "enabled" : "disabled"}`, 
            is2FAEnabled: user.is2FAEnabled, 
            secret: user.twoFactorSecret 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get list of blocked users
router.get("/blocked", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("blockedUsers", "username profilePic");
        res.json(user.blockedUsers || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get list of muted users
router.get("/muted", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("mutedUsers", "username profilePic");
        res.json(user.mutedUsers || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mute/Unmute a user
router.put("/mute/:id", authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const targetUserId = req.params.id;

        if (!currentUser.mutedUsers) {
            currentUser.mutedUsers = [];
        }

        if (currentUser.mutedUsers.includes(targetUserId)) {
            currentUser.mutedUsers = currentUser.mutedUsers.filter(id => id.toString() !== targetUserId);
            await currentUser.save();
            res.json({ message: "User unmuted successfully", isMuted: false });
        } else {
            currentUser.mutedUsers.push(targetUserId);
            await currentUser.save();
            res.json({ message: "User muted successfully", isMuted: true });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update generic settings configuration
router.put("/settings/update", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const allowedFields = [
            "hideLikes", "blockedWords", "avatarFrameTheme", 
            "incognitoStoryViewer", "mutedUsers", "quickReplies",
            "profileSong", "screenTimeLimit", "isVerified", "isVerifiedRequested",
            "showActiveStatus"
        ];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        await user.save();

        if (req.body.showActiveStatus !== undefined) {
            const broadcastOnlineUsers = req.app.get("broadcastOnlineUsers");
            if (broadcastOnlineUsers) {
                broadcastOnlineUsers();
            }
        }

        res.json({ message: "Settings updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Clear activity logs (watched reels, liked reels, blocked words)
router.post("/settings/clear-activity", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.watchedReels = [];
        user.blockedWords = [];
        
        // Remove user's likes from all posts in DB
        const Post = require("../models/Post");
        await Post.updateMany(
            { likes: req.user.id },
            { $pull: { likes: req.user.id } }
        );

        await user.save();
        res.json({ message: "Activity cleared successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET all close friends
router.get("/close-friends", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("closeFriends", "username profilePic name bio");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user.closeFriends || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle a user in/out of Close Friends list
router.put("/close-friends/toggle/:id", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const targetId = req.params.id;
        const index = user.closeFriends.indexOf(targetId);
        let isAdded = false;

        if (index > -1) {
            user.closeFriends.splice(index, 1);
        } else {
            user.closeFriends.push(targetId);
            isAdded = true;
        }

        await user.save();
        
        // Return updated user and close friends list
        const updatedUser = await User.findById(req.user.id).populate("closeFriends", "username profilePic name bio");
        res.json({ 
            message: isAdded ? "Added to Close Friends" : "Removed from Close Friends", 
            closeFriends: updatedUser.closeFriends,
            isAdded 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;