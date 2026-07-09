const express = require("express");
const Message = require("../models/Message");
const Group = require("../models/Group");
const GroupMessage = require("../models/GroupMessage");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get conversation history with a user
router.get("/history/:userId", authMiddleware, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user.id;

        // Fetch messages between sender and recipient
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        // Mark incoming messages as read
        await Message.updateMany(
            { sender: otherUserId, recipient: currentUserId, isRead: false },
            { $set: { isRead: true } }
        );

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get active chat threads
router.get("/chats", authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Find all messages involving current user
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { recipient: currentUserId }]
        })
        .sort({ createdAt: -1 });

        // Extract unique partners and aggregate last message
        const chatPartnersMap = {};
        messages.forEach(msg => {
            const partnerId = msg.sender.toString() === currentUserId ? msg.recipient.toString() : msg.sender.toString();
            if (!chatPartnersMap[partnerId]) {
                chatPartnersMap[partnerId] = msg;
            }
        });

        // Populate partner details
        const threadList = [];
        for (const [partnerId, lastMsg] of Object.entries(chatPartnersMap)) {
            const partner = await User.findById(partnerId).select("username profilePic focusMode");
            if (partner) {
                // Count unread messages from this partner
                const unreadCount = await Message.countDocuments({
                    sender: partnerId,
                    recipient: currentUserId,
                    isRead: false
                });

                threadList.push({
                    partner,
                    lastMessage: lastMsg,
                    unreadCount
                });
            }
        }

        res.json(threadList);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new group chat
