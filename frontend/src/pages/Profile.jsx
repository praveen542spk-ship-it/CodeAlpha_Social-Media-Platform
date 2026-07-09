import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { 
  Grid, Film, Bookmark, Settings, Lock, Eye, EyeOff, Folder, Plus,
  Edit3, X, UserMinus, MessageSquare, Trash, Heart, MessageCircle, MoreVertical, Music, Check, Award, Image,
  Link, VolumeX, Volume2, UserCheck, Share2, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SaveToCollectionModal from "../components/SaveToCollectionModal";
import MusicLibrary from "../components/MusicLibrary";
import { useTheme } from "../context/ThemeContext";

const Profile = ({ navigateTo, userId, initialTab }) => {
  const { currentUser, token, updateProfile, togglePrivacy, blockUser, toggleFollowUser, fetchUserProfile, refreshCurrentUser, API_URL } = useAuth();
  const { socket } = useSocket();
  const { darkMode, amoledMode, toggleAmoledMode } = useTheme();
  const [profileUser, setProfileUser] = useState(null);
  const [showProfileMusicPicker, setShowProfileMusicPicker] = useState(false);
  const [profileSongMuted, setProfileSongMuted] = useState(true);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || "posts"); // posts, reels, saved, settings

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      if (initialTab === "settings") {
        setSettingsSubTab("general");
      }
    }
  }, [initialTab]);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editPic, setEditPic] = useState("");
  const [editCover, setEditCover] = useState("");
  const [editLinks, setEditLinks] = useState(["", "", ""]);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeDropdownPostId, setActiveDropdownPostId] = useState(null);
  const [savingPostForCollection, setSavingPostForCollection] = useState(null);

  // 3-dot Profile options states
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showProfileShareModal, setShowProfileShareModal] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [shareThreads, setShareThreads] = useState([]);
  const [shareThreadsLoading, setShareThreadsLoading] = useState(false);
  const [sentShareUsers, setSentShareUsers] = useState(new Set());

  // Creator Analytics States
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Collaboration Invites States
  const [collabInvites, setCollabInvites] = useState([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [setup2FASecret, setSetup2FASecret] = useState("");

  // Saved Collections States
  const [savedSubTab, setSavedSubTab] = useState("all"); // all, collections
  const [activeCollectionName, setActiveCollectionName] = useState(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [showManagePostsModal, setShowManagePostsModal] = useState(false);

  // Settings & Activity States
  const [settingsSubTab, setSettingsSubTab] = useState("general"); // general, blocked, muted, liked, watched, collab
  const [blockedUsersList, setBlockedUsersList] = useState([]);
  const [mutedUsersList, setMutedUsersList] = useState([]);
  const [likedReelsList, setLikedReelsList] = useState([]);
  const [watchedReelsList, setWatchedReelsList] = useState([]);
  const [closeFriendsList, setCloseFriendsList] = useState([]);
  const [cfSearchQuery, setCfSearchQuery] = useState("");
  const [activityLoading, setActivityLoading] = useState(false);
  const [newBlocklistWord, setNewBlocklistWord] = useState("");
  const [newShortcut, setNewShortcut] = useState("");
  const [newQuickReplyMessage, setNewQuickReplyMessage] = useState("");

  // Cropper States
  const [imageToCrop, setImageToCrop] = useState(null);
  const [cropType, setCropType] = useState("avatar"); // avatar or cover
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset edit states to match profileUser whenever the edit modal opens
  useEffect(() => {
    if (showEditModal && profileUser) {
      setEditBio(profileUser.bio || "");
      setEditPic(profileUser.profilePic || "");
      setEditCover(profileUser.coverPic || "");
      const links = profileUser.websiteLinks || [];
      setEditLinks([...links, "", "", ""].slice(0, 3));
    }
  }, [showEditModal, profileUser]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result);
      setCropType("avatar");
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result);
      setCropType("cover");
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = () => {
    try {
      const img = document.getElementById("source-crop-image");
      if (!img) {
        alert("Image not found!");
        setImageToCrop(null);
        return;
      }
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (cropType === "avatar") {
        canvas.width = 300;
        canvas.height = 300;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 300, 300);
        ctx.save();
        ctx.translate(150 + panX, 150 + panY);
        ctx.scale(zoom, zoom);
        const aspect = img.naturalWidth / img.naturalHeight;
        let dw, dh;
        if (aspect >= 1) {
          dh = 300;
          dw = 300 * aspect;
        } else {
          dw = 300;
          dh = 300 / aspect;
        }
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      } else {
        canvas.width = 800;
        canvas.height = 300;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 800, 300);
        ctx.save();
        ctx.translate(400 + (panX * (800 / 300)), 150 + (panY * (300 / 112.5)));
        ctx.scale(zoom, zoom);
        const aspect = img.naturalWidth / img.naturalHeight;
        let dw, dh;
        if (aspect >= 2.66) {
          dh = 300;
          dw = 300 * aspect;
        } else {
          dw = 800;
          dh = 800 / aspect;
        }
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      }
      
      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
      if (cropType === "avatar") {
        setEditPic(croppedBase64);
      } else {
        setEditCover(croppedBase64);
      }
      setImageToCrop(null);
    } catch (err) {
      console.error("Canvas cropping error:", err);
      alert("Error while cropping image. Please try again.");
      setImageToCrop(null);
    }
  };

  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  
  // Verification request form states
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verifyFullName, setVerifyFullName] = useState("");
  const [verifyCategory, setVerifyCategory] = useState("Creator");
  const [verifyProof, setVerifyProof] = useState("");

  const triggerConfetti = () => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ["#8b5cf6", "#ec4899", "#10b981", "#3b82f6", "#f59e0b"];
    
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0
      });
    }
    
    let animationId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let remaining = false;
      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 5;
        
        if (p.y <= canvas.height) {
          remaining = true;
          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
          ctx.stroke();
        }
      });
      
      if (remaining) {
        animationId = requestAnimationFrame(draw);
      } else {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }
    };
    draw();
  };

  const isOwnProfile = userId === currentUser._id;

  const loadProfileDetails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Get profile metadata
      const profile = await fetchUserProfile(userId);
      setProfileUser(profile);
      setEditBio(profile.bio || "");
      setEditPic(profile.profilePic || "");
      setEditCover(profile.coverPic || "");
      const links = profile.websiteLinks || [];
      const paddedLinks = [...links, "", "", ""].slice(0, 3);
      setEditLinks(paddedLinks);

      // 2. Fetch posts
      const res = await fetch(`${API_URL}/posts`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const allPosts = await res.json();
        setPosts(allPosts.filter(p => p.user._id === userId));

        // If own profile, also load saved posts
        if (isOwnProfile) {
          setSavedPosts(allPosts.filter(p => currentUser.savedPosts?.includes(p._id)));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Click outside listener to close 3-dot dropdown
  useEffect(() => {
    if (!showOptionsDropdown) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".profile-options-dropdown")) {
        setShowOptionsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showOptionsDropdown]);

  const handleMuteToggle = async () => {
    try {
      const res = await fetch(`${API_URL}/users/mute/${profileUser._id}`, {
        method: "PUT",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        await refreshCurrentUser();
        setShowOptionsDropdown(false);
      }
    } catch (err) {
      console.error("Error toggling mute status:", err);
    }
  };

  const fetchShareThreads = async () => {
    setShareThreadsLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages/threads`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setShareThreads(await res.json());
      }
    } catch (err) {
      console.error("Error fetching share threads:", err);
    } finally {
      setShareThreadsLoading(false);
    }
  };

  useEffect(() => {
    if (showProfileShareModal) {
      fetchShareThreads();
      setSentShareUsers(new Set());
      setShareSearchQuery("");
    }
  }, [showProfileShareModal]);

  const handleSendProfileLink = async (user) => {
    if (sentShareUsers.has(user._id)) return;
    
    const profileUrl = `${window.location.origin}/profile/${profileUser._id}`;
    
    socket?.emit("send-message", {
      senderId: currentUser._id,
      recipientId: user._id,
      text: profileUrl
    });

    setSentShareUsers(prev => {
      const next = new Set(prev);
      next.add(user._id);
      return next;
    });
  };

  const handleCopyProfileLink = async () => {
    const profileUrl = `${window.location.origin}/profile/${profileUser._id}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      alert("Profile link copied to clipboard!");
      setShowOptionsDropdown(false);
    } catch (err) {
      console.error("Failed to copy profile link:", err);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/users/blocked`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedUsersList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchLikedReels = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/posts/liked-reels`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        setLikedReelsList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchWatchedReels = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/posts/watched-reels`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        setWatchedReelsList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await blockUser(userId);
      fetchBlockedUsers();
      loadProfileDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMutedUsers = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/users/muted`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        setMutedUsersList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleUnmute = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/users/mute/${userId}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        fetchMutedUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCloseFriends = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/users/close-friends`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        setCloseFriendsList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleToggleCloseFriend = async (targetUserId) => {
    try {
      const res = await fetch(`${API_URL}/users/close-friends/toggle/${targetUserId}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        setCloseFriendsList(data.closeFriends);
        // Silently update profile user state
        setProfileUser(prev => ({
          ...prev,
          closeFriends: data.closeFriends.map(u => u._id)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserSettings = async (updatedFields) => {
    try {
      const res = await fetch(`${API_URL}/users/settings/update`, {
        method: "PUT",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const data = await res.json();
        setProfileUser(data.user);
        refreshCurrentUser();
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_URL}/posts/analytics/dashboard`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setAnalyticsData(await res.json());
      }
    } catch (err) {
      console.error("Error fetching creator analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchCollabInvites = async () => {
    setCollabLoading(true);
    try {
      const res = await fetch(`${API_URL}/posts/collaborations/invites`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setCollabInvites(await res.json());
      }
    } catch (err) {
      console.error("Error fetching collab invites:", err);
    } finally {
      setCollabLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      const res = await fetch(`${API_URL}/users/2fa/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        }
      });
      if (res.ok) {
        const data = await res.json();
        await refreshCurrentUser();
        // Update local user state
        setProfileUser(prev => ({
          ...prev,
          is2FAEnabled: data.is2FAEnabled
        }));
        if (data.is2FAEnabled) {
          setSetup2FASecret(data.secret);
        } else {
          setSetup2FASecret("");
        }
      }
    } catch (err) {
      console.error("Error toggling 2FA:", err);
    }
  };

  const handleCollabRespond = async (postId, accept) => {
    try {
      const res = await fetch(`${API_URL}/posts/collaborations/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ postId, accept })
      });
      if (res.ok) {
        fetchCollabInvites();
        loadProfileDetails();
      }
    } catch (err) {
      console.error("Error responding to collab invite:", err);
    }
  };

  const getAnalyticsDashboard = () => {
    if (analyticsLoading) {
      return (
        <div className="col-span-3 flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
        </div>
      );
    }
    if (!analyticsData) {
      return (
        <div className="col-span-3 text-center py-12 text-slate-500 font-semibold">
          No analytics data available.
        </div>
      );
    }
    
    const maxViews = analyticsData.topPosts && analyticsData.topPosts.length > 0 ? analyticsData.topPosts[0].views : 1;
    
    return (
      <div className="col-span-3 flex flex-col gap-6 w-full py-4">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Impressions</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{analyticsData.totalImpressions.toLocaleString()}</span>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Likes</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{analyticsData.totalLikes.toLocaleString()}</span>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Comments</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{analyticsData.totalComments.toLocaleString()}</span>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Saves Count</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{analyticsData.totalSaves.toLocaleString()}</span>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Shares Count</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{analyticsData.totalShares.toLocaleString()}</span>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Posts</span>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{analyticsData.totalPosts}</span>
          </div>
        </div>

        {/* Top Post performance comparison bar graph */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-zinc-800/80 flex flex-col gap-4 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Top Performing Posts</h3>
          <div className="flex flex-col gap-4">
            {analyticsData.topPosts && analyticsData.topPosts.length > 0 ? (
              analyticsData.topPosts.map(post => {
                const pct = (post.views / maxViews) * 100;
                return (
                  <div key={post.postId} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-650 dark:text-slate-350 truncate max-w-[200px] sm:max-w-md">"{post.caption}"</span>
                      <span className="text-slate-500">{post.views} views</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-zinc-800/85 rounded-full overflow-hidden">
                      <div className="h-full bg-vibe-gradient rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="flex gap-4 text-[10px] text-slate-400 font-bold">
                      <span>❤️ {post.likes} likes</span>
                      <span>💬 {post.comments} comments</span>
                      <span>🔖 {post.saves} saves</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-slate-500 py-4">Publish posts to generate comparative insights.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadProfileDetails();
  }, [userId, currentUser.savedPosts]);

  useEffect(() => {
    if (isOwnProfile) {
      if (activeTab === "settings") {
        fetchCollabInvites();
        if (settingsSubTab === "blocked") {
          fetchBlockedUsers();
        } else if (settingsSubTab === "muted") {
          fetchMutedUsers();
        } else if (settingsSubTab === "liked") {
          fetchLikedReels();
        } else if (settingsSubTab === "watched") {
          fetchWatchedReels();
        } else if (settingsSubTab === "closefriends") {
          fetchCloseFriends();
        } else if (settingsSubTab === "analytics") {
          fetchAnalytics();
        }
      }
    }
  }, [activeTab, userId, settingsSubTab]);

  // Real-time socket listener for deleted posts
  useEffect(() => {
    if (!socket) return;
    const handlePostUpdated = (data) => {
      const { postId, type } = data;
      if (type === "delete") {
        setPosts(prev => prev.filter(p => p._id !== postId));
        setSavedPosts(prev => prev.filter(p => p._id !== postId));
      }
    };
    socket.on("post-updated", handlePostUpdated);
    return () => socket.off("post-updated", handlePostUpdated);
  }, [socket]);

  // Click listener to close dropdowns globally
  useEffect(() => {
    const closeDropdown = () => setActiveDropdownPostId(null);
    window.addEventListener("click", closeDropdown);
    return () => window.removeEventListener("click", closeDropdown);
  }, []);

  const handleSaveToggle = async (post) => {
    try {
      const res = await fetch(`${API_URL}/posts/save/${post._id}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        await refreshCurrentUser();
        loadProfileDetails();
        if (data.isSaved) {
          setSavingPostForCollection(post);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Post directly from Profile page
  const handleDeletePost = async (postId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "DELETE",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p._id !== postId));
        setSavedPosts(prev => prev.filter(p => p._id !== postId));
        
        socket?.emit("post-update", {
          postId: postId,
          type: "delete"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Profile Form Submit
  const handleEditProfile = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const filteredLinks = editLinks.map(l => l.trim()).filter(Boolean);
      const updatedUser = await updateProfile(editBio, editPic, editCover, filteredLinks);
      // Directly update profileUser from the response to avoid full reload flash
      if (updatedUser) {
        setProfileUser(prev => ({ ...prev, ...updatedUser }));
        setEditBio(updatedUser.bio || "");
        setEditPic(updatedUser.profilePic || "");
        setEditCover(updatedUser.coverPic || "");
        const links = updatedUser.websiteLinks || [];
        setEditLinks([...links, "", "", ""].slice(0, 3));
      }
      setShowEditModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Follow Toggle
  const handleFollowToggle = async () => {
    if (!profileUser) return;
    const isFollowing = currentUser.following?.some(f => String(f._id || f) === String(profileUser._id));
    try {
      await toggleFollowUser(profileUser._id, isFollowing);
      loadProfileDetails(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getAvatarUrl = (user) => {
    if (!user) return "";
    return user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}&backgroundType=gradientLinear`;
  };

  const getProfilePostsGrid = (items) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-16 text-slate-500 font-medium col-span-3">
          No content shared yet.
        </div>
      );
    }
    return items.map(post => (
      <div 
        key={post._id} 
        onClick={() => navigateTo("post", post._id)}
        className="aspect-square rounded-2xl overflow-hidden glass-panel group cursor-pointer border border-slate-200/50 dark:border-slate-800/50 relative shadow-sm"
      >
        {post.mediaUrl && post.mediaType !== "none" ? (
          post.mediaType === "image" ? (
            <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="relative w-full h-full">
              <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
              <span className="absolute top-2 right-2 p-1 bg-black/40 text-white rounded-full"><Film size={12} /></span>
            </div>
          )
        ) : (
          <div className="w-full h-full p-4 flex items-center justify-center text-center text-xs font-semibold text-slate-600 dark:text-slate-300 bg-gradient-to-br from-aurora-lavender to-aurora-mint dark:from-violet-950/20 dark:to-teal-950/20 overflow-hidden text-ellipsis">
            {post.caption}
          </div>
        )}

        {/* Hover statistics & options */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 text-white font-bold text-sm transition-all duration-300">
          <span className="flex items-center gap-1.5"><Heart size={16} className="fill-white" /> {post.likes?.length || 0}</span>
          
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownPostId(activeDropdownPostId === post._id ? null : post._id);
              }}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95"
              title="Options"
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown Options */}
            <AnimatePresence>
              {activeDropdownPostId === post._id && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  onClick={(e) => e.stopPropagation()} // prevent clicking dropdown item from opening detail modal
                  className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl shadow-xl z-30 overflow-hidden text-xs text-left"
                >
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/posts/${post._id}`);
                      alert("Link copied to clipboard!");
                      setActiveDropdownPostId(null);
                    }}
                    className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Copy Link
                  </button>
                  <button 
                    onClick={() => {
                      handleSaveToggle(post);
                      setActiveDropdownPostId(null);
                    }}
                    className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {currentUser.savedPosts?.includes(post._id) ? "Unsave Post" : "Save Post"}
                  </button>
                  {isOwnProfile && (
                    <button 
                      onClick={(e) => {
                        handleDeletePost(post._id, e);
                        setActiveDropdownPostId(null);
                      }}
                      className="w-full px-4 py-2 hover:bg-rose-500/10 font-bold text-rose-500 transition-colors border-t border-slate-100 dark:border-zinc-800/50"
                    >
                      Delete
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    ));
  };

  if (loading || !profileUser) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  // Check if locked: private profile and we do not follow them (and not ourselves)
  const isFollowingUser = currentUser.following?.some(f => String(f._id || f) === String(profileUser._id));
  const isProfileUserBlocked = currentUser.blockedUsers?.some(id => String(id._id || id) === String(profileUser._id));
  const isProfileUserMuted = currentUser.mutedUsers?.some(id => String(id._id || id) === String(profileUser._id));
  const isLocked = profileUser.isPrivate && !isFollowingUser && !isOwnProfile;

  return (
    <div className="w-full min-h-screen px-4 py-8 max-w-4xl mx-auto flex flex-col gap-8">
      
      {/* Profile Header Details Card with Cover Banner */}
      <div className="glass-panel rounded-3xl shadow-sm relative flex flex-col">
        {/* Cover Banner */}
        <div className="relative h-40 md:h-48 w-full bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-teal-500/20 flex-shrink-0 overflow-hidden rounded-t-3xl">
          {profileUser.coverPic && (
            <img 
              src={profileUser.coverPic} 
              className="w-full h-full object-cover rounded-t-3xl" 
              alt="Cover Banner" 
            />
          )}
        </div>

        {/* Profile Info block */}
        <div className="p-6 pt-0 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 -mt-14 md:-mt-16 z-10 text-center md:text-left relative">
          {/* Avatar Container with Theme Frames */}
          <div className={`rounded-full flex-shrink-0 flex items-center justify-center shadow-lg ${
            profileUser.avatarFrameTheme === "neon" ? "bg-gradient-to-tr from-green-400 via-cyan-400 to-blue-500 animate-pulse p-[4px]" :
            profileUser.avatarFrameTheme === "gold" ? "bg-gradient-to-tr from-amber-200 via-yellow-400 to-amber-600 animate-pulse p-[4px]" :
            profileUser.avatarFrameTheme === "cyberpunk" ? "bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 animate-pulse p-[4px]" :
            profileUser.avatarFrameTheme === "sunset" ? "bg-gradient-to-tr from-orange-500 via-rose-500 to-violet-600 animate-pulse p-[4px]" :
            "border-4 border-white dark:border-[#0b0c10] p-0"
          }`}>
            <img 
              src={getAvatarUrl(profileUser)} 
              className="h-28 w-28 md:h-32 md:w-32 rounded-full object-cover bg-white dark:bg-[#0b0c10] flex-shrink-0" 
              alt=""
            />
          </div>

          <div className="flex-grow flex flex-col gap-4 pt-12 md:pt-0">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-1.5">
                {profileUser.username}
                {profileUser.isVerified && <Award size={18} className="text-violet-500 fill-violet-500/30" title="Verified Creator" />}
              </h2>
              {profileUser.isPrivate && <Lock size={15} className="text-slate-400" />}
            </div>
            
            {/* Action CTAs */}
            <div className="flex justify-center md:justify-start gap-2 items-center flex-wrap">
              {isOwnProfile ? (
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-transparent text-violet-500 rounded-xl font-bold text-xs transition-all"
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleFollowToggle}
                    className={`px-5 py-2 rounded-xl font-bold text-xs shadow-sm border transition-all ${
                      isFollowingUser 
                        ? "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" 
                        : "bg-vibe-gradient text-white border-transparent hover:opacity-95"
                    }`}
                  >
                    {isFollowingUser ? "Unfollow" : "Follow"}
                  </button>
                  <button 
                    onClick={() => navigateTo("chat", profileUser._id)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-all"
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                  <div className="relative inline-block text-left profile-options-dropdown">
                    <button 
                      onClick={() => setShowOptionsDropdown(prev => !prev)}
                      className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-650 dark:text-zinc-350 rounded-xl font-bold transition-all"
                      title="Profile Options"
                    >
                      <MoreVertical size={14} />
                    </button>

                    <AnimatePresence>
                      {showOptionsDropdown && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden"
                        >
                          <div className="py-1.5 flex flex-col">
                            {/* Copy Profile Link */}
                            <button
                              onClick={handleCopyProfileLink}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors text-left"
                            >
                              <Link size={14} className="text-slate-400" />
                              <span>Copy Profile Link</span>
                            </button>

                            {/* Share Profile to Chat */}
                            <button
                              onClick={() => {
                                setShowProfileShareModal(true);
                                setShowOptionsDropdown(false);
                              }}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors text-left border-b border-slate-200/40 dark:border-zinc-800/40"
                            >
                              <Share2 size={14} className="text-slate-400" />
                              <span>Share Profile to Chat</span>
                            </button>

                            {/* Mute / Unmute User */}
                            <button
                              onClick={handleMuteToggle}
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors text-left ${
                                isProfileUserMuted
                                  ? "text-amber-500 hover:bg-amber-500/10 font-bold"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-900"
                              }`}
                            >
                              {isProfileUserMuted ? (
                                <>
                                  <Volume2 size={14} />
                                  <span>Unmute User</span>
                                </>
                              ) : (
                                <>
                                  <VolumeX size={14} className="text-slate-400" />
                                  <span>Mute User</span>
                                </>
                              )}
                            </button>

                            {/* Block / Unblock User */}
                            <button
                              onClick={async () => {
                                if (isProfileUserBlocked) {
                                  await blockUser(profileUser._id, false);
                                  await refreshCurrentUser();
                                  setShowOptionsDropdown(false);
                                  alert("User unblocked successfully.");
                                } else {
                                  if (confirm("Block this user? They will not be able to follow you or see your posts.")) {
                                    await blockUser(profileUser._id, true);
                                    setShowOptionsDropdown(false);
                                    navigateTo("feed");
                                  }
                                }
                              }}
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors text-left border-t border-slate-200/40 dark:border-zinc-800/40 ${
                                isProfileUserBlocked
                                  ? "text-emerald-500 hover:bg-emerald-500/10 font-bold"
                                  : "text-rose-500 hover:bg-rose-500/10 font-semibold"
                              }`}
                            >
                              <UserMinus size={14} />
                              <span>{isProfileUserBlocked ? "Unblock User" : "Block User"}</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {profileUser.profileSong?.youtubeId && (
                <button
                  onClick={() => setProfileSongMuted(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all border ${
                    !profileSongMuted 
                      ? "bg-violet-500 text-white border-transparent shadow-sm" 
                      : "bg-slate-100 dark:bg-zinc-800 border-slate-250/20 dark:border-zinc-700/60 text-slate-650 dark:text-zinc-350 hover:bg-slate-200 dark:hover:bg-zinc-700"
                  }`}
                  title={`${!profileSongMuted ? "Mute Background Music" : "Play Background Music"}`}
                >
                  <Music size={13} className={!profileSongMuted ? "animate-bounce" : ""} />
                  <span>{profileUser.profileSong.title}</span>
                </button>
              )}
            </div>
          </div>

          {/* Profile Statistics */}
          <div className="flex justify-center md:justify-start gap-6 text-sm">
            <span className="text-slate-500 font-medium"><strong className="text-slate-800 dark:text-slate-200 font-bold">{posts.length}</strong> posts</span>
            <span 
              onClick={() => !isLocked && setShowFollowersModal(true)}
              className={`text-slate-500 font-medium ${!isLocked && "cursor-pointer hover:underline"}`}
            >
              <strong className="text-slate-800 dark:text-slate-200 font-bold">{profileUser.followers.length}</strong> followers
            </span>
            <span 
              onClick={() => !isLocked && setShowFollowingModal(true)}
              className={`text-slate-500 font-medium ${!isLocked && "cursor-pointer hover:underline"}`}
            >
              <strong className="text-slate-800 dark:text-slate-200 font-bold">{profileUser.following.length}</strong> following
            </span>
          </div>

          {/* Bio text */}
          <p className="text-sm font-medium text-slate-500 max-w-lg leading-relaxed">
            {profileUser.bio || "No bio description shared yet."}
          </p>

          {/* Website Links */}
          {profileUser.websiteLinks && profileUser.websiteLinks.length > 0 && (
            <div className="flex flex-col gap-2 mt-2 text-left items-center md:items-start">
              {profileUser.websiteLinks.map((link, idx) => {
                const href = link.startsWith("http://") || link.startsWith("https://") ? link : `https://${link}`;
                const displayName = link.replace(/^(https?:\/\/)?(www\.)?/, "");
                return (
                  <a
                    key={idx}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-500 hover:text-violet-600 hover:underline transition-colors w-max"
                  >
                    <Link size={12} className="flex-shrink-0" />
                    <span className="truncate max-w-[280px]">{displayName}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Profile Sections / View Tabs */}
      {isLocked ? (
        <div className="text-center py-20 glass-panel rounded-3xl flex flex-col items-center">
          <Lock className="text-slate-400 mb-3" size={32} />
          <h3 className="font-bold text-sm">This Account is Private</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">Follow this user to see their post grids, reels, and stories.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Tab selector menu */}
          <div className="flex justify-center border-b border-slate-200/40 dark:border-slate-800/40 gap-8">
            <button 
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-2 pb-3.5 border-b-2 font-semibold text-sm transition-all ${
                activeTab === "posts" 
                  ? "border-violet-500 text-violet-500" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Grid size={16} /> Posts
            </button>

            <button 
              onClick={() => setActiveTab("reels")}
              className={`flex items-center gap-2 pb-3.5 border-b-2 font-semibold text-sm transition-all ${
                activeTab === "reels" 
                  ? "border-violet-500 text-violet-500" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Film size={16} /> Reels
            </button>

            {isOwnProfile && (
              <>
                <button 
                  onClick={() => setActiveTab("saved")}
                  className={`flex items-center gap-2 pb-3.5 border-b-2 font-semibold text-sm transition-all ${
                    activeTab === "saved" 
                      ? "border-violet-500 text-violet-500" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Bookmark size={16} /> Saved
                </button>




              </>
            )}
          </div>

          {/* Saved Sub-tabs Selector */}
          {activeTab === "saved" && (
            <div className="flex justify-center gap-6 mb-4 select-none">
              <button 
                onClick={() => { setSavedSubTab("all"); setActiveCollectionName(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  savedSubTab === "all" 
                    ? "bg-violet-500 text-white shadow-sm" 
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
              >
                All Saved Posts
              </button>
              <button 
                onClick={() => setSavedSubTab("collections")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  savedSubTab === "collections" 
                    ? "bg-violet-500 text-white shadow-sm" 
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
              >
                Collections
              </button>
            </div>
          )}

          {/* Tab Grids Container */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {activeTab === "posts" && getProfilePostsGrid(posts)}
            {activeTab === "reels" && getProfilePostsGrid(posts.filter(p => p.mediaType === "video"))}
            
            {activeTab === "saved" && (() => {
              if (savedSubTab === "all") {
                return getProfilePostsGrid(savedPosts);
              }
              
              // Collections sub-tab
              if (activeCollectionName === null) {
                const collections = currentUser.savedCollections || [];
                return (
                  <div className="col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Create New Collection Card */}
                    <div 
                      onClick={() => setShowAddCollectionModal(true)}
                      className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-slate-350 dark:border-zinc-800/80 cursor-pointer hover:bg-violet-500/5 transition-all min-h-[140px] group"
                    >
                      <Plus className="text-violet-500 group-hover:scale-110 transition-transform" size={24} />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">New Collection</span>
                    </div>

                    {/* Folders List */}
                    {collections.map(col => (
                      <div 
                        key={col._id || col.name}
                        onClick={() => setActiveCollectionName(col.name)}
                        className="glass-panel p-5 rounded-3xl flex flex-col justify-between cursor-pointer hover:shadow-md hover:bg-white/50 dark:hover:bg-black/20 transition-all border border-slate-200/40 dark:border-slate-800/40 min-h-[140px]"
                      >
                        <div className="flex justify-between items-start">
                          <Folder className="text-violet-500" size={28} />
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete collection "${col.name}"?`)) {
                                try {
                                  const res = await fetch(`${API_URL}/users/collections/${encodeURIComponent(col.name)}`, {
                                    method: "DELETE",
                                    headers: { "Authorization": token }
                                  });
                                  if (res.ok) {
                                    await refreshCurrentUser();
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Delete Collection"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                        <div className="mt-4">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">{col.name}</h4>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">{col.posts?.length || 0} posts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              } else {
                // Render posts inside the active collection folder
                const collection = currentUser.savedCollections?.find(c => c.name === activeCollectionName);
                const postIds = collection?.posts || [];
                const collectionPosts = savedPosts.filter(p => postIds.includes(p._id));
                
                return (
                  <div className="col-span-3 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-900/45 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                      <div className="flex items-center gap-3">
                        <Folder className="text-violet-500" size={20} />
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white">Collection: <span className="text-violet-500">{activeCollectionName}</span></h3>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowManagePostsModal(true)}
                          className="px-3.5 py-1.5 bg-violet-500 text-white rounded-xl font-bold text-xs hover:bg-violet-600 transition-all shadow-sm"
                        >
                          Manage Posts
                        </button>
                        <button 
                          onClick={() => setActiveCollectionName(null)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-300 dark:hover:bg-zinc-700 transition-all"
                        >
                          ← Back
                        </button>
                      </div>
                    </div>

                    {collectionPosts.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 font-medium col-span-3">
                        This collection is empty. Click "Manage Posts" to add posts!
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 md:gap-4 mt-2 col-span-3">
                        {getProfilePostsGrid(collectionPosts)}
                      </div>
                    )}
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* --- EDIT PROFILE MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Edit Profile Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditProfile} className="space-y-4">
               <div className="space-y-3 flex flex-col items-center">
                <label className="text-xs font-bold text-slate-500 self-start">Profile Picture</label>
                
                <div className="relative group h-24 w-24 rounded-full overflow-hidden border-2 border-violet-500/20">
                  <img 
                    src={editPic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.username)}&backgroundType=gradientLinear`} 
                    className="h-full w-full object-cover" 
                    alt="Preview" 
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-[10px] text-white font-bold text-center px-1">Upload Photo</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                </div>
                
                {editPic && (
                  <button 
                    type="button" 
                    onClick={() => setEditPic("")}
                    className="text-xs font-bold text-rose-500 hover:underline"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Cover Banner Option */}
              <div className="space-y-3 flex flex-col items-center">
                <label className="text-xs font-bold text-slate-500 self-start">Cover Banner</label>
                <div className="relative group h-24 w-full rounded-2xl overflow-hidden border border-violet-500/20 bg-slate-100/50 dark:bg-zinc-900/50 flex items-center justify-center">
                  {editCover ? (
                    <img 
                      src={editCover} 
                      className="h-full w-full object-cover" 
                      alt="Cover Preview" 
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold">No Cover Banner Selected</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-[10px] text-white font-bold text-center px-1">Upload Banner</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                </div>
                {editCover && (
                  <button 
                    type="button" 
                    onClick={() => setEditCover("")}
                    className="text-xs font-bold text-rose-500 hover:underline"
                  >
                    Remove Banner
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full p-3 rounded-xl border vibe-input-field outline-none text-sm min-h-[90px]"
                />
              </div>

              {/* Website Links */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-500 block text-left">Website Links (Max 3)</label>
                {editLinks.map((link, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Link size={14} className="text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder={`Link ${idx + 1} (e.g. https://github.com)`}
                      value={link}
                      onChange={(e) => {
                        const updated = [...editLinks];
                        updated[idx] = e.target.value;
                        setEditLinks(updated);
                      }}
                      className="flex-grow p-2.5 rounded-xl border vibe-input-field outline-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full py-3 rounded-xl bg-vibe-gradient text-white font-semibold text-sm shadow-md"
              >
                {modalLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FOLLOWERS MODAL --- */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-[var(--bg-main)] border border-slate-200/40 dark:border-zinc-800 p-6 rounded-3xl shadow-2xl relative h-[60vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-base font-extrabold tracking-tight">Followers</h3>
              <button onClick={() => setShowFollowersModal(false)} className="text-slate-500 hover:text-slate-700 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {profileUser.followers.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-10 font-semibold">No followers yet.</p>
              ) : (
                profileUser.followers.map(f => (
                  <div 
                    key={f._id} 
                    onClick={() => {
                      navigateTo("profile", f._id);
                      setShowFollowersModal(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-all border border-transparent hover:border-violet-500/10"
                  >
                    <img src={getAvatarUrl(f)} className="h-9 w-9 rounded-full object-cover bg-white dark:bg-zinc-950 flex-shrink-0" />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      {f.username}
                      {f.isVerified && <Award size={14} className="text-violet-500 fill-violet-500/30 flex-shrink-0" />}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- FOLLOWING MODAL --- */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-[var(--bg-main)] border border-slate-200/40 dark:border-zinc-800 p-6 rounded-3xl shadow-2xl relative h-[60vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-base font-extrabold tracking-tight">Following</h3>
              <button onClick={() => setShowFollowingModal(false)} className="text-slate-500 hover:text-slate-700 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {profileUser.following.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-10 font-semibold">Not following anyone yet.</p>
              ) : (
                profileUser.following.map(f => (
                  <div 
                    key={f._id} 
                    onClick={() => {
                      navigateTo("profile", f._id);
                      setShowFollowingModal(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-all border border-transparent hover:border-violet-500/10"
                  >
                    <img src={getAvatarUrl(f)} className="h-9 w-9 rounded-full object-cover bg-white dark:bg-zinc-950 flex-shrink-0" />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      {f.username}
                      {f.isVerified && <Award size={14} className="text-violet-500 fill-violet-500/30 flex-shrink-0" />}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cropper Modal Overlay */}
      {imageToCrop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/85 backdrop-blur-sm select-none">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl shadow-2xl relative flex flex-col items-center gap-6">
            <h3 className="text-sm font-extrabold tracking-tight self-start text-white">Adjust & Crop Image</h3>
            
            {/* Cropping box viewport */}
            <div 
              className={`relative overflow-hidden bg-zinc-950 border border-white/20 cursor-move flex items-center justify-center ${
                cropType === "avatar" ? "w-64 h-64 rounded-full" : "w-full aspect-[2.66/1] rounded-2xl"
              }`}
              onMouseDown={(e) => {
                setIsDragging(true);
                setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
              }}
              onMouseMove={(e) => {
                if (!isDragging) return;
                setPanX(e.clientX - dragStart.x);
                setPanY(e.clientY - dragStart.y);
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  setIsDragging(true);
                  setDragStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
                }
              }}
              onTouchMove={(e) => {
                if (!isDragging || e.touches.length !== 1) return;
                setPanX(e.touches[0].clientX - dragStart.x);
                setPanY(e.touches[0].clientY - dragStart.y);
              }}
              onTouchEnd={() => setIsDragging(false)}
            >
              <img 
                id="source-crop-image"
                src={imageToCrop} 
                className="pointer-events-none max-w-none max-h-none"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  width: "100%",
                  height: cropType === "avatar" ? "100%" : "auto",
                  objectFit: "contain",
                  transition: isDragging ? "none" : "transform 0.1s ease-out"
                }}
                alt=""
              />
            </div>

            {/* Zoom Slider */}
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-400 font-bold">
                <span>Zoom Scale: {zoom.toFixed(2)}x</span>
                <span>Drag image to pan</span>
              </div>
              <input 
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 w-full">
              <button 
                type="button" 
                onClick={() => setImageToCrop(null)} 
                className="flex-grow py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleCropSave} 
                className="flex-grow py-2.5 rounded-xl bg-vibe-gradient text-white font-bold text-xs transition-all shadow-md"
              >
                Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Collection Modal */}
      {showAddCollectionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl shadow-2xl relative flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Create New Collection</h3>
              <button onClick={() => { setShowAddCollectionModal(false); setNewCollectionName(""); }} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg">
                <X size={16} />
              </button>
            </div>
            
            <input 
              type="text" 
              placeholder="Collection name (e.g. React Tips)" 
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-sm font-semibold outline-none focus:border-violet-500 transition-all text-slate-800 dark:text-slate-200"
            />
            
            <button 
              onClick={async () => {
                if (!newCollectionName.trim()) return;
                try {
                  const res = await fetch(`${API_URL}/users/collections`, {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "Authorization": token 
                    },
                    body: JSON.stringify({ name: newCollectionName.trim() })
                  });
                  if (res.ok) {
                    await refreshCurrentUser();
                    setShowAddCollectionModal(false);
                    setNewCollectionName("");
                  } else {
                    const data = await res.json();
                    alert(data.message || "Failed to create collection");
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
              className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold text-xs shadow-md transition-all"
            >
              Create Collection
            </button>
          </div>
        </div>
      )}

      {/* Manage Collection Posts Modal */}
      {showManagePostsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl shadow-2xl relative flex flex-col gap-4 max-h-[80vh]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Add/Remove Posts</h3>
              <button onClick={() => setShowManagePostsModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg">
                <X size={16} />
              </button>
            </div>
            
            <p className="text-[11px] text-slate-500 font-medium leading-normal mb-2">
              Select which saved posts to include in the collection <strong className="text-violet-500">"{activeCollectionName}"</strong>:
            </p>

            <div className="flex flex-col flex-1 overflow-y-auto space-y-3 pr-2">
              {savedPosts.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">You don't have any saved posts yet.</p>
              ) : (
                savedPosts.map(post => {
                  const collection = currentUser.savedCollections?.find(c => c.name === activeCollectionName);
                  const isChecked = collection?.posts?.includes(post._id);
                  
                  return (
                    <div 
                      key={post._id}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-slate-150 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/10 hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-all select-none"
                    >
                      <input 
                        type="checkbox" 
                        checked={!!isChecked}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          const endpoint = checked ? "/users/collections/add" : "/users/collections/remove";
                          try {
                            const res = await fetch(`${API_URL}${endpoint}`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": token
                              },
                              body: JSON.stringify({ collectionName: activeCollectionName, postId: post._id })
                            });
                            if (res.ok) {
                              await refreshCurrentUser();
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="h-4.5 w-4.5 rounded border-slate-350 text-violet-600 focus:ring-violet-500 accent-violet-500 cursor-pointer"
                      />
                      
                      {/* Post Thumbnail / Details */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {post.mediaUrl && post.mediaType !== "none" ? (
                          post.mediaType === "image" ? (
                            <img src={post.mediaUrl} className="h-10 w-10 rounded-lg object-cover flex-shrink-0" alt="" />
                          ) : (
                            <video src={post.mediaUrl} className="h-10 w-10 rounded-lg object-cover flex-shrink-0" muted />
                          )
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-center text-[8px] font-bold text-violet-500 flex-shrink-0 overflow-hidden text-ellipsis">
                            Code
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{post.caption || "Untitled Post"}</p>
                          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">By @{post.user?.username || "user"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button 
              onClick={() => setShowManagePostsModal(false)}
              className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold text-xs shadow-md transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {savingPostForCollection && (
        <SaveToCollectionModal 
          post={savingPostForCollection} 
          onClose={() => setSavingPostForCollection(null)} 
        />
      )}

      {/* Hidden YouTube Iframe Player for Profile Background Music */}
      {profileUser?.profileSong?.youtubeId && !profileSongMuted && (
        <iframe
          className="hidden animate-pulse"
          width="0"
          height="0"
          src={`https://www.youtube.com/embed/${profileUser.profileSong.youtubeId}?autoplay=1&loop=1&playlist=${profileUser.profileSong.youtubeId}&start=${profileUser.profileSong.startTime || 0}&mute=0`}
          allow="autoplay"
        />
      )}

      {/* Profile Background Song selector modal */}
      {showProfileMusicPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 p-6 rounded-3xl border border-zinc-800 shadow-2xl relative">
            <button 
              onClick={() => setShowProfileMusicPicker(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 z-10"
            >
              <X size={20} />
            </button>
            <MusicLibrary
              onClose={() => setShowProfileMusicPicker(false)}
              onSelect={(track) => {
                updateUserSettings({ profileSong: track });
                setShowProfileMusicPicker(false);
              }}
            />
          </div>
        </div>
      )}
      {/* Profile Share Modal */}
      <AnimatePresence>
        {showProfileShareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Share2 size={16} className="text-violet-500" /> Share Profile
                </h3>
                <button 
                  onClick={() => setShowProfileShareModal(false)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 rounded-xl transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search input */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-900">
                <input
                  type="text"
                  placeholder="Search direct chats..."
                  value={shareSearchQuery}
                  onChange={(e) => setShareSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-zinc-900 border border-transparent focus:border-violet-500 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none transition-all placeholder-slate-400"
                />
              </div>

              {/* Chat list */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[40vh]">
                {shareThreadsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
                  </div>
                ) : shareThreads.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8">No direct chats found.</p>
                ) : (
                  shareThreads
                    .filter(t => 
                      t.partner.username.toLowerCase().includes(shareSearchQuery.toLowerCase()) ||
                      (t.partner.name && t.partner.name.toLowerCase().includes(shareSearchQuery.toLowerCase()))
                    )
                    .map(t => {
                      const isSent = sentShareUsers.has(t.partner._id);
                      const partnerPic = t.partner.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.partner.username)}&backgroundType=gradientLinear`;

                      return (
                        <div key={t.partner._id} className="flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/30 p-2.5 rounded-2xl border border-slate-100/50 dark:border-zinc-900/50">
                          <div className="flex items-center gap-3">
                            <img src={partnerPic} className="h-9 w-9 rounded-full object-cover border border-slate-200/40 dark:border-slate-800/40" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-xs text-slate-850 dark:text-slate-200 leading-tight flex items-center gap-1">
                                {t.partner.username}
                                {t.partner.isVerified && <Award size={13} className="text-violet-500 fill-violet-500/30" />}
                              </span>
                              {t.partner.name && <span className="text-[10px] text-slate-400 font-semibold">{t.partner.name}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendProfileLink(t.partner)}
                            disabled={isSent}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1.5 ${
                              isSent 
                                ? "bg-emerald-500/10 text-emerald-500 cursor-default" 
                                : "bg-violet-500 hover:bg-violet-600 text-white hover:scale-105 active:scale-95 shadow-sm"
                            }`}
                          >
                            {isSent ? (
                              <>
                                <Check size={12} /> Sent
                              </>
                            ) : (
                              <>
                                <Send size={12} /> Send
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Profile;
