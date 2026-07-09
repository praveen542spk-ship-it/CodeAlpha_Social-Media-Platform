import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Heart, MessageCircle, UserPlus, MessageSquare, Bell, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const Notifications = ({ navigateTo }) => {
  const { currentUser } = useAuth();
  const { notifications, clearNotifications } = useSocket();

  useEffect(() => {
    // Automatically mark all notifications as read when visiting this page
    clearNotifications();
  }, []);

  const getAvatarUrl = (user) => {
    return user?.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.username || "Vibe")}&backgroundType=gradientLinear`;
  };

  const getNotificationText = (n) => {
    switch (n.type) {
      case "like":
        return "liked your post.";
      case "comment":
        return "commented on your post.";
      case "follow":
        return "started following you.";
      case "message":
        return "sent you a message.";
      case "story_mention":
        return "mentioned you in their story! Check your DMs. 📸";
      default:
        return "interacted with your profile.";
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="text-rose-500 fill-rose-500 animate-pulse" size={14} />;
      case "comment":
        return <MessageCircle className="text-blue-500 fill-blue-500" size={14} />;
      case "follow":
        return <UserPlus className="text-emerald-500" size={14} />;
      case "message":
        return <MessageSquare className="text-violet-500" size={14} />;
      case "story_mention":
        return <span className="text-base leading-none">📸</span>;
      default:
        return <Bell className="text-slate-500" size={14} />;
    }
  };

  const handleBack = () => {
    navigateTo("feed");
  };

  return (
    <div className="w-full min-h-screen px-4 py-6 max-w-2xl mx-auto flex flex-col gap-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/40 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-2.5 glass-panel rounded-2xl text-slate-500 hover:text-violet-500 transition-all duration-300"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-xl font-extrabold tracking-tight">Notifications</h2>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {notifications.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-3xl p-8 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
              <Bell size={28} className="text-violet-500" />
            </div>
            <h3 className="font-extrabold text-sm">No notifications yet</h3>
            <p className="text-slate-500 text-xs mt-1.5 max-w-xs font-medium">When users like your posts, comment on them, follow you, or send you messages, they will appear here!</p>
          </div>
        ) : (
          notifications.map((n, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.4) }}
              key={n._id || idx}
              className={`flex items-center justify-between p-4 glass-panel rounded-2xl shadow-sm transition-all hover:bg-white/60 dark:hover:bg-black/25 ${!n.isRead ? "border-l-4 border-l-violet-500" : ""}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* User Avatar with Icon Badge */}
                <div 
                  className="relative cursor-pointer flex-shrink-0" 
                  onClick={() => n.sender && navigateTo("profile", n.sender._id)}
                >
                  <img src={getAvatarUrl(n.sender)} className="h-11 w-11 rounded-full object-cover border border-violet-500/20" />
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#0b0b14] p-1 rounded-full border border-slate-200/30 shadow-sm flex items-center justify-center">
                    {getNotificationIcon(n.type)}
                  </div>
                </div>

                {/* Content text */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold leading-tight">
                    <span 
                      className="font-extrabold hover:underline cursor-pointer text-slate-900 dark:text-white mr-1.5"
                      onClick={() => n.sender && navigateTo("profile", n.sender._id)}
                    >
                      {n.sender ? n.sender.username : "Someone"}
                    </span>
                    {getNotificationText(n)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase tracking-wide">
                    {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Action Thumbnail for post or story mention (if applicable) */}
              {n.post && (
                <div 
                  className="h-11 w-11 rounded-xl overflow-hidden border border-slate-200/40 dark:border-slate-800/40 cursor-pointer hover:opacity-85 transition-all flex-shrink-0 ml-3 shadow-inner"
                  onClick={() => navigateTo("post", n.post._id)}
                >
                  {n.post.mediaType === "video" ? (
                    <div className="bg-black h-full w-full flex items-center justify-center text-white text-[8px] font-bold">VIDEO</div>
                  ) : (
                    <img src={n.post.mediaUrl} className="h-full w-full object-cover" />
                  )}
                </div>
              )}
              {n.type === "story_mention" && n.story && (
                <div className="h-11 w-11 rounded-xl overflow-hidden border-2 border-violet-500/40 flex-shrink-0 ml-3 shadow-inner relative">
                  {n.story.mediaType === "video" ? (
                    <div className="bg-gradient-to-br from-violet-900 to-fuchsia-900 h-full w-full flex items-center justify-center text-white text-[8px] font-bold">📹</div>
                  ) : n.story.mediaUrl ? (
                    <img src={n.story.mediaUrl} className="h-full w-full object-cover" alt="story" />
                  ) : (
                    <div className="bg-gradient-to-br from-violet-900 to-fuchsia-900 h-full w-full flex items-center justify-center text-xl">📸</div>
                  )}
                  <div className="absolute inset-0 border-2 border-violet-400/30 rounded-xl pointer-events-none" />
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
