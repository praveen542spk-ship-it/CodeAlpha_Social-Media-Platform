const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    bio: {
        type: String,
        default: ""
    },

    profilePic: {
        type: String,
        default: ""
    },
    
    coverPic: {
        type: String,
        default: ""
    },

    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    isPrivate: {
        type: Boolean,
        default: false
    },

    savedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    }],

    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    focusMode: {
        type: Boolean,
        default: false
    },

    savedCollections: [{
        name: { type: String, required: true },
        posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }]
    }],

    is2FAEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        default: ""
    },
    chatThemes: {
        type: Map,
        of: String,
        default: {}
    },
    moodStatus: {
        mood: { type: String, default: "" },
        emoji: { type: String, default: "" },
        gradient: { type: String, default: "" }
    },
    watchedReels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    }],
    hideLikes: {
        type: Boolean,
        default: false
    },
    blockedWords: [{
        type: String
    }],
    avatarFrameTheme: {
        type: String,
        default: "default"
    },
    incognitoStoryViewer: {
        type: Boolean,
        default: false
    },
    mutedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    quickReplies: [{
        shortcut: { type: String, required: true },
        message: { type: String, required: true }
    }],
    profileSong: {
        title: { type: String },
        artist: { type: String },
        youtubeId: { type: String },
        startTime: { type: Number, default: 0 }
    },
    screenTimeLimit: {
        type: Number,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isVerifiedRequested: {
        type: Boolean,
        default: false
    },
    closeFriends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    showActiveStatus: {
        type: Boolean,
        default: true
    },
    websiteLinks: [{
        type: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);