router.post("/groups", authMiddleware, async (req, res) => {
    try {
        const { name, memberIds, avatarUrl } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: "Group name is required" });
        
        // creator is automatically a member
        const members = [req.user.id];
        if (Array.isArray(memberIds)) {
            memberIds.forEach(id => {
                if (id && !members.includes(id)) {
                    members.push(id);
                }
            });
        }
        
        const group = new Group({
            name: name.trim(),
            creator: req.user.id,
            members,
            avatarUrl: avatarUrl || ""
        });
        
        await group.save();
        
        // Populate members details
        const populatedGroup = await Group.findById(group._id).populate("members", "username profilePic");
        res.status(201).json(populatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fetch active group threads for current user
router.get("/groups", authMiddleware, async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user.id }).populate("members", "username profilePic");
        
        // Find last message for each group
        const groupThreads = [];
        for (const group of groups) {
            const lastMsg = await GroupMessage.findOne({ group: group._id })
                .sort({ createdAt: -1 })
                .populate("sender", "username profilePic");
            
            groupThreads.push({
                group,
                lastMessage: lastMsg || { text: "Group created", createdAt: group.createdAt }
            });
        }
        
        // Sort threads by last message time
        groupThreads.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
        res.json(groupThreads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fetch group message history
router.get("/groups/:id/history", authMiddleware, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findOne({ _id: groupId, members: req.user.id });
        if (!group) return res.status(403).json({ message: "Not a member of this group" });
        
        const messages = await GroupMessage.find({ group: groupId })
            .sort({ createdAt: 1 })
            .populate("sender", "username profilePic");
            
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search text messages in a conversation
router.get("/search/:userId", authMiddleware, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user.id;
        const query = req.query.q || "";
        
        if (!query.trim()) return res.json([]);
        
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: currentUserId }
            ],
            text: { $regex: query, $options: "i" }
        }).sort({ createdAt: 1 });
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get shared media gallery in a conversation
router.get("/gallery/:userId", authMiddleware, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user.id;
        
        // Find messages that have media or voice attachments
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: currentUserId }
            ],
            $or: [
                { mediaUrl: { $ne: "" } },
                { voiceUrl: { $ne: "" } }
            ]
        }).sort({ createdAt: -1 });
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search messages in a group
router.get("/groups/:groupId/search", authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        const query = req.query.q || "";
        
        const group = await Group.findOne({ _id: groupId, members: req.user.id });
        if (!group) return res.status(403).json({ message: "Not a member of this group" });
        
        if (!query.trim()) return res.json([]);
        
        const messages = await GroupMessage.find({
            group: groupId,
            text: { $regex: query, $options: "i" }
        }).populate("sender", "username profilePic").sort({ createdAt: 1 });
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get shared media gallery in a group
router.get("/groups/:groupId/gallery", authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findOne({ _id: groupId, members: req.user.id });
        if (!group) return res.status(403).json({ message: "Not a member of this group" });
        
        const messages = await GroupMessage.find({
            group: groupId,
            $or: [
                { mediaUrl: { $ne: "" } },
                { voiceUrl: { $ne: "" } }
            ]
        }).populate("sender", "username profilePic").sort({ createdAt: -1 });
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a private message
router.delete("/:messageId", authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Only sender can delete their messages
        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }

        await Message.findByIdAndDelete(messageId);

        // Notify via socket
        const io = req.app.get("socketio");
        if (io) {
            io.to(message.sender.toString()).emit("message-deleted", { 
                messageId, 
                senderId: message.sender.toString(), 
                recipientId: message.recipient.toString() 
            });
            io.to(message.recipient.toString()).emit("message-deleted", { 
                messageId, 
                senderId: message.sender.toString(), 
                recipientId: message.recipient.toString() 
            });
        }

        res.json({ success: true, message: "Message deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a group message
router.delete("/group/:messageId", authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await GroupMessage.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Group message not found" });
        }

        // Only sender can delete their messages
        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }

        await GroupMessage.findByIdAndDelete(messageId);

        // Notify via socket
        const io = req.app.get("socketio");
        if (io) {
            io.to(message.group.toString()).emit("group-message-deleted", { 
                messageId, 
                groupId: message.group.toString() 
            });
        }

        res.json({ success: true, message: "Group message deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bulk delete private messages
router.post("/bulk-delete", authMiddleware, async (req, res) => {
    try {
        const { messageIds } = req.body;
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ message: "No message IDs provided" });
        }

        // Find messages to ensure ownership
        const messages = await Message.find({
            _id: { $in: messageIds },
            sender: req.user.id
        });

        const deletableIds = messages.map(m => m._id.toString());
        if (deletableIds.length === 0) {
            return res.status(403).json({ message: "No authorized messages to delete" });
        }

        // Delete from database
        await Message.deleteMany({ _id: { $in: deletableIds } });

        // Notify via socket
        const io = req.app.get("socketio");
        if (io) {
            const recipientMap = {};
            messages.forEach(m => {
                const recipientId = m.recipient.toString();
                if (!recipientMap[recipientId]) {
                    recipientMap[recipientId] = [];
                }
                recipientMap[recipientId].push(m._id.toString());
            });

            // Emit to sender
            io.to(req.user.id).emit("messages-bulk-deleted", { messageIds: deletableIds });

            // Emit to each recipient
            for (const [recipientId, ids] of Object.entries(recipientMap)) {
                io.to(recipientId).emit("messages-bulk-deleted", { messageIds: ids });
            }
        }

        res.json({ success: true, message: `${deletableIds.length} messages deleted successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bulk delete group messages
router.post("/group/bulk-delete", authMiddleware, async (req, res) => {
    try {
        const { messageIds } = req.body;
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ message: "No message IDs provided" });
        }

        // Find group messages to ensure ownership
        const messages = await GroupMessage.find({
            _id: { $in: messageIds },
            sender: req.user.id
        });

        const deletableIds = messages.map(m => m._id.toString());
        if (deletableIds.length === 0) {
            return res.status(403).json({ message: "No authorized messages to delete" });
        }

        // Delete from database
        await GroupMessage.deleteMany({ _id: { $in: deletableIds } });

        // Notify via socket
        const io = req.app.get("socketio");
        if (io) {
            const groupMap = {};
            messages.forEach(m => {
                const groupId = m.group.toString();
                if (!groupMap[groupId]) {
                    groupMap[groupId] = [];
                }
                groupMap[groupId].push(m._id.toString());
            });

            // Emit to each group room
            for (const [groupId, ids] of Object.entries(groupMap)) {
                io.to(groupId).emit("group-messages-bulk-deleted", { messageIds: ids, groupId });
            }
        }

        res.json({ success: true, message: `${deletableIds.length} group messages deleted successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
