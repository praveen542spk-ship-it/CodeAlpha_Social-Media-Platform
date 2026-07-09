const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
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

router.post(
    "/create",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {
        try {
            const { caption, mediaType, location, music, videoTrim, postType, codeSnippet, collaboratorId, unlockDate } = req.body;

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

            let parsedCodeSnippet = undefined;
            if (codeSnippet) {
                try {
                    parsedCodeSnippet = typeof codeSnippet === "string" ? JSON.parse(codeSnippet) : codeSnippet;
                } catch (e) {
                    console.error("Error parsing codeSnippet:", e);
                }
            }

            // Extract hashtags automatically
            const hashtags = caption ? (caption.match(/#(\w+)/g) || []).map(tag => tag.substring(1).toLowerCase()) : [];

            let finalMediaUrl = "";
            const baseUrl = `${req.protocol}://${req.get("host")}`;

            if (req.file) {
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
            }

            let finalPostType = postType || "text";
            if (!postType) {
                if (mediaType === "video") {
                    finalPostType = "video";
                } else if (mediaType === "image" || req.file) {
                    finalPostType = "image";
                }
            }

            // For vault posts, the first uploaded photo goes into vaultPhotos
            const currentUserDoc = await User.findById(req.user.id);
            let initialVaultPhotos = [];
            if (finalPostType === "vault" && finalMediaUrl) {
                initialVaultPhotos = [{
                    user: req.user.id,
                    username: currentUserDoc?.username || "",
                    profilePic: currentUserDoc?.profilePic || "",
                    mediaUrl: finalMediaUrl,
                    addedAt: new Date()
                }];
            }

            const post = new Post({
                user: req.user.id,
                caption: caption || "",
                mediaUrl: finalPostType === "vault" ? "" : finalMediaUrl,
                mediaType: finalPostType === "vault" ? "none" : (mediaType || "none"),
                location: location || "",
                hashtags,
                music: parsedMusic,
                videoTrim: parsedVideoTrim,
                postType: finalPostType,
                codeSnippet: parsedCodeSnippet,
                collaborators: collaboratorId ? [collaboratorId] : [],
                collabPending: collaboratorId ? true : false,
                unlockDate: unlockDate ? new Date(unlockDate) : null,
                vaultPhotos: initialVaultPhotos
            });

            await post.save();

            res.status(201).json({
                message: "Post Created",
                post
            });

        } catch (error) {
            // Clean up uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                message: error.message
            });
        }
    }
);

// POST /api/posts/:id/vault-add — contribute a photo to unlock a vault
router.post("/:id/vault-add", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        if (post.postType !== "vault") return res.status(400).json({ message: "Not a vault post" });

        // Check if user already contributed
        const alreadyIn = post.vaultPhotos.some(p => p.user.toString() === req.user.id);
        if (alreadyIn) return res.status(400).json({ message: "Already contributed to this vault" });

        if (!req.file) return res.status(400).json({ message: "Photo is required" });

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const mediaUrl = `${baseUrl}/uploads/${req.file.filename}`;

        const currentUserDoc = await User.findById(req.user.id);
        post.vaultPhotos.push({
            user: req.user.id,
            username: currentUserDoc?.username || "",
            profilePic: currentUserDoc?.profilePic || "",
            mediaUrl,
            addedAt: new Date()
        });
        await post.save();

        res.json({ message: "Photo added to vault!", vaultPhotos: post.vaultPhotos });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: error.message });
    }
});

