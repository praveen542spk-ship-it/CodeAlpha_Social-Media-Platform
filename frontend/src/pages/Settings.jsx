import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import { 
  Settings, Lock, Eye, EyeOff, Folder, Plus, Trash, Heart, 
  MessageCircle, Check, Award, Image, Film, User, Shield, Radio, ShieldCheck 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SettingsPage = ({ navigateTo }) => {
  const { currentUser, token, updateProfile, togglePrivacy, blockUser, toggleFollowUser, fetchUserProfile, refreshCurrentUser, API_URL } = useAuth();
  const { socket } = useSocket();
  const { darkMode } = useTheme();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsSubTab, setSettingsSubTab] = useState("general"); // general, analytics, blocked, muted, liked, watched, collab, closefriends

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

  // Creator Analytics States
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Collaboration Invites States
  const [collabInvites, setCollabInvites] = useState([]);
  const [collabLoading, setCollabLoading] = useState(false);

  // Verification request form states
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verifyFullName, setVerifyFullName] = useState("");
  const [verifyCategory, setVerifyCategory] = useState("Creator");
  const [verifyProofText, setVerifyProofText] = useState("");
  const [verifyFormLoading, setVerifyFormLoading] = useState(false);

  const getAvatarUrl = (user) => {
    if (!user) return "";
    return user.profilePic 
      ? user.profilePic 
      : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}&backgroundType=gradientLinear`;
  };

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const profile = await fetchUserProfile(currentUser._id);
      setProfileUser(profile);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  useEffect(() => {
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
    } else if (settingsSubTab === "collab") {
      fetchCollabInvites();
    }
  }, [settingsSubTab]);

  const updateUserSettings = async (updatedFields) => {
    // Optimistic update — reflect change in UI immediately
    setProfileUser(prev => ({ ...prev, ...updatedFields }));
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
      } else {
        // Revert on failure — re-fetch
        const profile = await fetchUserProfile(currentUser._id);
        setProfileUser(profile);
      }
    } catch (err) {
      console.error("Error updating settings:", err);
      // Revert on error — re-fetch
      try {
        const profile = await fetchUserProfile(currentUser._id);
        setProfileUser(profile);
      } catch (e) { /* ignore */ }
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/users/blocked`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setBlockedUsersList(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleUnblock = async (userId) => {
    setBlockedUsersList(prev => prev.filter(u => String(u._id) !== String(userId)));
    try {
      await blockUser(userId);
    } catch (err) {
      console.error(err);
      fetchBlockedUsers();
    }
  };

  const fetchMutedUsers = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/users/muted`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setMutedUsersList(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleUnmute = async (userId) => {
    setMutedUsersList(prev => prev.filter(u => String(u._id) !== String(userId)));
    try {
      const res = await fetch(`${API_URL}/users/mute/${userId}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (!res.ok) {
        fetchMutedUsers();
      }
    } catch (err) {
      console.error(err);
      fetchMutedUsers();
    }
  };

  const fetchLikedReels = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/posts/liked-reels`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setLikedReelsList(await res.json());
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
        setWatchedReelsList(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchCloseFriends = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_URL}/users/close-friends`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setCloseFriendsList(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleToggleCloseFriend = async (friendId) => {
    setCloseFriendsList(prev => {
      const exists = prev.some(u => String(u._id) === String(friendId));
      if (exists) {
        return prev.filter(u => String(u._id) !== String(friendId));
      } else {
        const userObj = (profileUser?.followers || []).find(u => String(u._id) === String(friendId));
        return userObj ? [...prev, userObj] : prev;
      }
    });

    try {
      const res = await fetch(`${API_URL}/users/close-friends/toggle/${friendId}`, {
        method: "PUT",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        fetchCloseFriends();
      }
    } catch (err) {
      console.error(err);
      fetchCloseFriends();
    }
  };

  const fetchCollabInvites = async () => {
    try {
      setCollabLoading(true);
      const res = await fetch(`${API_URL}/posts/collab/invites`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setCollabInvites(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCollabLoading(false);
    }
  };

  const handleCollabRespond = async (collabId, accept) => {
    try {
      const res = await fetch(`${API_URL}/posts/collab/respond/${collabId}`, {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ accept })
      });
      if (res.ok) {
        fetchCollabInvites();
      }
    } catch (err) {
      console.error("Error responding to collab invite:", err);
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

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!verifyFullName || !verifyProofText) return;
    setVerifyFormLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/verify-request`, {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: verifyFullName,
          category: verifyCategory,
          proofUrl: verifyProofText
        })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setProfileUser(updatedUser);
        setShowVerificationForm(false);
        refreshCurrentUser();
      }
    } catch (err) {
      console.error("Error submitting verification request:", err);
    } finally {
      setVerifyFormLoading(false);
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
                      <span className="text-slate-655 dark:text-slate-355 truncate max-w-[200px] sm:max-w-md">"{post.caption}"</span>
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

  if (loading || !profileUser) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full max-w-5xl mx-auto px-4 py-8 md:py-12 select-none">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col text-left gap-1">
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <Settings className="text-violet-500" size={26} /> Settings & Preferences
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400">Configure your account safety, notifications, content filters and creator analytics dashboards.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full min-h-[500px]">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 scrollbar-hide">
            <button
              onClick={() => setSettingsSubTab("general")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "general"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              ⚙️ General Settings
            </button>
            <button
              onClick={() => setSettingsSubTab("analytics")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "analytics"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              📊 Creator Analytics
            </button>
            <button
              onClick={() => setSettingsSubTab("blocked")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "blocked"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              🚫 Blocked Users
            </button>
            <button
              onClick={() => setSettingsSubTab("muted")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "muted"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              🔇 Muted Users
            </button>
            <button
              onClick={() => setSettingsSubTab("quickreplies")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "quickreplies"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              💬 Quick Replies
            </button>
            <button
              onClick={() => setSettingsSubTab("liked")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "liked"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              ❤️ Liked Posts
            </button>
            <button
              onClick={() => setSettingsSubTab("watched")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "watched"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              ⏱️ Post History
            </button>
            <button
              onClick={() => setSettingsSubTab("collab")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "collab"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              📩 Collab Invites {collabInvites.length > 0 && (
                <span className="ml-1 bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">{collabInvites.length}</span>
              )}
            </button>
            <button
              onClick={() => setSettingsSubTab("closefriends")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                settingsSubTab === "closefriends"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
              }`}
            >
              ⭐ Close Friends
            </button>
            <button
              onClick={() => navigateTo("canvas")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all text-fuchsia-500 dark:text-fuchsia-400 hover:bg-slate-100 dark:hover:bg-zinc-850/50"
            >
              🎨 Collab Canvas
            </button>
          </div>

          {/* Sub-tab Content Area */}
          <div className="md:col-span-3 flex flex-col gap-6 px-1 md:px-4">
            {settingsSubTab === "general" && (
              <div className="flex flex-col gap-5">
                <h4 className="font-extrabold text-base border-b border-white/5 pb-2 text-slate-800 dark:text-white">General & Privacy Settings</h4>
                
                {/* Privacy setting */}
                <div className="p-5 glass-panel rounded-3xl flex justify-between items-center shadow-sm">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-sm">Private Account</span>
                    <span className="text-xs text-slate-500 max-w-xs">When private, only followers you approve can view your posts and reels.</span>
                  </div>
                  <button 
                    onClick={async () => {
                      // Optimistic update
                      setProfileUser(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
                      try {
                        await togglePrivacy();
                        // Sync with server data silently (no loading spinner)
                        const profile = await fetchUserProfile(currentUser._id);
                        setProfileUser(profile);
                      } catch (err) {
                        // Revert on error
                        setProfileUser(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                      profileUser.isPrivate ? "bg-violet-500" : "bg-slate-200 dark:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                        profileUser.isPrivate ? "translate-x-5.5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Focus Mode Setting */}
                <div className="p-5 glass-panel rounded-3xl flex justify-between items-center shadow-sm">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-sm">Focus Mode</span>
                    <span className="text-xs text-slate-500 max-w-xs">When enabled, push notification alerts are silenced in real-time.</span>
                  </div>
                  <button 
                    onClick={async () => {
                      // Optimistic Update
                      setProfileUser(prev => ({ ...prev, focusMode: !prev.focusMode }));
                      try {
                        const res = await fetch(`${API_URL}/users/focus-mode`, {
                          method: "PUT",
                          headers: {
                            "Authorization": token,
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ enabled: !profileUser.focusMode })
                        });
                        if (res.ok) {
                          const updated = await res.json();
                          setProfileUser(updated.user);
                          refreshCurrentUser();
                        } else {
                          // Revert on error
                          setProfileUser(prev => ({ ...prev, focusMode: !prev.focusMode }));
                        }
                      } catch (err) {
                        console.error(err);
                        setProfileUser(prev => ({ ...prev, focusMode: !prev.focusMode }));
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                      profileUser.focusMode ? "bg-violet-500" : "bg-slate-200 dark:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                        profileUser.focusMode ? "translate-x-5.5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Hide Likes Setting */}
                <div className="p-5 glass-panel rounded-3xl flex justify-between items-center shadow-sm">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-sm">Hide Likes</span>
                    <span className="text-xs text-slate-500 max-w-xs">Hide the total number of likes on other people's posts.</span>
                  </div>
                  <button 
                    onClick={() => updateUserSettings({ hideLikes: !profileUser.hideLikes })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                      profileUser.hideLikes ? "bg-violet-500" : "bg-slate-200 dark:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                        profileUser.hideLikes ? "translate-x-5.5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Incognito Story Setting */}
                <div className="p-5 glass-panel rounded-3xl flex justify-between items-center shadow-sm">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-sm">Incognito Story Viewer</span>
                    <span className="text-xs text-slate-500 max-w-xs">View other people's stories without appearing in their viewers list.</span>
                  </div>
                  <button 
                    onClick={() => updateUserSettings({ incognitoStoryViewer: !profileUser.incognitoStoryViewer })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                      profileUser.incognitoStoryViewer ? "bg-violet-500" : "bg-slate-200 dark:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                        profileUser.incognitoStoryViewer ? "translate-x-5.5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Active Status Visibility Setting */}
                <div className="p-5 glass-panel rounded-3xl flex justify-between items-center shadow-sm">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-sm">Active Status Visibility</span>
                    <span className="text-xs text-slate-500 max-w-xs">Allow accounts you follow and anyone you message to see when you're active.</span>
                  </div>
                  <button 
                    onClick={() => updateUserSettings({ showActiveStatus: profileUser.showActiveStatus === false ? true : false })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                      profileUser.showActiveStatus !== false ? "bg-violet-500" : "bg-slate-200 dark:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                        profileUser.showActiveStatus !== false ? "translate-x-5.5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Avatar Frame theme selection */}
                <div className="p-5 glass-panel rounded-3xl flex flex-col gap-3 shadow-sm text-left">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm">Avatar Frame Theme</span>
                    <span className="text-xs text-slate-500">Pick a color styling for your profile pic avatar border frame.</span>
                  </div>
                  <select 
                    value={profileUser.avatarFrameTheme || "none"}
                    onChange={(e) => updateUserSettings({ avatarFrameTheme: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="none" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Default Frame</option>
                    <option value="violet" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Premium Violet</option>
                    <option value="emerald" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Sleek Emerald</option>
                    <option value="rose" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Sweet Rose</option>
                    <option value="amber" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Warm Amber</option>
                    <option value="indigo" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Cool Indigo</option>
                  </select>
                </div>

                {/* Content Moderation Word filters */}
                <div className="p-5 glass-panel rounded-3xl flex flex-col gap-3 shadow-sm text-left">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm">Sensitive Word Moderation</span>
                    <span className="text-xs text-slate-500">Comments on your posts containing these words will be blocked automatically.</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <input 
                      type="text" 
                      placeholder="Add blocklisted word..."
                      value={newBlocklistWord}
                      onChange={(e) => setNewBlocklistWord(e.target.value)}
                      className="flex-grow p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newBlocklistWord.trim()) {
                          const updated = [...(profileUser.blockedWords || []), newBlocklistWord.trim().toLowerCase()];
                          updateUserSettings({ blockedWords: updated });
                          setNewBlocklistWord("");
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (newBlocklistWord.trim()) {
                          const updated = [...(profileUser.blockedWords || []), newBlocklistWord.trim().toLowerCase()];
                          updateUserSettings({ blockedWords: updated });
                          setNewBlocklistWord("");
                        }
                      }}
                      className="px-4 rounded-xl bg-violet-500 text-white font-bold text-xs hover:bg-violet-600 transition-colors shadow-sm"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {(profileUser.blockedWords || []).map(word => (
                      <span key={word} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-850/80 text-[11px] font-bold text-slate-600 dark:text-slate-350 border border-slate-200/50 dark:border-zinc-800/40">
                        {word}
                        <button 
                          onClick={() => {
                            const updated = (profileUser.blockedWords || []).filter(w => w !== word);
                            updateUserSettings({ blockedWords: updated });
                          }}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Digital Wellbeing Screen Time Setting */}
                <div className="p-5 glass-panel rounded-3xl flex flex-col gap-3 shadow-sm text-left">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm">Screen Time Daily Limit</span>
                    <span className="text-xs text-slate-500">Alert yourself when you have used the app for this amount of minutes. (0 to disable)</span>
                  </div>
                  <input 
                    type="number"
                    min="0"
                    max="1440"
                    placeholder="Enter limit in minutes..."
                    value={profileUser.screenTimeLimit || 0}
                    onChange={(e) => updateUserSettings({ screenTimeLimit: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Blue Tick Verification Request Block */}
                <div className="p-5 glass-panel rounded-3xl flex flex-col gap-3 shadow-sm text-left">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Award className="text-violet-500" size={18} /> Blue Tick Verification
                    </span>
                    {profileUser.isVerified ? (
                      <span className="text-xs bg-violet-500/10 text-violet-500 font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                        Verified <Check size={12} />
                      </span>
                    ) : profileUser.isVerifiedRequested ? (
                      <span className="text-xs bg-amber-500/10 text-amber-500 font-extrabold px-3 py-1 rounded-full animate-pulse">
                        Pending Admin Review
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-200/50 dark:bg-zinc-800 text-slate-500 font-extrabold px-3 py-1 rounded-full">
                        Not Verified
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Verified account badges (blue checkmarks) help identify authentic public figures, creators and developer users of VibeShare.
                  </p>

                  {profileUser.isVerifiedRequested && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-[11px] font-semibold text-amber-500/80 leading-relaxed italic">
                      Your verification request is pending review by the admin team.
                    </div>
                  )}

                  {!profileUser.isVerified && !profileUser.isVerifiedRequested && !showVerificationForm && (
                    <button 
                      onClick={() => setShowVerificationForm(true)}
                      className="w-full mt-1.5 py-2.5 rounded-xl bg-violet-500 text-white font-bold text-xs hover:bg-violet-600 transition-colors shadow-sm"
                    >
                      Request Verification
                    </button>
                  )}

                  {!profileUser.isVerified && !profileUser.isVerifiedRequested && showVerificationForm && (
                    <form onSubmit={handleVerificationSubmit} className="flex flex-col gap-3.5 mt-2 border-t border-slate-200/50 dark:border-zinc-800/40 pt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={verifyFullName}
                          onChange={(e) => setVerifyFullName(e.target.value)}
                          placeholder="Your legal or brand name..."
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-850 dark:text-slate-100 focus:outline-none"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Category</label>
                        <select 
                          value={verifyCategory}
                          onChange={(e) => setVerifyCategory(e.target.value)}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-850 dark:text-slate-100 focus:outline-none"
                        >
                          <option value="Creator" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Digital Creator / Blogger</option>
                          <option value="Artist" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Artist / Musician</option>
                          <option value="Developer" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Software Engineer / Dev</option>
                          <option value="Public" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Public Figure</option>
                          <option value="Brand" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Brand / Business</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Identity/Proof Reference URL</label>
                        <input 
                          type="url" 
                          required
                          value={verifyProofText}
                          onChange={(e) => setVerifyProofText(e.target.value)}
                          placeholder="Link to your portfolio, github or social profiles..."
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-850 dark:text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2 mt-1">
                        <button 
                          type="button"
                          onClick={() => setShowVerificationForm(false)}
                          className="flex-grow py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800/65 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={verifyFormLoading}
                          className="flex-grow py-2 rounded-xl bg-violet-500 text-white font-bold text-xs hover:bg-violet-600 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {verifyFormLoading ? "Submitting..." : "Submit Request"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {settingsSubTab === "analytics" && (
              <div className="flex flex-col gap-4">
                <h4 className="font-extrabold text-base border-b border-white/5 pb-2 text-slate-800 dark:text-white">Creator Analytics</h4>
                {getAnalyticsDashboard()}
              </div>
            )}

            {settingsSubTab === "blocked" && (
              <div className="flex flex-col gap-4">
                <h4 className="font-extrabold text-base border-b border-white/5 pb-2 text-slate-800 dark:text-white">Blocked Users</h4>
                {activityLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
                  </div>
                ) : blockedUsersList.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 bg-slate-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
                    <p className="text-xs font-semibold">No blocked users.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {blockedUsersList.map(blocked => (
                      <div key={blocked._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 dark:bg-zinc-900/20 border border-slate-150 dark:border-zinc-850/50">
                        <div className="flex items-center gap-2.5">
                          <img src={getAvatarUrl(blocked)} className="h-9 w-9 rounded-full object-cover" />
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold">@{blocked.username}</span>
                            {blocked.name && <span className="text-[10px] text-slate-400">{blocked.name}</span>}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnblock(blocked._id)}
                          className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-[11px] hover:bg-violet-600 transition-colors shadow-sm"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {settingsSubTab === "muted" && (
              <div className="flex flex-col gap-4">
                <h4 className="font-extrabold text-base border-b border-white/5 pb-2 text-slate-800 dark:text-white">Muted Users</h4>
                {activityLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
                  </div>
                ) : mutedUsersList.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 bg-slate-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
                    <p className="text-xs font-semibold">No muted users.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {mutedUsersList.map(muted => (
                      <div key={muted._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 dark:bg-zinc-900/20 border border-slate-150 dark:border-zinc-850/50">
                        <div className="flex items-center gap-2.5">
                          <img src={getAvatarUrl(muted)} className="h-9 w-9 rounded-full object-cover" />
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold">@{muted.username}</span>
                            {muted.name && <span className="text-[10px] text-slate-400">{muted.name}</span>}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnmute(muted._id)}
                          className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-[11px] hover:bg-violet-600 transition-colors shadow-sm"
                        >
                          Unmute
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {settingsSubTab === "quickreplies" && (
              <div className="flex flex-col gap-4">
                <h4 className="font-extrabold text-base border-b border-white/5 pb-2 text-slate-800 dark:text-white">Quick Replies Configurations</h4>
                
                {/* Add new shortcut */}
                <div className="flex flex-col gap-3 text-left">
                  <span className="font-bold text-xs text-slate-500">Define keyboard shortcuts to instantly insert common messages in chats.</span>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
                    <input 
                      type="text" 
                      placeholder="Shortcut (e.g. /brb)..."
                      value={newShortcut}
                      onChange={(e) => setNewShortcut(e.target.value)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none w-full sm:w-1/3"
                    />
                    <input 
                      type="text" 
                      placeholder="Insert message mapping..."
                      value={newQuickReplyMessage}
                      onChange={(e) => setNewQuickReplyMessage(e.target.value)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none flex-grow"
                    />
                    <button 
                      onClick={() => {
                        if (newShortcut.trim() && newQuickReplyMessage.trim()) {
                          const updated = [...(profileUser.quickReplies || []), {
                            shortcut: newShortcut.trim().startsWith("/") ? newShortcut.trim() : `/${newShortcut.trim()}`,
                            message: newQuickReplyMessage.trim()
                          }];
                          updateUserSettings({ quickReplies: updated });
                          setNewShortcut("");
                          setNewQuickReplyMessage("");
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-violet-500 text-white font-bold text-xs hover:bg-violet-600 transition-colors shadow-sm"
                    >
                      Save Shortcut
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mt-2 max-h-[300px] overflow-y-auto pr-1">
                  {(profileUser.quickReplies || []).length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6 italic bg-slate-50/50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">No custom quick replies mapped.</p>
                  ) : (
                    (profileUser.quickReplies || []).map((reply, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-150 dark:border-zinc-850/50 text-left">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-extrabold text-violet-550 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-lg w-max">{reply.shortcut}</span>
                          <span className="text-xs font-semibold text-slate-650 dark:text-slate-300">"{reply.message}"</span>
                        </div>
                        <button 
                          onClick={() => {
                            const updated = (profileUser.quickReplies || []).filter((_, i) => i !== index);
                            updateUserSettings({ quickReplies: updated });
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1 bg-slate-100 hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {settingsSubTab === "liked" && (
              <div className="flex flex-col gap-4">
                <h4 className="font-extrabold text-base border-b border-white/5 pb-2 text-slate-800 dark:text-white">Liked Posts</h4>
                {activityLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
                  </div>
                ) : likedReelsList.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 bg-slate-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
                    <p className="text-xs font-semibold">You haven't liked any posts yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {likedReelsList.map(reel => (
                      <div 
                        key={reel._id} 
                        onClick={() => navigateTo("post", reel._id)}
                        className="group relative aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/5 shadow-md flex items-center justify-center cursor-pointer"
                      >
                        {reel.mediaType === "image" ? (
                          <img 
                            src={reel.mediaUrl} 
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-300"
                            alt=""
                          />
                        ) : (
                          <video 
                            src={reel.mediaUrl} 
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-300"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-bold text-white mb-0.5">@{reel.user?.username}</span>
                          <div className="flex items-center gap-1 text-white text-[10px] font-semibold">
                            <Heart size={10} className="fill-rose-500 text-rose-500" />
                            <span>{reel.likes?.length || 0}</span>
                          </div>
                        </div>
                        <div 
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {reel.mediaType === "image" ? <Image size={12} /> : <Film size={12} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {settingsSubTab === "watched" && (
              <div className="flex flex-col gap-4">
                <h4 className="font-extrabold text-base border-b border-white/5 pb-2 text-slate-800 dark:text-white">Post History</h4>
                {activityLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
                  </div>
                ) : watchedReelsList.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 bg-slate-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
                    <p className="text-xs font-semibold">No watched posts in history.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {watchedReelsList.map(reel => (
                      <div 
                        key={reel._id} 
                        onClick={() => navigateTo("post", reel._id)}
                        className="group relative aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/5 shadow-md flex items-center justify-center cursor-pointer"
                      >
                        {reel.mediaType === "image" ? (
                          <img 
                            src={reel.mediaUrl} 
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-300"
                            alt=""
                          />
                        ) : (
                          <video 
                            src={reel.mediaUrl} 
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-300"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-bold text-white mb-0.5">@{reel.user?.username}</span>
                          <div className="flex items-center gap-1 text-white text-[10px] font-semibold">
                            <Heart size={10} className="fill-rose-500 text-rose-500" />
                            <span>{reel.likes?.length || 0}</span>
                          </div>
                        </div>
                        <div 
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {reel.mediaType === "image" ? <Image size={12} /> : <Film size={12} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {settingsSubTab === "collab" && (
              <div className="flex flex-col gap-4">
                <h4 className="font-extrabold text-base border-b border-white/5 pb-2 text-slate-800 dark:text-white">Collaboration Invites</h4>
                {collabLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
                  </div>
                ) : collabInvites.length === 0 ? (
                  <p className="text-xs text-slate-500">No pending co-authorship invitations.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {collabInvites.map(invite => (
                      <div key={invite._id} className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/20">
                        <div className="flex items-center gap-2.5">
                          <img src={getAvatarUrl(invite.user)} className="h-7 w-7 rounded-full object-cover" />
                          <span className="text-xs font-bold">@{invite.user.username} <span className="font-normal text-slate-500">invited you to co-author:</span></span>
                        </div>
                        <p className="text-xs font-medium text-slate-655 dark:text-slate-355 bg-white/40 dark:bg-black/20 p-2.5 rounded-xl border border-slate-150 dark:border-zinc-800/40 italic">
                          "{invite.caption}"
                        </p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleCollabRespond(invite._id, true)}
                            className="flex-grow py-2 rounded-xl bg-violet-500 text-white font-bold text-xs hover:bg-violet-600 transition-colors shadow-sm"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleCollabRespond(invite._id, false)}
                            className="flex-grow py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {settingsSubTab === "closefriends" && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h4 className="font-extrabold text-base text-slate-800 dark:text-white">Close Friends List</h4>
                  <span className="text-xs bg-emerald-500/10 text-emerald-500 font-extrabold px-2.5 py-1 rounded-full">
                    {closeFriendsList.length} Friends
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Add friends to your Close Friends list so that they can see the stories you choose to share with close friends only.
                </p>

                {/* Search bar */}
                <div className="relative mt-2">
                  <input
                    type="text"
                    placeholder="Search followers..."
                    value={cfSearchQuery}
                    onChange={(e) => setCfSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <span className="absolute left-3.5 top-3 text-slate-400 text-xs">🔍</span>
                </div>

                {/* Followers List with add/remove toggle */}
                {activityLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {(() => {
                      const followers = profileUser?.followers || [];
                      const filteredFollowers = followers.filter(f => 
                        f.username?.toLowerCase().includes(cfSearchQuery.toLowerCase())
                      );

                      if (filteredFollowers.length === 0) {
                        return <p className="text-center text-xs text-slate-500 py-6">No followers found.</p>;
                      }

                      return filteredFollowers.map(f => {
                        const isCf = closeFriendsList.some(cfUser => String(cfUser._id) === String(f._id));

                        return (
                          <div key={f._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/30 border border-transparent hover:border-emerald-500/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <img src={getAvatarUrl(f)} className="h-9 w-9 rounded-full object-cover bg-white dark:bg-zinc-950 flex-shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">@{f.username}</span>
                                {f.name && <span className="text-[10px] text-slate-400">{f.name}</span>}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleToggleCloseFriend(f._id)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 cursor-pointer ${
                                isCf ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all duration-300 ${
                                  isCf ? "translate-x-4.5" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
