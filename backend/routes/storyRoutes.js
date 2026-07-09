const express = require("express");
const Story = require("../models/Story");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const router = express.Router();

// Configure multer disk storage for backend/uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Create new story
router.post("/create", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const { mediaType, music, videoTrim, caption, textOverlay, mentions, mediaAdjust, isCloseFriendsOnly } = req.body;
        const parsedIsCloseFriendsOnly = isCloseFriendsOnly === "true" || isCloseFriendsOnly === true;
        
        if (!req.file || !mediaType) {
            return res.status(400).json({ message: "File and Media Type are required" });
        }

        // Parse music & videoTrim objects if sent as strings (FormData format)
        let parsedMusic = undefined;
        if (music) {
            try {
                parsedMusic = typeof music === "string" ? JSON.parse(music) : music;
            } catch (e) {
                console.error("Error parsing music:", e);
            }
        }

        let parsedVideoTrim = undefined;
        if (videoTrim) {
            try {
                parsedVideoTrim = typeof videoTrim === "string" ? JSON.parse(videoTrim) : videoTrim;
            } catch (e) {
                console.error("Error parsing videoTrim:", e);
            }
        }

        let parsedTextOverlay = undefined;
        if (textOverlay) {
            try {
                parsedTextOverlay = typeof textOverlay === "string" ? JSON.parse(textOverlay) : textOverlay;
            } catch (e) {
                console.error("Error parsing textOverlay:", e);
            }
        }

        // Parse mentioned user IDs (array of user _ids)
        let mentionIds = [];
        if (mentions) {
            try {
                const parsed = typeof mentions === "string" ? JSON.parse(mentions) : mentions;
                if (Array.isArray(parsed)) {
                    mentionIds = parsed.filter(id => id && id !== req.user.id);
                }
            } catch (e) {
                console.error("Error parsing mentions:", e);
            }
        }

        let parsedMediaAdjust = undefined;
        if (mediaAdjust) {
            try {
                parsedMediaAdjust = typeof mediaAdjust === "string" ? JSON.parse(mediaAdjust) : mediaAdjust;
            } catch (e) {
                console.error("Error parsing mediaAdjust:", e);
            }
        }

        let finalMediaUrl = "";
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        
        finalMediaUrl = `${baseUrl}/uploads/${req.file.filename}`;

        // Perform server-side video trim if trim bounds are provided
        if (mediaType === "video" && parsedVideoTrim && parsedVideoTrim.startTime !== undefined && parsedVideoTrim.endTime !== undefined) {
            const duration = parsedVideoTrim.endTime - parsedVideoTrim.startTime;
            if (duration > 0) {
                const inputFilePath = req.file.path;
                const outputFilename = `trimmed-${Date.now()}-${req.file.filename}`;
                const outputFilePath = path.join(__dirname, "../uploads", outputFilename);

                await new Promise((resolve, reject) => {
                    ffmpeg(inputFilePath)
                        .setStartTime(parsedVideoTrim.startTime)
                        .setDuration(duration)
                        .output(outputFilePath)
                        .on("end", () => {
                            // Delete temporary original file
                            fs.unlink(inputFilePath, (err) => {
                                if (err) console.error("Error deleting temp file:", err);
                            });
                            finalMediaUrl = `${baseUrl}/uploads/${outputFilename}`;
                            // Update trim bounds to match the new file duration
                            parsedVideoTrim = { startTime: 0, endTime: duration };
                            resolve();
                        })
                        .on("error", (err) => {
                            console.error("FFmpeg trim error:", err);
                            reject(err);
                        })
                        .run();
                });
            }
        }

        const story = new Story({
            user: req.user.id,
            mediaUrl: finalMediaUrl,
            mediaType,
            music: parsedMusic,
            videoTrim: parsedVideoTrim,
            caption: caption || "",
            textOverlay: parsedTextOverlay,
            mentions: mentionIds,
            mediaAdjust: parsedMediaAdjust,
            isCloseFriendsOnly: parsedIsCloseFriendsOnly
        });

        await story.save();

        // --- Handle story mentions: send DM + notification to each mentioned user ---
        if (mentionIds.length > 0) {
            const Notification = require("../models/Notification");
            const Message = require("../models/Message");
            const io = req.app.get("socketio");

            // Fetch the poster's username for the DM text
            const poster = await User.findById(req.user.id).select("username profilePic");
            const storyPreviewUrl = finalMediaUrl;

            for (const mentionedUserId of mentionIds) {
                try {
                    // Check if the mentioned user exists and respect Focus Mode
                    const mentionedUser = await User.findById(mentionedUserId);
                    if (!mentionedUser) continue;

                    // 1. Send a DM: story preview card (image/video + isStoryMention flag)
                    const dmMsg = new Message({
                        sender: req.user.id,
                        recipient: mentionedUserId,
                        text: `📸 ${poster.username} mentioned you in their story!`,
                        mediaUrl: finalMediaUrl,
                        mediaType: mediaType === "video" ? "video" : "image",
                        isStoryMention: true
                    });
                    await dmMsg.save();

                    // Emit DM via socket in real-time
                    if (io) {
                        io.to(mentionedUserId.toString()).emit("receive-message", dmMsg);
                        io.to(req.user.id.toString()).emit("receive-message", dmMsg);
                    }

                    // 2. Create a story_mention notification
                    const notification = new Notification({
                        sender: req.user.id,
                        recipient: mentionedUserId,
                        type: "story_mention",
                        story: story._id
                    });
                    await notification.save();

                    // Push notification via socket (unless Focus Mode is on)
                    if (io && !mentionedUser.focusMode) {
                        io.to(mentionedUserId.toString()).emit("receive-notification", notification);
                    }
                } catch (mentionErr) {
                    console.error(`Error processing mention for user ${mentionedUserId}:`, mentionErr.message);
                }
            }
        }

        res.status(201).json({ message: "Story uploaded successfully", story });
    } catch (error) {
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: error.message });
    }
});

