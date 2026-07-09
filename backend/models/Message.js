const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    text: {
        type: String,
        default: ""
    },
    mediaUrl: {
        type: String,
        default: ""
    },
    mediaType: {
        type: String,
        enum: ["image", "video", ""],
        default: ""
    },
    voiceUrl: {
        type: String,
        default: ""
    },
    isStoryMention: {
        type: Boolean,
        default: false
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Message", messageSchema);
