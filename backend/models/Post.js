const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    caption: {
        type: String,
        required: true
    },

    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    mediaUrl: {
        type: String,
        default: ""
    },

    mediaType: {
        type: String,
        enum: ["none", "image", "video"],
        default: "none"
    },

    hashtags: [{
        type: String
    }],

    location: {
        type: String,
        default: ""
    },

    savesCount: {
        type: Number,
        default: 0
    },

    sharesCount: {
        type: Number,
        default: 0
    },

    views: {
        type: Number,
        default: 0
    },

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
    postType: {
        type: String,
        enum: ["text", "image", "video", "code", "vault"],
        default: "text"
    },
    codeSnippet: {
        language: { type: String, default: "" },
        code: { type: String, default: "" }
    },
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    collabPending: {
        type: Boolean,
        default: false
    },
    unlockDate: {
        type: Date,
        default: null
    },
    // Give-to-Get Photo Vault
    vaultPhotos: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: { type: String },
        profilePic: { type: String },
        mediaUrl: { type: String },
        addedAt: { type: Date, default: Date.now }
    }]
},
{
    timestamps: true
}
);

module.exports = mongoose.model("Post", postSchema);