// Repost a story from an existing mediaUrl (used by "Add to Story" button in DM)
router.post("/repost", authMiddleware, async (req, res) => {
    try {
        const { mediaUrl, mediaType, music, textOverlay, mediaAdjust, isCloseFriendsOnly } = req.body;
        if (!mediaUrl || !mediaType) {
            return res.status(400).json({ message: "mediaUrl and mediaType are required" });
        }
        const story = new Story({
            user: req.user.id,
            mediaUrl,
            mediaType,
            music: music || undefined,
            textOverlay: textOverlay || undefined,
            mediaAdjust: mediaAdjust || undefined,
            isCloseFriendsOnly: isCloseFriendsOnly === true || isCloseFriendsOnly === "true"
        });
        await story.save();
        res.status(201).json({ message: "Story reposted successfully", story });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get active stories feed (from self and followed users, last 24h)
router.get("/feed", authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Active users to pull stories from: self and following
        const activeUsersList = [req.user.id, ...currentUser.following];

        // Fetch active stories (expiresAt is in the future)
        const stories = await Story.find({
            user: { $in: activeUsersList },
            expiresAt: { $gt: new Date() }
        })
        .populate("user", "username profilePic focusMode closeFriends")
        .populate("mentions", "username profilePic")
        .sort({ createdAt: 1 });

        // Filter stories: if a story is Close Friends only, current user must be in closeFriends list or the owner
        const filteredStories = stories.filter(story => {
            if (!story.isCloseFriendsOnly) return true;
            if (story.user._id.toString() === req.user.id) return true;
            
            const closeFriends = story.user.closeFriends || [];
            return closeFriends.some(cfId => cfId.toString() === req.user.id);
        });

        // Group stories by user
        const groupedStories = {};
        filteredStories.forEach(story => {
            const userId = story.user._id.toString();
            if (!groupedStories[userId]) {
                groupedStories[userId] = {
                    user: story.user,
                    stories: []
                };
            }
            groupedStories[userId].stories.push(story);
        });

        res.json(Object.values(groupedStories));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// View a story (add viewer)
router.put("/view/:id", authMiddleware, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ message: "Story not found or expired" });
        }

        // Support structured viewers check - do not add the story owner or incognito viewers to the list
        const isOwner = story.user.toString() === req.user.id;
        const alreadyViewed = story.viewers.some(v => v.user.toString() === req.user.id);
        
        const viewerUser = await User.findById(req.user.id);
        const isIncognito = viewerUser && viewerUser.incognitoStoryViewer;

        if (!alreadyViewed && !isOwner && !isIncognito) {
            story.viewers.push({ user: req.user.id, viewedAt: new Date() });
            await story.save();
        }

        res.json({ message: "Story viewed", story });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get story viewer list analytics (only for owner)
router.get("/analytics/:id", authMiddleware, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id)
            .populate("viewers.user", "username profilePic");
            
        if (!story) {
            return res.status(404).json({ message: "Story not found or expired" });
        }

        if (story.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to view analytics for this story" });
        }

        res.json({
            viewers: story.viewers,
            viewsCount: story.viewers.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete story (only for owner)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ message: "Story not found or expired" });
        }

        if (story.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to delete this story" });
        }

        await Story.findByIdAndDelete(req.params.id);
        res.json({ message: "Story deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