router.get("/", authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const followingIds = currentUser.following;
        const blockedIds = currentUser.blockedUsers || [];

        // Feed includes own posts and followed users' posts
        const feedUserIds = [req.user.id, ...followingIds];

        // Retrieve posts, excluding blocked users and excluding pending collaborations unless own post
        let posts = await Post.find({
            user: { $in: feedUserIds, $nin: blockedIds },
            $or: [
                { collabPending: { $ne: true } },
                { user: req.user.id }
            ]
        })
        .populate("user", "username profilePic focusMode hideLikes avatarFrameTheme")
        .populate("collaborators", "username profilePic")
        .sort({ createdAt: -1 });

        // Fallback: append suggested/popular posts if timeline is small
        if (posts.length < 10) {
            const suggested = await Post.find({
                user: { $nin: [...feedUserIds, ...blockedIds] },
                collabPending: { $ne: true }
            })
            .populate("user", "username profilePic focusMode hideLikes avatarFrameTheme")
            .populate("collaborators", "username profilePic")
            .sort({ "likes.length": -1 })
            .limit(15);

            // Deduplicate posts
            const existingIds = new Set(posts.map(p => p._id.toString()));
            suggested.forEach(post => {
                if (!existingIds.has(post._id.toString())) {
                    posts.push(post);
                }
            });
        }

        // If it is the main feed, refresh post order appropriately
        if (req.query.feed === "true") {
            const recentCount = 5;
            const recentPosts = posts.slice(0, recentCount);
            const olderPosts = posts.slice(recentCount);

            const shuffle = (arr) => {
                const copy = [...arr];
                for (let i = copy.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [copy[i], copy[j]] = [copy[j], copy[i]];
                }
                return copy;
            };

            posts = [...shuffle(recentPosts), ...shuffle(olderPosts)];
        }

        const postsWithComments = await Promise.all(posts.map(async p => {
            const commentsCount = await Comment.countDocuments({ post: p._id });
            return { ...p.toObject(), commentsCount };
        }));

        res.json(postsWithComments);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
});
router.put(
    "/like/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const post = await Post.findById(req.params.id);

            if (!post) {
                return res.status(404).json({
                    message: "Post not found"
                });
            }

            if (post.likes.includes(req.user.id)) {
                post.likes = post.likes.filter(id => id.toString() !== req.user.id);
                await post.save();
                return res.json({
                    message: "Post unliked",
                    likes: post.likes.length,
                    isLiked: false
                });
            }

            post.likes.push(req.user.id);

            await post.save();

            // Create notification if liking someone else's post
            let notification = null;
            if (post.user.toString() !== req.user.id) {
                notification = new Notification({
                    sender: req.user.id,
                    recipient: post.user,
                    type: "like",
                    post: post._id
                });
                await notification.save();
            }

            res.json({
                message: "Post liked",
                likes: post.likes.length,
                isLiked: true,
                notification
            });

        } catch (error) {

            res.status(500).json({
                message: error.message
            });

        }
    }
);
const Comment = require("../models/Comment");
router.post(
    "/comment/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const { text } = req.body;
            const post = await Post.findById(req.params.id);
            if (!post) {
                return res.status(404).json({ message: "Post not found" });
            }

            // Block comments with sensitive words blocklisted by the post creator
            const User = require("../models/User");
            const postCreator = await User.findById(post.user);
            if (postCreator && postCreator.blockedWords && postCreator.blockedWords.length > 0) {
                const textLower = (text || "").toLowerCase();
                const matchedWord = postCreator.blockedWords.find(word => 
                    word && textLower.includes(word.toLowerCase().trim())
                );
                if (matchedWord) {
                    return res.status(400).json({ 
                        message: `Comment contains blocklisted words defined by the creator.` 
                    });
                }
            }

            const comment = new Comment({
                post: req.params.id,
                user: req.user.id,
                text
            });

            await comment.save();

            // Populate user info for frontend immediate rendering
            const populatedComment = await Comment.findById(comment._id).populate("user", "username profilePic focusMode hideLikes avatarFrameTheme");

            // Create notification if commenting on someone else's post
            let notification = null;
            if (post.user.toString() !== req.user.id) {
                notification = new Notification({
                    sender: req.user.id,
                    recipient: post.user,
                    type: "comment",
                    post: post._id,
                    comment: comment._id
                });
                await notification.save();
            }

            res.status(201).json({
                message: "Comment Added",
                comment: populatedComment,
                notification
            });

        } catch (error) {

            res.status(500).json({
                message: error.message
            });

        }
    }
);
router.get(
    "/comments/:id",
    async (req, res) => {

        try {

            const comments = await Comment.find({
                post: req.params.id
            })
            .populate("user", "username profilePic focusMode hideLikes avatarFrameTheme")
            .sort({ createdAt: -1 });

            res.json(comments);

        } catch (error) {

            res.status(500).json({
                message: error.message
            });

        }
    }
);

