const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const dns = require("dns");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Set DNS servers to Google's public DNS to resolve MongoDB Atlas SRV querySrv ECONNREFUSED issues
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

// Imports Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const storyRoutes = require("./routes/storyRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
app.set("socketio", io);

// Configure Rate Limiting (DDoS protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: { message: "Too many requests from this IP, please try again later." }
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/", limiter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
    res.send("VibeShare API is running...");
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected ✅");
})
.catch((err) => {
    console.log("MongoDB Connection Error ❌:", err);
});

// Track Online Users (userId -> socketId)
const onlineUsers = new Map();
app.set("onlineUsers", onlineUsers);

// Helper to broadcast online status considering showActiveStatus setting
const broadcastOnlineUsers = async () => {
    try {
        const User = require("./models/User");
        const activeUserIds = Array.from(onlineUsers.keys());
        
        // Find their showActiveStatus setting
        const users = await User.find({ _id: { $in: activeUserIds } }, "_id showActiveStatus");
        
        // Users who disabled active status
        const hiddenUsers = new Set(
            users
                .filter(u => u.showActiveStatus === false)
                .map(u => u._id.toString())
        );

        // Loop over each connected socket
        for (const [onlineUserId, socketId] of onlineUsers.entries()) {
            const userRecord = users.find(u => u._id.toString() === onlineUserId);
            const showsStatus = userRecord ? userRecord.showActiveStatus !== false : true;

            if (!showsStatus) {
                // If this user turned off their active status, they see empty online list
                io.to(socketId).emit("update-online-users", []);
            } else {
                // Otherwise, they see everyone online except those who turned it off
                const visibleUsers = activeUserIds.filter(id => !hiddenUsers.has(id));
                io.to(socketId).emit("update-online-users", visibleUsers);
            }
        }
    } catch (err) {
        console.error("Error broadcasting online users:", err);
    }
};
app.set("broadcastOnlineUsers", broadcastOnlineUsers);

// Track Active Call details (callerId -> callInfo)
const activeCalls = new Map();

// Track active canvas rooms
const activeCanvasRooms = new Set();

