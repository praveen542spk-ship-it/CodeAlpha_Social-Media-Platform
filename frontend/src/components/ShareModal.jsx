import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { X, Search, Copy, Check, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ShareModal = ({ isOpen, onClose, postId, onShareCountUpdate }) => {
  const { currentUser, token, API_URL } = useAuth();
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [sentUsers, setSentUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSentUsers(new Set());
      return;
    }
    fetchUsers("");
  }, [isOpen]);

  const fetchUsers = async (query) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/search?q=${query}`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        // Exclude current user from the list
        setUsers(data.filter(u => u._id !== currentUser?._id));
      }
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchUsers(val);
  };

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/posts/${postId}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const incrementShareCount = async () => {
    try {
      const res = await fetch(`${API_URL}/posts/share/${postId}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        if (onShareCountUpdate) {
          onShareCountUpdate(data.sharesCount);
        }
        socket?.emit("post-update", {
          postId: postId,
          type: "share",
          sharesCount: data.sharesCount
        });
      }
    } catch (err) {
      console.error("Error incrementing share count:", err);
    }
  };

  const handleSendPost = async (user) => {
    if (sentUsers.has(user._id)) return;

    const postUrl = `${window.location.origin}/posts/${postId}`;
    const text = postUrl;

    // 1. Send the message via socket
    socket?.emit("send-message", {
      senderId: currentUser?._id,
      recipientId: user._id,
      text: text
    });

    // 2. Add to sent list
    setSentUsers(prev => {
      const next = new Set(prev);
      next.add(user._id);
      return next;
    });

    // 3. Increment share count
    await incrementShareCount();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md glass-panel p-6 rounded-3xl shadow-2xl relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Share Post</h3>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            {/* Copy Link Option */}
            <div className="mb-6">
              <button
                onClick={handleCopyLink}
                className="w-full p-4 rounded-2xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-900/40 hover:bg-violet-500/5 hover:border-violet-500/50 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl group-hover:scale-110 transition-transform">
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {copied ? "Link Copied!" : "Copy Post Link"}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold">Share outside of VibeShare</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-violet-500">
                  {copied ? "Copied" : "Copy"}
                </div>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search users..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border vibe-input-field outline-none text-sm font-medium"
              />
            </div>

            {/* User List */}
            <div className="max-h-[220px] overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {loading && users.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold">No users found</div>
              ) : (
                users.map(user => {
                  const isSent = sentUsers.has(user._id);
                  return (
                    <div key={user._id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-all">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.profilePic || "https://api.dicebear.com/7.x/adventurer/svg?seed=placeholder"}
                          className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]"
                          alt={user.username}
                        />
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {user.username}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {user.bio || "Active user"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendPost(user)}
                        disabled={isSent}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSent
                            ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-slate-500 cursor-default"
                            : "bg-violet-500 hover:bg-violet-600 text-white shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
                        }`}
                      >
                        {isSent ? (
                          <>
                            <Check size={12} />
                            Sent
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            Send
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
  );
};

export default ShareModal;