router.delete(
    "/comment/:commentId",
    authMiddleware,
    async (req, res) => {
        try {
            const comment = await Comment.findById(req.params.commentId);
            if (!comment) {
                return res.status(404).json({ message: "Comment not found" });
            }

            const post = await Post.findById(comment.post);
            if (!post) {
                return res.status(404).json({ message: "Associated post not found" });
            }

            const isCommentAuthor = comment.user.toString() === req.user.id;
            const isPostAuthor = post.user.toString() === req.user.id;

            if (!isCommentAuthor && !isPostAuthor) {
                return res.status(403).json({ message: "Not authorized to delete this comment" });
            }

            await Comment.findByIdAndDelete(req.params.commentId);

            res.json({ message: "Comment deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

router.put(
    "/comment/like/:commentId",
    authMiddleware,
    async (req, res) => {
        try {
            const comment = await Comment.findById(req.params.commentId);
            if (!comment) {
                return res.status(404).json({ message: "Comment not found" });
            }

            let isLiked = false;
            if (comment.likes.includes(req.user.id)) {
                comment.likes = comment.likes.filter(id => id.toString() !== req.user.id);
                isLiked = false;
            } else {
                comment.likes.push(req.user.id);
                isLiked = true;
            }

            await comment.save();

            // Create notification if liking someone else's comment
            let notification = null;
            if (isLiked && comment.user.toString() !== req.user.id) {
                notification = new Notification({
                    sender: req.user.id,
                    recipient: comment.user,
                    type: "like",
                    post: comment.post,
                    comment: comment._id
                });
                await notification.save();
            }

            res.json({
                message: isLiked ? "Comment liked" : "Comment unliked",
                likes: comment.likes.length,
                isLiked,
                notification
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

// Save / Unsave post
router.put("/save/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        let isSaved = false;
        if (user.savedPosts.includes(post._id)) {
            user.savedPosts = user.savedPosts.filter(id => id.toString() !== post._id.toString());
            post.savesCount = Math.max(0, (post.savesCount || 0) - 1);
            isSaved = false;
        } else {
            user.savedPosts.push(post._id);
            post.savesCount = (post.savesCount || 0) + 1;
            isSaved = true;
        }

        await user.save();
        await post.save();

        res.json({ message: isSaved ? "Post saved" : "Post unsaved", isSaved, savesCount: post.savesCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Explore trending/discovered posts
router.get("/explore", authMiddleware, async (req, res) => {
    try {
        const query = req.query.q || "";
        let filter = {};

        // Exclude blocked users' posts
        const currentUser = await User.findById(req.user.id);
        if (currentUser && currentUser.blockedUsers.length > 0) {
            filter.user = { $nin: currentUser.blockedUsers };
        }

        if (query) {
            // Search hashtags or caption
            if (query.startsWith("#")) {
                const tag = query.substring(1).toLowerCase();
                filter.hashtags = tag;
            } else {
                filter.caption = { $regex: query, $options: "i" };
            }
        }

        const posts = await Post.find({
            ...filter,
            collabPending: { $ne: true }
        })
            .populate("user", "username profilePic focusMode hideLikes avatarFrameTheme")
            .populate("collaborators", "username profilePic")
            .sort({ "likes.length": -1, createdAt: -1 })
            .limit(30);

        const postsWithComments = await Promise.all(posts.map(async p => {
            const commentsCount = await Comment.countDocuments({ post: p._id });
            return { ...p.toObject(), commentsCount };
        }));

        res.json(postsWithComments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reels (Video posts) feed
router.get("/reels", authMiddleware, async (req, res) => {
    try {
        let filter = { mediaType: "video" };
        
        // Exclude blocked users' reels
        const currentUser = await User.findById(req.user.id);
        if (currentUser && currentUser.blockedUsers.length > 0) {
            filter.user = { $nin: currentUser.blockedUsers };
        }

        const reels = await Post.find({
            ...filter,
            collabPending: { $ne: true }
        })
            .populate("user", "username profilePic focusMode hideLikes avatarFrameTheme")
            .populate("collaborators", "username profilePic")
            .sort({ createdAt: -1 })
            .limit(30);

        const reelsWithComments = await Promise.all(reels.map(async p => {
            const commentsCount = await Comment.countDocuments({ post: p._id });
            return { ...p.toObject(), commentsCount };
        }));

        res.json(reelsWithComments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reply to a comment
router.post("/comment/:commentId/reply", authMiddleware, async (req, res) => {
    try {
        const parentComment = await Comment.findById(req.params.commentId);
        if (!parentComment) return res.status(404).json({ message: "Parent comment not found" });

        const { text } = req.body;
        if (!text) return res.status(400).json({ message: "Reply text is required" });

        const reply = new Comment({
            post: parentComment.post,
            user: req.user.id,
            text,
            parentComment: parentComment._id
        });

        await reply.save();
        const populatedReply = await Comment.findById(reply._id).populate("user", "username profilePic focusMode hideLikes avatarFrameTheme");

        // Create notification for comment author if someone replies
        let notification = null;
        if (parentComment.user.toString() !== req.user.id) {
            notification = new Notification({
                sender: req.user.id,
                recipient: parentComment.user,
                type: "comment",
                post: parentComment.post,
                comment: reply._id
            });
            await notification.save();
        }

        res.status(201).json({ message: "Reply added", comment: populatedReply, notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete Post
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Only post owner can delete
        if (post.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to delete this post" });
        }

        await Post.findByIdAndDelete(req.params.id);
        // Clean up post comments
        await Comment.deleteMany({ post: req.params.id });

        res.json({ message: "Post and its comments deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Increment Share Count
router.put("/share/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        post.sharesCount = (post.sharesCount || 0) + 1;
        await post.save();

        res.json({ message: "Post shared successfully", sharesCount: post.sharesCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's liked posts (image & video posts they liked)
router.get("/liked-reels", authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const likedReels = await Post.find({
            mediaType: { $in: ["image", "video"] },
            likes: req.user.id,
            user: { $nin: currentUser.blockedUsers }
        }).populate("user", "username profilePic");
        res.json(likedReels);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Track watched reel
router.post("/watch-reel/:id", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const postId = req.params.id;
        
        // Remove if already watched (to move it to top)
        user.watchedReels = (user.watchedReels || []).filter(id => id && id.toString() !== postId);
        
        // Unshift
        user.watchedReels.unshift(postId);
        
        // Limit to 50
        if (user.watchedReels.length > 50) {
            user.watchedReels = user.watchedReels.slice(0, 50);
        }
        
        await user.save();
        res.json({ message: "Reel added to watch history" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's watched posts history
router.get("/watched-reels", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate({
                path: "watchedReels",
                populate: { path: "user", select: "username profilePic" }
            });
        const history = (user.watchedReels || []).filter(post => post !== null && (post.mediaType === "video" || post.mediaType === "image"));
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single post by ID
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("user", "username profilePic focusMode hideLikes avatarFrameTheme")
            .populate("collaborators", "username profilePic");
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        
        // Exclude if author is blocked by current user
        const currentUser = await User.findById(req.user.id);
        if (currentUser && currentUser.blockedUsers?.includes(post.user._id)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const commentsCount = await Comment.countDocuments({ post: post._id });
        res.json({ ...post.toObject(), commentsCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET Creator Analytics Dashboard
router.get("/analytics/dashboard", authMiddleware, async (req, res) => {
    try {
        // Find all posts created by user or collaborative posts where user is accepted
        const myPosts = await Post.find({
            $or: [
                { user: req.user.id },
                { collaborators: req.user.id, collabPending: false }
            ]
        });
        
        let totalImpressions = 0;
        let totalLikes = 0;
        let totalSaves = 0;
        let totalShares = 0;
        let totalComments = 0;
        
        const postStats = [];
        
        for (const post of myPosts) {
            const commentsCount = await Comment.countDocuments({ post: post._id });
            const likesCount = post.likes ? post.likes.length : 0;
            // Simulated impressions/views
            const viewsCount = post.views || Math.floor(likesCount * 4) + commentsCount + 5;
            const savesCount = post.savesCount || 0;
            const sharesCount = post.sharesCount || 0;
            
            totalImpressions += viewsCount;
            totalLikes += likesCount;
            totalSaves += savesCount;
            totalShares += sharesCount;
            totalComments += commentsCount;
            
            postStats.push({
                postId: post._id,
                caption: post.caption ? (post.caption.substring(0, 30) + (post.caption.length > 30 ? "..." : "")) : "Untitled",
                likes: likesCount,
                comments: commentsCount,
                saves: savesCount,
                views: viewsCount
            });
        }
        
        postStats.sort((a, b) => b.views - a.views);
        
        res.json({
            totalPosts: myPosts.length,
            totalImpressions,
            totalLikes,
            totalComments,
            totalSaves,
            totalShares,
            topPosts: postStats.slice(0, 5)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET outstanding collaboration invites for current user
router.get("/collaborations/invites", authMiddleware, async (req, res) => {
    try {
        const invites = await Post.find({
            collaborators: req.user.id,
            collabPending: true
        }).populate("user", "username profilePic");
        res.json(invites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST respond to a collaboration invite (accept/decline)
router.post("/collaborations/respond", authMiddleware, async (req, res) => {
    try {
        const { postId, accept } = req.body;
        if (!postId) return res.status(400).json({ message: "Post ID is required" });
        
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });
        
        // Verify current user is a collaborator
        const isCollab = post.collaborators.some(id => id.toString() === req.user.id);
        if (!isCollab) {
            return res.status(403).json({ message: "You are not a collaborator on this post" });
        }
        
        if (accept) {
            post.collabPending = false; // Publish/approve!
            await post.save();
            res.json({ message: "Collaboration invitation accepted. The post is now public!", post });
        } else {
            // Decline: remove user from collaborators, and disable collab flag
            post.collaborators = post.collaborators.filter(id => id.toString() !== req.user.id);
            post.collabPending = false;
            await post.save();
            res.json({ message: "Collaboration invitation declined.", post });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
