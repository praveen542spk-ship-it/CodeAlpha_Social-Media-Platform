import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { 
  Heart, MessageCircle, Bookmark, Share2, X, Music, 
  Volume2, VolumeX, Trash, MapPin, Send, Circle, MoreVertical, Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ShareModal from "./ShareModal";
import SaveToCollectionModal from "./SaveToCollectionModal";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const PostDetailModal = ({ postId, onClose, navigateTo }) => {
  const { currentUser, token, toggleFollowUser, refreshCurrentUser, API_URL } = useAuth();
  const { socket, pushRESTNotification } = useSocket();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [activeDropdownCommentId, setActiveDropdownCommentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [savingPostForCollection, setSavingPostForCollection] = useState(null);

  // Audio Playback
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef(null);

  // Animation overlay
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);

  // Scroll ref
  const commentsEndRef = useRef(null);

  const fetchPostDetails = async () => {
    try {
      const headers = { "Authorization": token };
      const res = await fetch(`${API_URL}/posts/${postId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPost(data);
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      onClose();
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API_URL}/posts/comments/${postId}`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    
    // Track post view in history
    fetch(`${API_URL}/posts/watch-reel/${postId}`, {
      method: "POST",
      headers: { "Authorization": token }
    }).catch(err => console.error("Watch tracking error:", err));

    Promise.all([fetchPostDetails(), fetchComments()]).then(() => {
      setLoading(false);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [postId]);

  // Click listener to close options dropdown globally
  useEffect(() => {
    const closeDropdown = () => {
      setShowOptionsDropdown(false);
      setActiveDropdownCommentId(null);
    };
    window.addEventListener("click", closeDropdown);
    return () => window.removeEventListener("click", closeDropdown);
  }, []);

  // Real-time updates handler
  useEffect(() => {
    if (!socket || !post) return;

    const handlePostUpdated = (data) => {
      const { postId: updatedPostId, type, likes, sharesCount } = data;
      if (String(updatedPostId) !== String(post._id)) return;

      if (type === "like") {
        setPost(prev => ({ ...prev, likes }));
      } else if (type === "comment") {
        fetchComments();
        // Update commentsCount locally
        setPost(prev => ({ ...prev, commentsCount: (prev.commentsCount || 0) + 1 }));
      } else if (type === "delete") {
        onClose();
      } else if (type === "share") {
        setPost(prev => ({ ...prev, sharesCount }));
      }
    };

    socket.on("post-updated", handlePostUpdated);

    return () => {
      socket.off("post-updated", handlePostUpdated);
    };
  }, [socket, post]);

  const handleLikeToggle = async () => {
    if (!post) return;
    try {
      const res = await fetch(`${API_URL}/posts/like/${post._id}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        const isCurrentlyLiked = post.likes.includes(currentUser._id);
        const updatedLikes = isCurrentlyLiked 
          ? post.likes.filter(id => id !== currentUser._id) 
          : [...post.likes, currentUser._id];

        setPost(prev => ({ ...prev, likes: updatedLikes }));

        socket?.emit("post-update", {
          postId: post._id,
          type: "like",
          likes: updatedLikes
        });

        if (data.notification) {
          pushRESTNotification(post.user._id, data.notification);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  let lastTap = 0;
  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!post.likes.includes(currentUser._id)) {
        handleLikeToggle();
      }
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 1000);
    }
    lastTap = now;
  };

  const handleSharePost = () => {
    setShowShareModal(true);
  };

  const handleSaveToggle = async () => {
    if (!post) return;
    try {
      const res = await fetch(`${API_URL}/posts/save/${post._id}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        await refreshCurrentUser();
        if (data.isSaved) {
          setSavingPostForCollection(post);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostMusicToggle = () => {
    if (!post?.music) return;
    if (isPlayingMusic) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      setIsPlayingMusic(true);
      audioRef.current = new Audio(post.music.url);
      audioRef.current.currentTime = post.music.startTime || 0;
      audioRef.current.loop = true;
      audioRef.current.play().catch(err => console.log("Audio play blocked", err));
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`${API_URL}/posts/${post._id}`, {
        method: "DELETE",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        socket?.emit("post-update", {
          postId: post._id,
          type: "delete"
        });
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollowToggle = async () => {
    if (!post) return;
    const isFollowing = currentUser.following?.some(f => String(f._id || f) === String(post.user?._id || post.user));
    try {
      await toggleFollowUser(post.user._id, isFollowing);
      fetchPostDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentLikeToggle = async (commentId) => {
    try {
      const res = await fetch(`${API_URL}/posts/comment/like/${commentId}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setComments(prev => prev.map(c => {
          if (c._id === commentId) {
            const isLiked = c.likes.includes(currentUser._id);
            const likes = isLiked 
              ? c.likes.filter(id => id !== currentUser._id) 
              : [...c.likes, currentUser._id];
            return { ...c, likes };
          }
          return c;
        }));
        socket?.emit("post-update", {
          postId: post._id,
          type: "comment"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`${API_URL}/posts/comment/${commentId}`, {
        method: "DELETE",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c._id !== commentId));
        setPost(prev => ({ ...prev, commentsCount: Math.max(0, (prev.commentsCount || 0) - 1) }));
        socket?.emit("post-update", {
          postId: post._id,
          type: "comment"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !post) return;

    try {
      const endpoint = replyToCommentId 
        ? `${API_URL}/posts/comment/${replyToCommentId}/reply` 
        : `${API_URL}/posts/comment/${post._id}`;
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: newCommentText })
      });

      if (res.ok) {
        const data = await res.json();
        setNewCommentText("");
        setReplyToCommentId(null);
        fetchComments();
        setPost(prev => ({ ...prev, commentsCount: (prev.commentsCount || 0) + 1 }));

        socket?.emit("post-update", {
          postId: post._id,
          type: "comment"
        });

        if (data.notification) {
          pushRESTNotification(post.user._id, data.notification);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAvatarUrl = (user) => {
    if (!user) return "";
    return user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}&backgroundType=gradientLinear`;
  };

  const parseTagsAndMentions = (text) => {
    if (!text) return "";
    return text.split(/(\s+)/).map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <span 
            key={index} 
            className="text-violet-500 font-semibold cursor-pointer hover:underline" 
            onClick={() => {
              onClose();
              navigateTo("explore", part);
            }}
          >
            {part}
          </span>
        );
      }
      if (part.startsWith("@")) {
        const username = part.substring(1).replace(/[^a-zA-Z0-9_]/g, "");
        const handleMention = async () => {
          try {
            const res = await fetch(`${API_URL}/users/by-username/${username}`, { headers: { "Authorization": token } });
            if (res.ok) {
              const u = await res.json();
              onClose();
              navigateTo("profile", u._id);
            }
          } catch (err) {
            console.error(err);
          }
        };
        return <span key={index} className="text-violet-600 dark:text-violet-400 font-semibold cursor-pointer hover:underline" onClick={handleMention}>{part}</span>;
      }
      return part;
    });
  };

  const renderText = (text) => {
    if (!text) return "";
    
    // Split by newlines to handle paragraphs and list items
    const lines = text.split("\n");
    
    return lines.map((line, lineIdx) => {
      let isBullet = false;
      let displayLine = line;
      
      // Check if it's a bullet point (starts with "- " or "* ")
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        isBullet = true;
        displayLine = line.trim().substring(2);
      }
      
      // Parse markdown inline elements: bold (**), italic (*), code (`)
      const tokens = displayLine.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
      
      const parsedElements = tokens.map((token, tokIdx) => {
        // Bold: **text**
        if (token.startsWith("**") && token.endsWith("**")) {
          const innerText = token.slice(2, -2);
          return <strong key={tokIdx} className="font-bold text-slate-900 dark:text-white">{parseTagsAndMentions(innerText)}</strong>;
        }
        // Italic: *text*
        if (token.startsWith("*") && token.endsWith("*")) {
          const innerText = token.slice(1, -1);
          return <em key={tokIdx} className="italic text-slate-800 dark:text-slate-200">{parseTagsAndMentions(innerText)}</em>;
        }
        // Inline Code: `code`
        if (token.startsWith("`") && token.endsWith("`")) {
          const innerText = token.slice(1, -1);
          return <code key={tokIdx} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-xs text-rose-500 font-semibold">{innerText}</code>;
        }
        
        // Plain text: parse tags and mentions
        return parseTagsAndMentions(token);
      });
      
      if (isBullet) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 pl-3 my-0.5 text-left">
            <span className="text-violet-500 mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0"></span>
            <span className="flex-1 text-[13px] leading-relaxed">{parsedElements}</span>
          </div>
        );
      }
      
      return (
        <div key={lineIdx} className="min-h-[1.2rem] text-[13px] leading-relaxed text-left">
          {parsedElements}
        </div>
      );
    });
  };

  if (loading || !post) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  const isLiked = post.likes.includes(currentUser._id);
  const isSaved = currentUser.savedPosts?.includes(post._id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl h-[85vh] md:h-[80vh] bg-white dark:bg-[#07060f] glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all"
        >
          <X size={20} />
        </button>

        {/* Media Block (Left) */}
        <div 
          className="w-full md:w-[55%] h-[35%] md:h-full bg-zinc-950 flex items-center justify-center relative select-text"
        >
          {post.postType === "code" && post.codeSnippet ? (
            <div className="w-full h-full flex flex-col bg-[#1e1e1e] font-mono text-xs select-text">
              {/* VS Code title bar / tab header look */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#3c3c3c] select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></span>
                  <span className="text-[11px] text-[#cccccc] font-medium ml-2 font-sans truncate">
                    {post.codeSnippet.language === "javascript" ? "snippet.js" :
                     post.codeSnippet.language === "typescript" ? "snippet.ts" :
                     post.codeSnippet.language === "python" ? "main.py" :
                     post.codeSnippet.language === "java" ? "Main.java" :
                     post.codeSnippet.language === "cpp" ? "main.cpp" :
                     post.codeSnippet.language === "c" ? "main.c" :
                     post.codeSnippet.language === "markup" ? "index.html" :
                     post.codeSnippet.language === "css" ? "styles.css" :
                     post.codeSnippet.language === "sql" ? "query.sql" :
                     post.codeSnippet.language === "go" ? "main.go" :
                     post.codeSnippet.language === "rust" ? "main.rs" : `snippet.${post.codeSnippet.language || "txt"}`}
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(post.codeSnippet.code);
                    const btn = e.currentTarget;
                    const origText = btn.innerHTML;
                    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    setTimeout(() => {
                      btn.innerHTML = origText;
                    }, 2000);
                  }}
                  className="p-1 px-2 hover:bg-[#3c3c3c] text-[#cccccc] rounded transition-all flex items-center gap-1 text-[10px] font-bold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  Copy
                </button>
              </div>
              
              {/* Scrollable Highlight Box */}
              <div className="flex-1 overflow-auto text-left select-text p-4">
                <SyntaxHighlighter
                  language={post.codeSnippet.language || "javascript"}
                  style={vscDarkPlus}
                  showLineNumbers={true}
                  customStyle={{
                    margin: 0,
                    padding: "0px 8px 16px 0px",
                    background: "transparent",
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: "13px",
                    lineHeight: "1.6",
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: '"Fira code", "Fira Mono", monospace',
                      background: "transparent",
                    }
                  }}
                >
                  {post.codeSnippet.code || ""}
                </SyntaxHighlighter>
              </div>
            </div>
          ) : post.mediaUrl && post.mediaType !== "none" ? (
            post.mediaType === "image" ? (
              <img src={post.mediaUrl} className="w-full h-full object-contain cursor-pointer select-none" alt="" onClick={handleDoubleTap} />
            ) : (
              <video 
                src={post.mediaUrl} 
                className="w-full h-full object-contain cursor-pointer select-none" 
                controls 
                autoPlay 
                loop 
                playsInline 
                onClick={handleDoubleTap}
                onLoadedMetadata={(e) => {
                  if (post.videoTrim && post.videoTrim.endTime > 0) {
                    e.target.currentTime = post.videoTrim.startTime;
                  }
                }}
                onTimeUpdate={(e) => {
                  if (post.videoTrim && post.videoTrim.endTime > 0) {
                    if (e.target.currentTime < post.videoTrim.startTime) {
                      e.target.currentTime = post.videoTrim.startTime;
                    }
                    if (e.target.currentTime >= post.videoTrim.endTime) {
                      e.target.currentTime = post.videoTrim.startTime;
                      e.target.play().catch(() => {});
                    }
                  }
                }}
              />
            )
          ) : (
            <div className="w-full h-full p-6 flex items-center justify-center text-center font-semibold text-sm leading-relaxed text-slate-300 bg-gradient-to-br from-violet-950/40 to-teal-950/40 cursor-pointer select-none" onClick={handleDoubleTap}>
              {post.caption}
            </div>
          )}

          {/* Heart overlay */}
          <AnimatePresence>
            {showHeartOverlay && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 0.9 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute z-10 text-white drop-shadow-2xl pointer-events-none"
              >
                <Heart size={80} className="fill-rose-500 text-rose-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Details Block (Right) */}
        <div className="flex-1 h-[65%] md:h-full flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200/40 dark:border-slate-800/40">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200/40 dark:border-slate-800/40 flex justify-between items-center bg-white/40 dark:bg-black/10">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => {
                onClose();
                navigateTo("profile", post.user._id);
              }}
            >
              <img src={getAvatarUrl(post.user)} className="h-9 w-9 rounded-full object-cover border border-violet-500/10" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs hover:underline flex items-center gap-1">
                  {post.user.username}
                  {post.user.isVerified && <Award size={13} className="text-violet-500 fill-violet-500/30" title="Verified Creator" />}
                </span>
                {post.location && (
                  <span className="text-[9px] text-slate-500 flex items-center gap-0.5"><MapPin size={8} /> {post.location}</span>
                )}
              </div>
            </div>

            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptionsDropdown(!showOptionsDropdown);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-500 dark:text-slate-400 rounded-xl transition-all duration-300 active:scale-95"
                title="Options"
              >
                <MoreVertical size={18} />
              </button>

              <AnimatePresence>
                {showOptionsDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 mt-2 w-36 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl shadow-xl z-30 overflow-hidden text-xs text-left"
                  >
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/posts/${post._id}`);
                        alert("Link copied to clipboard!");
                        setShowOptionsDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                    >
                      Copy Link
                    </button>
                    <button 
                      onClick={() => {
                        handleSaveToggle();
                        setShowOptionsDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                    >
                      {isSaved ? "Unsave Post" : "Save Post"}
                    </button>
                    {String(post.user._id) !== String(currentUser._id) && (
                      <button 
                        onClick={() => {
                          handleFollowToggle();
                          setShowOptionsDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                      >
                        {currentUser.following?.some(f => String(f._id || f) === String(post.user?._id || post.user)) ? "Unfollow" : "Follow"}
                      </button>
                    )}
                    {String(post.user._id) === String(currentUser._id) && (
                      <button 
                        onClick={() => {
                          handleDeletePost();
                          setShowOptionsDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 hover:bg-rose-500/10 font-bold text-rose-500 transition-colors border-t border-slate-100 dark:border-zinc-800/50 text-left"
                      >
                        Delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Description & Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
            {/* Caption description */}
            <div className="flex gap-3 items-start text-[13px] pb-3 border-b border-slate-200/20 dark:border-slate-800/20">
              <img src={getAvatarUrl(post.user)} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
              <div className="bg-slate-50/50 dark:bg-zinc-900/30 p-3 rounded-2xl flex-1">
                <span className="font-bold text-xs inline-flex items-center gap-1 mr-2">
                  {post.user.username}
                  {post.user.isVerified && <Award size={13} className="text-violet-500 fill-violet-500/30" title="Verified Creator" />}
                </span>
                <p className="inline text-slate-700 dark:text-slate-200 leading-normal">{renderText(post.caption)}</p>
                <span className="block text-[9.5px] text-slate-500 mt-1">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Comments */}
            {comments.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-8">No comments yet. Start the conversation!</p>
            ) : (
              comments.filter(c => !c.parentComment).map(c => {
                const cLiked = c.likes?.includes(currentUser._id);
                const cOwner = String(c.user?._id) === String(currentUser._id) || String(post.user?._id) === String(currentUser._id);
                const replies = comments.filter(r => String(r.parentComment) === String(c._id));

                return (
                  <div key={c._id} className="space-y-2.5">
                    {/* Parent Comment */}
                    <div className="flex gap-2.5 items-start text-[13px]">
                      <img src={getAvatarUrl(c.user)} className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 bg-slate-100/60 dark:bg-slate-900/40 p-3 rounded-2xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[11px] flex items-center gap-1">
                            {c.user?.username}
                            {c.user?.isVerified && <Award size={11} className="text-violet-500 fill-violet-500/30" />}
                          </span>
                          <span className="text-[9px] text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-normal">{renderText(c.text)}</p>
                        <div className="flex items-center gap-3.5 mt-2">
                          <button 
                            onClick={() => {
                              setReplyToCommentId(c._id);
                              setNewCommentText(`@${c.user?.username} `);
                            }}
                            className="text-[9.5px] font-bold text-violet-500 hover:underline"
                          >
                            Reply
                          </button>
                          
                          <button 
                            onClick={() => handleCommentLikeToggle(c._id)}
                            className={`text-[9.5px] font-bold flex items-center gap-1 hover:underline ${cLiked ? "text-rose-500" : "text-slate-500"}`}
                          >
                            <Heart size={10} className={cLiked ? "fill-rose-500 text-rose-500" : ""} />
                            <span>{c.likes?.length || 0}</span>
                          </button>

                          <div className="relative ml-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownCommentId(activeDropdownCommentId === c._id ? null : c._id);
                              }}
                              className="p-1 hover:bg-slate-200/50 dark:hover:bg-zinc-850/80 rounded-full transition-all text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                            >
                              <MoreVertical size={11} />
                            </button>
                            <AnimatePresence>
                              {activeDropdownCommentId === c._id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 bottom-full mb-1.5 w-28 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-xl shadow-lg z-30 overflow-hidden text-[10px] text-left"
                                >
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(c.text);
                                      alert("Comment copied to clipboard!");
                                      setActiveDropdownCommentId(null);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                                  >
                                    Copy Text
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${window.location.origin}/posts/${post._id}`);
                                      alert("Post link copied to share!");
                                      setActiveDropdownCommentId(null);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                                  >
                                    Share Link
                                  </button>
                                  {cOwner && (
                                    <button
                                      onClick={() => {
                                        handleCommentDelete(c._id);
                                        setActiveDropdownCommentId(null);
                                      }}
                                      className="w-full px-3 py-1.5 hover:bg-rose-500/10 font-bold text-rose-500 transition-colors border-t border-slate-100 dark:border-zinc-800/50 text-left"
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
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="pl-6 space-y-2 border-l border-slate-200/50 dark:border-slate-800/50 ml-3.5">
                        {replies.map(r => {
                          const rLiked = r.likes?.includes(currentUser._id);
                          const rOwner = String(r.user?._id) === String(currentUser._id) || String(post.user?._id) === String(currentUser._id);

                          return (
                            <div key={r._id} className="flex gap-2 items-start text-[12px]">
                              <img src={getAvatarUrl(r.user)} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                              <div className="flex-1 bg-slate-50 dark:bg-slate-900/20 p-2.5 rounded-2xl">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-[10px] flex items-center gap-1">
                                    {r.user?.username}
                                    {r.user?.isVerified && <Award size={9} className="text-violet-500 fill-violet-500/30" />}
                                  </span>
                                  <span className="text-[8.5px] text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-350 leading-normal">{renderText(r.text)}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <button 
                                    onClick={() => handleCommentLikeToggle(r._id)}
                                    className={`text-[9px] font-bold flex items-center gap-0.5 hover:underline ${rLiked ? "text-rose-500" : "text-slate-500"}`}
                                  >
                                    <Heart size={9} className={rLiked ? "fill-rose-500 text-rose-500" : ""} />
                                    <span>{r.likes?.length || 0}</span>
                                  </button>
                                  <div className="relative ml-auto">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdownCommentId(activeDropdownCommentId === r._id ? null : r._id);
                                      }}
                                      className="p-1 hover:bg-slate-200/50 dark:hover:bg-zinc-850/80 rounded-full transition-all text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                                    >
                                      <MoreVertical size={10} />
                                    </button>
                                    <AnimatePresence>
                                      {activeDropdownCommentId === r._id && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="absolute right-0 bottom-full mb-1.5 w-26 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-xl shadow-lg z-30 overflow-hidden text-[9.5px] text-left"
                                        >
                                          <button
                                            onClick={() => {
                                              navigator.clipboard.writeText(r.text);
                                              alert("Reply copied to clipboard!");
                                              setActiveDropdownCommentId(null);
                                            }}
                                            className="w-full px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                                          >
                                            Copy Text
                                          </button>
                                          <button
                                            onClick={() => {
                                              navigator.clipboard.writeText(`${window.location.origin}/posts/${post._id}`);
                                              alert("Post link copied to share!");
                                              setActiveDropdownCommentId(null);
                                            }}
                                            className="w-full px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                                          >
                                            Share Link
                                          </button>
                                          {rOwner && (
                                            <button
                                              onClick={() => {
                                                handleCommentDelete(r._id);
                                                setActiveDropdownCommentId(null);
                                              }}
                                              className="w-full px-2.5 py-1.5 hover:bg-rose-500/10 font-bold text-rose-500 transition-colors border-t border-slate-100 dark:border-zinc-800/50 text-left"
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Footer & Actions */}
          <div className="p-4 border-t border-slate-200/40 dark:border-slate-800/40 space-y-3 bg-white/40 dark:bg-black/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={handleLikeToggle} className={`flex items-center gap-1 hover:text-rose-500 transition-colors ${isLiked ? "text-rose-500" : ""}`}>
                  <Heart size={20} className={isLiked ? "fill-rose-500" : ""} />
                  <span className="text-xs font-bold">{post.likes.length}</span>
                </button>
                <button className="flex items-center gap-1 hover:text-violet-500 transition-colors">
                  <MessageCircle size={20} />
                  <span className="text-xs font-bold">{post.commentsCount || 0}</span>
                </button>
                <button onClick={handleSharePost} className="flex items-center gap-1 hover:text-emerald-500 transition-colors">
                  <Share2 size={20} />
                  <span className="text-xs font-bold">{post.sharesCount || 0}</span>
                </button>
                
                {post.music && post.music.url && (
                  <button 
                    onClick={handlePostMusicToggle}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                      isPlayingMusic ? "text-violet-500 animate-pulse" : "text-slate-500 hover:text-violet-500"
                    }`}
                  >
                    {isPlayingMusic ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span className="text-[9px] bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full truncate max-w-[80px]">
                      {post.music.title}
                    </span>
                  </button>
                )}
              </div>

              <button onClick={handleSaveToggle} className={`hover:text-violet-500 transition-colors ${isSaved ? "text-violet-500" : ""}`}>
                <Bookmark size={20} className={isSaved ? "fill-violet-500" : ""} />
              </button>
            </div>

            {/* Comment Form */}
            <form onSubmit={submitComment} className="flex gap-2 items-center pt-2">
              <input 
                type="text"
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={replyToCommentId ? "Reply..." : "Comment..."}
                className="flex-grow px-3 py-2 text-xs rounded-xl border vibe-input-field outline-none font-medium"
              />
              <button type="submit" className="p-2 bg-violet-500 text-white rounded-xl active:scale-95 transition-all">
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>

        {/* Post Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          postId={post?._id}
          onShareCountUpdate={(newCount) => {
            setPost(prev => ({ ...prev, sharesCount: newCount }));
          }}
        />

        {savingPostForCollection && (
          <SaveToCollectionModal 
            post={savingPostForCollection} 
            onClose={() => setSavingPostForCollection(null)} 
          />
        )}

      </motion.div>
    </div>
  );
};

export default PostDetailModal;