io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    // Register active user session
    socket.on("register-user", async (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId; // Track association for disconnect handlers
        socket.join(userId); // Join personal room for notifications/direct-messages
        console.log(`User ${userId} registered to socket ${socket.id}`);
        // Broadcast updated online status
        await broadcastOnlineUsers();
    });

    // Handle typing status
    socket.on("typing-status", (data) => {
        const { senderId, recipientId, isTyping } = data;
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket) {
            io.to(recipientSocket).emit("typing-status-update", { senderId, isTyping });
        }
    });

    // Real-time Chat message
    socket.on("send-message", async (data) => {
        const { senderId, recipientId, text, mediaUrl, voiceUrl } = data;
        try {
            const Message = require("./models/Message");
            const newMsg = new Message({
                sender: senderId,
                recipient: recipientId,
                text: text || "",
                mediaUrl: mediaUrl || "",
                voiceUrl: voiceUrl || ""
            });
            await newMsg.save();

            // Emit to recipient's room
            io.to(recipientId).emit("receive-message", newMsg);
            // Emit to sender for sync
            io.to(senderId).emit("receive-message", newMsg);

            // Trigger message notification if recipient is not active on socket
            const Notification = require("./models/Notification");
            const notification = new Notification({
                sender: senderId,
                recipient: recipientId,
                type: "message"
            });
            await notification.save();
            
            // Push message notification alert (skip if recipient is in focus mode)
            const User = require("./models/User");
            const recipientUser = await User.findById(recipientId);
            if (!recipientUser || !recipientUser.focusMode) {
                io.to(recipientId).emit("receive-notification", notification);
            }

        } catch (error) {
            console.error("Socket send-message error:", error.message);
        }
    });

    // --- Group Chat Sockets ---
    socket.on("join-group", (groupId) => {
        socket.join(groupId);
        console.log(`Socket ${socket.id} joined group room ${groupId}`);
    });

    socket.on("send-group-message", async (data) => {
        const { groupId, senderId, text, mediaUrl, voiceUrl } = data;
        try {
            const GroupMessage = require("./models/GroupMessage");
            const newMsg = new GroupMessage({
                group: groupId,
                sender: senderId,
                text: text || "",
                mediaUrl: mediaUrl || "",
                voiceUrl: voiceUrl || ""
            });
            await newMsg.save();

            const populatedMsg = await newMsg.populate("sender", "username profilePic");
            io.to(groupId).emit("receive-group-message", populatedMsg);
        } catch (error) {
            console.error("Socket send-group-message error:", error.message);
        }
    });

    // --- Call Signaling Sockets ---
    socket.on("call-user", (data) => {
        const { userToCall, signalData, from, name, isVideo } = data;
        
        // Track the initiated call
        activeCalls.set(from, {
            callerId: from,
            recipientId: userToCall,
            isVideo,
            startTime: Date.now(),
            callAccepted: false
        });

        const recipientSocket = onlineUsers.get(userToCall);
        if (recipientSocket) {
            io.to(recipientSocket).emit("incoming-call", {
                signal: signalData,
                from,
                name,
                isVideo
            });
        }
    });

    socket.on("accept-call", (data) => {
        const { to, signal } = data; // 'to' is the callerId
        const callInfo = activeCalls.get(to);
        if (callInfo) {
            callInfo.callAccepted = true;
            callInfo.startTime = Date.now(); // reset start time to accepted time for accurate duration
        }

        const recipientSocket = onlineUsers.get(to);
        if (recipientSocket) {
            io.to(recipientSocket).emit("call-accepted", { signal });
        }
    });

    socket.on("decline-call", async (data) => {
        const { to } = data; // 'to' is the callerId
        const callInfo = activeCalls.get(to);
        if (callInfo) {
            try {
                const Message = require("./models/Message");
                const text = `${callInfo.isVideo ? "🎥" : "📞"} Declined ${callInfo.isVideo ? "video" : "voice"} call`;
                const newMsg = new Message({
                    sender: callInfo.callerId,
                    recipient: callInfo.recipientId,
                    text: text
                });
                await newMsg.save();

                io.to(callInfo.callerId).emit("receive-message", newMsg);
                io.to(callInfo.recipientId).emit("receive-message", newMsg);
            } catch (err) {
                console.error("Error saving declined call message:", err);
            }
            activeCalls.delete(to);
        }

        const recipientSocket = onlineUsers.get(to);
        if (recipientSocket) {
            io.to(recipientSocket).emit("call-declined");
        }
    });

    socket.on("end-call", async (data) => {
        const { to } = data; // 'to' is the other participant's ID
        
        let callKey = null;
        let callInfo = null;

        // Search active calls by comparing participant IDs
        for (const [key, info] of activeCalls.entries()) {
            if ((info.callerId === to && info.recipientId === socket.userId) ||
                (info.callerId === socket.userId && info.recipientId === to)) {
                callInfo = info;
                callKey = key;
                break;
            }
        }

        if (callInfo) {
            try {
                const Message = require("./models/Message");
                let text = "";
                if (callInfo.callAccepted) {
                    const durationMs = Date.now() - callInfo.startTime;
                    const durationSecs = Math.floor(durationMs / 1000);
                    const minutes = Math.floor(durationSecs / 60);
                    const seconds = durationSecs % 60;
                    const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                    text = `${callInfo.isVideo ? "🎥" : "📞"} ${callInfo.isVideo ? "Video" : "Voice"} call ended (${durationStr})`;
                } else {
                    // Call was canceled by caller before accepted
                    text = `${callInfo.isVideo ? "🎥" : "📞"} Missed ${callInfo.isVideo ? "video" : "voice"} call`;
                }

                const newMsg = new Message({
                    sender: callInfo.callerId,
                    recipient: callInfo.recipientId,
                    text: text
                });
                await newMsg.save();

                io.to(callInfo.callerId).emit("receive-message", newMsg);
                io.to(callInfo.recipientId).emit("receive-message", newMsg);
            } catch (err) {
                console.error("Error saving end call message:", err);
            }
            activeCalls.delete(callKey);
        }

        const recipientSocket = onlineUsers.get(to);
        if (recipientSocket) {
            io.to(recipientSocket).emit("call-ended");
        }
    });

    // Real-time notification pushing triggered by REST API calls
    socket.on("push-notification", async (data) => {
        const { recipientId, notification } = data;
        try {
            const User = require("./models/User");
            const recipientUser = await User.findById(recipientId);
            if (recipientUser && recipientUser.focusMode) {
                console.log(`Notification muted for user ${recipientId} due to Focus Mode.`);
                return;
            }
        } catch (err) {
            console.error("Error in focus mode notification check:", err);
        }
        io.to(recipientId).emit("receive-notification", notification);
    });

    // Broadcast post updates (like, comment, delete, share)
    socket.on("post-update", (data) => {
        socket.broadcast.emit("post-updated", data);
    });

    // Broadcast story updates (story viewed)
    socket.on("story-update", (data) => {
        socket.broadcast.emit("story-updated", data);
    });

    // --- Collaborative Canvas Events ---
    // Create a new canvas drawing room
    socket.on("create-canvas", (roomId) => {
        activeCanvasRooms.add(roomId);
        socket.join(`canvas:${roomId}`);
        console.log(`Canvas room created: ${roomId} 🎨`);
    });

    // Join a canvas drawing room with verification callback
    socket.on("join-canvas", (roomId, callback) => {
        if (activeCanvasRooms.has(roomId)) {
            socket.join(`canvas:${roomId}`);
            console.log(`User joined canvas room: ${roomId} 🎨`);
            if (callback) callback({ success: true });
        } else {
            if (callback) callback({ success: false, message: "Invalid Room ID" });
        }
    });

    // Broadcast drawing strokes to other users in the same canvas room
    socket.on("canvas-draw", ({ roomId, ...strokeData }) => {
        socket.to(`canvas:${roomId}`).emit("canvas-draw", strokeData);
    });

    // Broadcast clear canvas to everyone in the room
    socket.on("canvas-clear", (roomId) => {
        socket.to(`canvas:${roomId}`).emit("canvas-clear");
    });

    // Broadcast cursor positions for collaborative awareness
    socket.on("canvas-cursor", ({ roomId, ...cursorData }) => {
        socket.to(`canvas:${roomId}`).emit("canvas-cursor", cursorData);
    });

    socket.on("disconnect", () => {
        // Clean up active calls involving the disconnected user
        const userId = socket.userId;
        if (userId) {
            for (const [key, info] of activeCalls.entries()) {
                if (info.callerId === userId || info.recipientId === userId) {
                    try {
                        const Message = require("./models/Message");
                        let text = "";
                        if (info.callAccepted) {
                            const durationMs = Date.now() - info.startTime;
                            const durationSecs = Math.floor(durationMs / 1000);
                            const minutes = Math.floor(durationSecs / 60);
                            const seconds = durationSecs % 60;
                            const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                            text = `${info.isVideo ? "🎥" : "📞"} ${info.isVideo ? "Video" : "Voice"} call ended (${durationStr})`;
                        } else {
                            text = `${info.isVideo ? "🎥" : "📞"} Missed ${info.isVideo ? "video" : "voice"} call`;
                        }

                        const newMsg = new Message({
                            sender: info.callerId,
                            recipient: info.recipientId,
                            text: text
                        });
                        newMsg.save().then(() => {
                            io.to(info.callerId).emit("receive-message", newMsg);
                            io.to(info.recipientId).emit("receive-message", newMsg);
                        });
                    } catch (err) {
                        console.error("Error saving call ended on disconnect:", err);
                    }

                    // Alert the other participant
                    const otherId = info.callerId === userId ? info.recipientId : info.callerId;
                    const recipientSocket = onlineUsers.get(otherId);
                    if (recipientSocket) {
                        io.to(recipientSocket).emit("call-ended");
                    }
                    activeCalls.delete(key);
                }
            }
        }

        // Remove user from online listing
        for (const [onlineUserId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(onlineUserId);
                console.log(`User ${onlineUserId} disconnected`);
                break;
            }
        }
        // Clean up empty canvas rooms
        for (const roomId of activeCanvasRooms) {
            const clients = io.sockets.adapter.rooms.get(`canvas:${roomId}`);
            if (!clients || clients.size === 0) {
                activeCanvasRooms.delete(roomId);
                console.log(`Canvas room deleted (empty): ${roomId} 🧹`);
            }
        }

        broadcastOnlineUsers();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} ✅`);
});