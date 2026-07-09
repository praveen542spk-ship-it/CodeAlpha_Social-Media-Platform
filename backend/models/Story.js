const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    mediaUrl: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ["image", "video"],
        required: true
    },
    viewers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        viewedAt: {
            type: Date,
            default: Date.now
        }
    }],
    music: {
        title: String,
        artist: String,
        url: String,
        startTime: {
            type: Number,
            default: 0
        }
    },
    videoTrim: {
        startTime: {
            type: Number,
            default: 0
        },
        endTime: {
            type: Number,
            default: 0
        }
    },
    caption: {
        type: String,
        default: ""
    },
    textOverlay: {
        text: { type: String, default: "" },
        x: { type: Number, default: 50 },
        y: { type: Number, default: 50 },
        color: { type: String, default: "#ffffff" },
        fontFamily: { type: String, default: "sans-serif" }
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    mediaAdjust: {
        scale: { type: Number, default: 1 },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    },
    isCloseFriendsOnly: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }
}, {
    timestamps: true
});

// Create a TTL index to delete the document when expiresAt time is reached
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Story", storySchema);
