import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { 
  Heart, MessageCircle, Bookmark, Share2, Compass, PlusCircle, 
  MapPin, Send, Trash, Smile, Play, Pause, ChevronRight, X,
  Music, Volume2, VolumeX, MoreVertical, Eye, Type, AtSign, ChevronLeft, Check, Move, Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MusicLibrary from "../components/MusicLibrary";
import ShareModal from "../components/ShareModal";
import SaveToCollectionModal from "../components/SaveToCollectionModal";
import prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/themes/prism-tomorrow.css";
import Editor from "react-simple-code-editor";
const EditorComponent = Editor.default || Editor;
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const Feed = ({ navigateTo }) => {
  const { currentUser, token, toggleFollowUser, refreshCurrentUser, API_URL } = useAuth();
  const { socket, pushRESTNotification } = useSocket();

  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showMobileCreateMenu, setShowMobileCreateMenu] = useState(false);
  const [showCommentsPost, setShowCommentsPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [activeDropdownCommentId, setActiveDropdownCommentId] = useState(null);
  const [shareModalPost, setShareModalPost] = useState(null);
  const [savingPostForCollection, setSavingPostForCollection] = useState(null);

  // Story Creation states
  const [storyTab, setStoryTab] = useState("gallery"); // gallery or text
  const [storyBgGradient, setStoryBgGradient] = useState("sunset");
  const [storyTextColor, setStoryTextColor] = useState("#ffffff");
  const [storyTextFont, setStoryTextFont] = useState("sans-serif");
  const [storyTextOverlay, setStoryTextOverlay] = useState("");
  const [storyTextX, setStoryTextX] = useState(50);
  const [storyTextY, setStoryTextY] = useState(50);
  const [showStoryDropdown, setShowStoryDropdown] = useState(false);
  const [storyCloseFriendsOnly, setStoryCloseFriendsOnly] = useState(false);

  // Story Repost state (when arriving from DM "Add to My Story" button)
  const [storyRepostUrl, setStoryRepostUrl] = useState("");
  const [storyRepostType, setStoryRepostType] = useState("image");

  // Instagram-style story editor
  const [storyEditorPanel, setStoryEditorPanel] = useState(null); // null | "text" | "music" | "location" | "emoji" | "mention" | "adjust"
  const [storyLocation, setStoryLocation] = useState("");
  const [storyMediaScale, setStoryMediaScale] = useState(1);
  const [storyMediaX, setStoryMediaX] = useState(0);
  const [storyMediaY, setStoryMediaY] = useState(0);

  // Story Mention States
  const [storyMentions, setStoryMentions] = useState([]); // array of {_id, username, profilePic}
  const [storyMentionSearch, setStoryMentionSearch] = useState("");
  const [storyMentionResults, setStoryMentionResults] = useState([]);

  // New Post Form
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [location, setLocation] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState("");

  // Collaborators States
  const [collabSearch, setCollabSearch] = useState("");
  const [collabResults, setCollabResults] = useState([]);
  const [selectedCollab, setSelectedCollab] = useState(null);
  
  // Code Snippet States
  const [createPostTab, setCreatePostTab] = useState("media"); // "media" or "code"
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  
  // Card Dropdown State
  const [activeDropdownPostId, setActiveDropdownPostId] = useState(null);
  
  // ⏳ Time-Capsule State
  const [unlockDate, setUnlockDate] = useState("");
  const [showTimeCapsuleOptions, setShowTimeCapsuleOptions] = useState(false);

  // 🔒 Vault State
  const [isVaultPost, setIsVaultPost] = useState(false);
  const [vaultFile, setVaultFile] = useState(null);
  const [vaultFilePreview, setVaultFilePreview] = useState("");
  const [vaultAddingPostId, setVaultAddingPostId] = useState(null);
  const [vaultAddFile, setVaultAddFile] = useState(null);
  const [vaultAddLoading, setVaultAddLoading] = useState(false);
  
  // Music Integration States
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [playingPostId, setPlayingPostId] = useState(null);
  const feedAudioRef = useRef(null);
  const storyAudioRef = useRef(null);
  const [storyMuted, setStoryMuted] = useState(false);

  // YouTube integration in Feed/Story
  const [storyYtPlayer, setStoryYtPlayer] = useState(null);
  const storyYtRef = useRef(null);

  // Lazyload YouTube API on mount
  useEffect(() => {
    const loadYTAPI = () => {
      return new Promise((resolve) => {
        if (window.YT && window.YT.Player) { resolve(window.YT); return; }
        if (!document.getElementById("yt-iframe-api")) {
          const tag = document.createElement("script");
          tag.id = "yt-iframe-api";
          tag.src = "https://www.youtube.com/iframe_api";
          document.body.appendChild(tag);
        }
        const interval = setInterval(() => {
          if (window.YT && window.YT.Player) { clearInterval(interval); resolve(window.YT); }
        }, 100);
      });
    };

    let player = null;
    loadYTAPI().then((YT) => {
      player = new YT.Player("feed-story-yt-player", {
        height: "0",
        width: "0",
        videoId: "",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: () => {
            setStoryYtPlayer(player);
            storyYtRef.current = player;
          }
        }
      });
    });
    return () => {
      try { player?.destroy(); } catch (_) {}
    };
  }, []);

  // Video Trimming States
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const previewVideoRef = useRef(null);
  const storyVideoRef = useRef(null);

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const MAX_TRIM_DURATION = 180; // 3 minutes max

  const formatDuration = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 65); // note: actually secs should be % 60, but let's do % 60. Wait, let's write % 60
    const remainderSecs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${remainderSecs < 10 ? "0" : ""}${remainderSecs}.${ms}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (!isImage && !isVideo) {
      alert("Please select a valid image or video file.");
      return;
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      alert(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please select a file smaller than 100MB.`);
      return;
    }

    setMediaType(isImage ? "image" : "video");
    setSelectedFile(file);

    const objectUrl = URL.createObjectURL(file);
    setMediaPreview(objectUrl);

    if (isVideo) {
      const tempVideo = document.createElement("video");
      tempVideo.src = objectUrl;
      tempVideo.onloadedmetadata = () => {
        setVideoDuration(tempVideo.duration);
        setTrimStart(0);
        setTrimEnd(tempVideo.duration);
      };
    }
  };

  const clearSelectedFile = () => {
    if (mediaPreview && mediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreview);
    }
    setSelectedFile(null);
    setMediaUrl("");
    setMediaType("none");
    setMediaPreview("");
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setPreviewTime(0);
    setStoryTextOverlay("");
    setStoryTextX(50);
    setStoryTextY(50);
  };

  const clearStoryMentions = () => {
    setStoryMentions([]);
    setStoryMentionSearch("");
    setStoryMentionResults([]);
  };

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video || mediaType !== "video") return;

    const handleTimeUpdate = () => {
      setPreviewTime(video.currentTime);
      if (video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
        video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [mediaPreview, mediaType, trimStart, trimEnd]);

  // Stories Viewer
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyTimer, setStoryTimer] = useState(0);
  const storyTimerRef = useRef(null);

  // Heart double-tap animation state
  const [likeOverlayPostId, setLikeOverlayPostId] = useState(null);

  // Fetch Feed, Stories, Suggestions
  const loadFeedData = async () => {
    try {
      const headers = { "Authorization": token };
      
      // Feed Posts
      const postRes = await fetch(`${API_URL}/posts?feed=true`, { headers });
      if (postRes.ok) setPosts(await postRes.json());

      // Stories Feed
      const storyRes = await fetch(`${API_URL}/stories/feed`, { headers });
      if (storyRes.ok) setStories(await storyRes.json());

      // Suggestions
      const suggRes = await fetch(`${API_URL}/users/suggestions`, { headers });
      if (suggRes.ok) setSuggestions(await suggRes.json());

    } catch (err) {
      console.error("Error loading feed data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedData();
    
    // Check if user navigated from DM "Add to My Story" button
    const pending = localStorage.getItem("pendingStoryData");
    if (pending) {
      try {
        const { mediaUrl, mediaType } = JSON.parse(pending);
        localStorage.removeItem("pendingStoryData");
        setStoryRepostUrl(mediaUrl);
        setStoryRepostType(mediaType || "image");
        setMediaPreview(mediaUrl);
        setMediaType(mediaType || "image");
        setStoryTab("gallery");
        setShowCreateStoryModal(true);
      } catch (e) {
        localStorage.removeItem("pendingStoryData");
      }
    }

    const closeDropdowns = () => {
      setActiveDropdownPostId(null);
      setActiveDropdownCommentId(null);
    };
    window.addEventListener("click", closeDropdowns);

    const handleRefreshEvent = () => {
      loadFeedData();
    };
    window.addEventListener("refresh-feed", handleRefreshEvent);

    return () => {
      window.removeEventListener("click", closeDropdowns);
      window.removeEventListener("refresh-feed", handleRefreshEvent);
    };
  }, []);

  // Story mention user search effect
  useEffect(() => {
    if (!storyMentionSearch.trim()) {
      setStoryMentionResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const headers = { "Authorization": token, "Content-Type": "application/json" };
        const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(storyMentionSearch)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          // Exclude already-mentioned users and self
          const alreadyIds = new Set(storyMentions.map(u => u._id));
          setStoryMentionResults(
            data.filter(u => u._id !== currentUser._id && !alreadyIds.has(u._id))
          );
        }
      } catch (err) {
        console.error("Error searching story mentions:", err);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [storyMentionSearch, storyMentions]);

  // Collaborator search effect
  useEffect(() => {
    if (!collabSearch.trim()) {
      setCollabResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(collabSearch)}`, {
          headers: { "Authorization": token }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter out current user
          setCollabResults(data.filter(u => u._id !== currentUser._id));
        }
      } catch (err) {
        console.error("Error searching collaborators:", err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [collabSearch]);

  // Real-time socket sync listeners
  useEffect(() => {
    if (!socket) return;

    const handlePostUpdated = (data) => {
      const { postId, type, likes, sharesCount } = data;
      
      if (type === "like") {
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            return { ...p, likes };
          }
          return p;
        }));
      } else if (type === "comment") {
        if (showCommentsPost && showCommentsPost._id === postId) {
          fetch(`${API_URL}/posts/comments/${postId}`)
            .then(res => res.json())
            .then(list => setComments(list))
            .catch(err => console.error(err));
        }
        loadFeedData();
      } else if (type === "delete") {
        setPosts(prev => prev.filter(p => p._id !== postId));
        if (showCommentsPost && showCommentsPost._id === postId) {
          setShowCommentsPost(null);
        }
      } else if (type === "share") {
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            return { ...p, sharesCount };
          }
          return p;
        }));
      }
    };

    const handleStoryUpdated = (data) => {
      loadFeedData();
    };

    socket.on("post-updated", handlePostUpdated);
    socket.on("story-updated", handleStoryUpdated);

    return () => {
      socket.off("post-updated", handlePostUpdated);
      socket.off("story-updated", handleStoryUpdated);
    };
  }, [socket, showCommentsPost]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (feedAudioRef.current) {
        feedAudioRef.current.pause();
      }
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
      }
    };
  }, []);

  // Post Deletion Trigger & Popup
  const [postToDelete, setPostToDelete] = useState(null);

  const triggerDeletePost = (post) => {
    setPostToDelete(post);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      const res = await fetch(`${API_URL}/posts/${postToDelete._id}`, {
        method: "DELETE",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p._id !== postToDelete._id));
        socket?.emit("post-update", {
          postId: postToDelete._id,
          type: "delete"
        });
        if (playingPostId === postToDelete._id) {
          if (feedAudioRef.current) feedAudioRef.current.pause();
          setPlayingPostId(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostToDelete(null);
    }
  };

  // Post Share Handler
  const handleSharePost = (post) => {
    setShareModalPost(post);
  };

  // Play/Pause Post Music
  const handlePostMusicToggle = (post) => {
    if (playingPostId === post._id) {
      if (feedAudioRef.current) feedAudioRef.current.pause();
      setPlayingPostId(null);
    } else {
      if (feedAudioRef.current) feedAudioRef.current.pause();
      setPlayingPostId(post._id);
      feedAudioRef.current = new Audio(post.music.url);
      feedAudioRef.current.currentTime = post.music.startTime || 0;
      feedAudioRef.current.loop = true;
      feedAudioRef.current.play().catch(err => console.log("Audio play blocked", err));
    }
  };

  // Liking individual comments
  const handleCommentLikeToggle = async (commentId) => {
    try {
      const res = await fetch(`${API_URL}/posts/comment/like/${commentId}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
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
          postId: showCommentsPost._id,
          type: "comment"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Deleting own comments
  const handleCommentDelete = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`${API_URL}/posts/comment/${commentId}`, {
        method: "DELETE",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c._id !== commentId));
        socket?.emit("post-update", {
          postId: showCommentsPost._id,
          type: "comment"
        });
        loadFeedData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post Actions
  const handleLikeToggle = async (post) => {
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

        setPosts(prev => prev.map(p => {
          if (p._id === post._id) {
            return { ...p, likes: updatedLikes };
          }
          return p;
        }));

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

  // Double tap handler
  let lastTap = 0;
  const handleDoubleTap = (e, post) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Trigger like if not already liked
      if (!post.likes.includes(currentUser._id)) {
        handleLikeToggle(post);
      }
      setLikeOverlayPostId(post._id);
      setTimeout(() => setLikeOverlayPostId(null), 1000);
    }
    lastTap = now;
  };

  const handleSaveToggle = async (post) => {
    try {
      const res = await fetch(`${API_URL}/posts/save/${post._id}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        await refreshCurrentUser();
        loadFeedData();
        if (data.isSaved) {
          setSavingPostForCollection(post);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Follow suggestions
  const handleFollowSuggestion = async (userId) => {
    try {
      await toggleFollowUser(userId, false);
      loadFeedData();
    } catch (err) {
      console.error(err);
    }
  };

  // Comments Drawer
  const openComments = async (post) => {
    setShowCommentsPost(post);
    setReplyToCommentId(null);
    setNewCommentText("");
    try {
      const res = await fetch(`${API_URL}/posts/comments/${post._id}`);
      if (res.ok) setComments(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !showCommentsPost) return;

    try {
      const endpoint = replyToCommentId 
        ? `${API_URL}/posts/comment/${replyToCommentId}/reply` 
        : `${API_URL}/posts/comment/${showCommentsPost._id}`;
      
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
        openComments(showCommentsPost); // refresh comments list
        
        // Notify socket
        if (data.notification) {
          pushRESTNotification(showCommentsPost.user._id, data.notification);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Stories Logic
  const [showStoryAnalytics, setShowStoryAnalytics] = useState(null);
  const [storyAnalyticsLoading, setStoryAnalyticsLoading] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const openStoryViewer = (group) => {
    setActiveStoryGroup(group);
    setActiveStoryIndex(0);
    setStoryTimer(0);
    setIsAnalyticsOpen(false);
    setShowStoryDropdown(false);
    setShowStoryAnalytics(null);
  };

  const closeStoryViewer = () => {
    setActiveStoryGroup(null);
    clearInterval(storyTimerRef.current);
    setIsAnalyticsOpen(false);
    setShowStoryDropdown(false);
    setShowStoryAnalytics(null);
    if (storyAudioRef.current) {
      storyAudioRef.current.pause();
      storyAudioRef.current = null;
    }
  };

  const handleStoryVideoLoaded = (e) => {
    const video = e.target;
    const activeStory = activeStoryGroup?.stories[activeStoryIndex];
    if (!activeStory) return;
    const trim = activeStory.videoTrim;
    const trimStart = (trim && trim.startTime) || 0;
    video.currentTime = trimStart;
    video.play().catch(() => {});
  };

  const handleStoryVideoTimeUpdate = (e) => {
    const video = e.target;
    const activeStory = activeStoryGroup?.stories[activeStoryIndex];
    if (!activeStory) return;
    const trim = activeStory.videoTrim;
    const trimStart = (trim && trim.startTime) || 0;
    const trimEnd = (trim && trim.endTime && trim.endTime > 0) ? trim.endTime : video.duration || 5;

    if (video.currentTime < trimStart) {
      video.currentTime = trimStart;
    }

    if (video.currentTime >= trimEnd) {
      // Transition to next story
      if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
        setActiveStoryIndex(activeStoryIndex + 1);
      } else {
        closeStoryViewer();
      }
      return;
    }

    // Update progress bar
    const progress = ((video.currentTime - trimStart) / (trimEnd - trimStart)) * 100;
    setStoryTimer(progress);
  };

  const handleOpenStoryAnalytics = async (storyId) => {
    setStoryAnalyticsLoading(true);
    setIsAnalyticsOpen(true);
    clearInterval(storyTimerRef.current);
    if (storyVideoRef.current) {
      storyVideoRef.current.pause();
    }
    try {
      const res = await fetch(`${API_URL}/stories/analytics/${storyId}`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        setShowStoryAnalytics(data);
      }
    } catch (err) {
      console.error("Error fetching story analytics:", err);
    } finally {
      setStoryAnalyticsLoading(false);
    }
  };

  const handleCloseStoryAnalytics = () => {
    setIsAnalyticsOpen(false);
    setShowStoryAnalytics(null);
    clearInterval(storyTimerRef.current);
    const activeStory = activeStoryGroup?.stories[activeStoryIndex];
    if (activeStory && activeStory.mediaType === "image") {
      storyTimerRef.current = setInterval(() => {
        setStoryTimer((prev) => {
          if (prev >= 100) {
            if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
              setActiveStoryIndex(activeStoryIndex + 1);
            } else {
              closeStoryViewer();
            }
            return 0;
          }
          return prev + 1;
        });
      }, 50);
    } else if (storyVideoRef.current) {
      storyVideoRef.current.play().catch(() => {});
    }
  };

  const formatRelativeTime = (dateStr) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now - past;
      if (diffMs < 0) return "Just now";
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return past.toLocaleDateString();
    } catch (e) {
      return "Just now";
    }
  };

  useEffect(() => {
    if (storyAudioRef.current) {
      storyAudioRef.current.muted = storyMuted;
    }
    try {
      if (storyYtRef.current) {
        storyYtRef.current.setVolume(storyMuted ? 0 : 80);
      }
    } catch (_) {}
  }, [storyMuted]);

  useEffect(() => {
    if (!activeStoryGroup) return;

    const activeStory = activeStoryGroup.stories[activeStoryIndex];

    // Mark story as viewed and update local state in real-time
    fetch(`${API_URL}/stories/view/${activeStory._id}`, {
      method: "PUT",
      headers: { "Authorization": token }
    })
    .then(res => { if (res.ok) return res.json(); })
    .then(data => {
      if (data && data.story) {
        setStories(prev => prev.map(group => {
          if (String(group.user._id) === String(data.story.user)) {
            return {
              ...group,
              stories: group.stories.map(s => s._id === data.story._id ? { ...s, viewers: data.story.viewers } : s)
            };
          }
          return group;
        }));
      }
    })
    .catch(err => console.error("Error updating viewed status:", err));

    // Play story background music (standard Audio urls)
    if (storyAudioRef.current) {
      storyAudioRef.current.pause();
      storyAudioRef.current = null;
    }

    if (activeStory.music && activeStory.music.url) {
      const audio = new Audio(activeStory.music.url);
      audio.currentTime = activeStory.music.startTime || 0;
      audio.loop = true;
      audio.muted = storyMuted;
      storyAudioRef.current = audio;
      audio.play().catch(err => console.log("Story audio play blocked", err));
    }

    // Play story background music (YouTube real songs)
    try {
      storyYtRef.current?.pauseVideo();
    } catch (_) {}

    if (activeStory.music && activeStory.music.youtubeId) {
      const ytid = activeStory.music.youtubeId;
      const start = activeStory.music.startTime || 0;
      
      const playYt = () => {
        const player = storyYtRef.current;
        if (player && typeof player.loadVideoById === "function") {
          player.loadVideoById({
            videoId: ytid,
            startSeconds: start
          });
          player.setVolume(storyMuted ? 0 : 80);
          player.playVideo();
        }
      };

      if (storyYtRef.current) {
        playYt();
      } else {
        setTimeout(playYt, 500);
      }
    }

    setStoryTimer(0);
    clearInterval(storyTimerRef.current);

    if (!isAnalyticsOpen && activeStory.mediaType === "image") {
      storyTimerRef.current = setInterval(() => {
        setStoryTimer((prev) => {
          if (prev >= 100) {
            // Go to next story
            if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
              setActiveStoryIndex(activeStoryIndex + 1);
            } else {
              closeStoryViewer();
            }
            return 0;
          }
          return prev + 1;
        });
      }, 50); // 5 seconds per story
    }

    return () => {
      clearInterval(storyTimerRef.current);
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
      }
      try {
        storyYtRef.current?.pauseVideo();
      } catch (_) {}
    };
  }, [activeStoryGroup, activeStoryIndex, isAnalyticsOpen]);

  useEffect(() => {
    if (!activeStoryGroup) return;
    if (showStoryDropdown) {
      clearInterval(storyTimerRef.current);
      if (storyVideoRef.current) {
        storyVideoRef.current.pause();
      }
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
      }
    } else {
      const activeStory = activeStoryGroup?.stories[activeStoryIndex];
      if (!activeStory) return;
      if (activeStory.mediaType === "image" && !isAnalyticsOpen) {
        clearInterval(storyTimerRef.current);
        storyTimerRef.current = setInterval(() => {
          setStoryTimer((prev) => {
            if (prev >= 100) {
              if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
                setActiveStoryIndex(activeStoryIndex + 1);
              } else {
                closeStoryViewer();
              }
              return 0;
            }
            return prev + 1;
          });
        }, 50);
      } else if (storyVideoRef.current && !isAnalyticsOpen) {
        storyVideoRef.current.play().catch(() => {});
      }
      if (storyAudioRef.current) {
        storyAudioRef.current.play().catch(() => {});
      }
    }
  }, [showStoryDropdown]);

  const generateTextStoryFile = () => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");

      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      if (storyBgGradient === "sunset") {
        grad.addColorStop(0, "#ec4899");
        grad.addColorStop(1, "#fb923c");
      } else if (storyBgGradient === "emerald") {
        grad.addColorStop(0, "#34d399");
        grad.addColorStop(1, "#0d9488");
      } else if (storyBgGradient === "neon") {
        grad.addColorStop(0, "#d946ef");
        grad.addColorStop(1, "#2563eb");
      } else if (storyBgGradient === "ocean") {
        grad.addColorStop(0, "#22d3ee");
        grad.addColorStop(1, "#3b82f6");
      } else {
        grad.addColorStop(0, "#0f172a");
        grad.addColorStop(1, "#1e293b");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      ctx.fillStyle = storyTextColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      let systemFont = "sans-serif";
      if (storyTextFont === "serif") systemFont = "Georgia, serif";
      else if (storyTextFont === "monospace") systemFont = "Courier New, monospace";
      else if (storyTextFont === "cursive") systemFont = "Brush Script MT, cursive";
      ctx.font = `bold 64px ${systemFont}`;

      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;

      const words = caption.split(" ");
      let line = "";
      const lines = [];
      const maxWidth = 900;
      const lineHeight = 85;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const yStart = 960 - ((lines.length - 1) * lineHeight) / 2;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), 540, yStart + i * lineHeight);
      }

      canvas.toBlob((blob) => {
        const file = new File([blob], "text-story.jpg", { type: "image/jpeg" });
        resolve(file);
      }, "image/jpeg", 0.95);
    });
  };

  const handleShareStory = async (isCloseFriends) => {
    setCreateLoading(true);
    try {
      // Repost mode
      if (storyRepostUrl) {
        const body = { mediaUrl: storyRepostUrl, mediaType: storyRepostType, isCloseFriendsOnly: isCloseFriends };
        if (selectedMusic) body.music = selectedMusic;
        if (storyTextOverlay.trim()) body.textOverlay = { text: storyTextOverlay.trim(), x: storyTextX, y: storyTextY, color: storyTextColor, fontFamily: storyTextFont };
        const r = await fetch(`${API_URL}/stories/repost`, { 
          method: "POST", 
          headers: { 
            "Authorization": token, 
            "Content-Type": "application/json" 
          }, 
          body: JSON.stringify(body) 
        });
        if (r.ok) { 
          setSelectedMusic(null); 
          clearSelectedFile(); 
          setCaption(""); 
          clearStoryMentions(); 
          setStoryRepostUrl(""); 
          setStoryRepostType("image"); 
          setStoryLocation(""); 
          setStoryEditorPanel(null); 
          setShowCreateStoryModal(false); 
          loadFeedData(); 
        }
        return;
      }

      // Normal upload or text mode
      let fileToUpload = selectedFile;
      let finalMediaType = mediaType;

      if (storyTab === "text") {
        fileToUpload = await generateTextStoryFile();
        finalMediaType = "image";
      }

      if (!fileToUpload) {
        alert("Please select a file or add text to share a story.");
        return;
      }

      const fd = new FormData();
      fd.append("file", fileToUpload);
      fd.append("mediaType", finalMediaType);
      fd.append("isCloseFriendsOnly", isCloseFriends);
      if (selectedMusic) fd.append("music", JSON.stringify(selectedMusic));
      if (finalMediaType === "video") fd.append("videoTrim", JSON.stringify({ startTime: trimStart, endTime: trimEnd }));
      if (storyTextOverlay.trim()) fd.append("textOverlay", JSON.stringify({ text: storyTextOverlay.trim(), x: storyTextX, y: storyTextY, color: storyTextColor, fontFamily: storyTextFont }));
      if (storyLocation.trim()) fd.append("location", storyLocation.trim());
      if (storyMentions.length > 0) fd.append("mentions", JSON.stringify(storyMentions.map(u => u._id)));
      fd.append("mediaAdjust", JSON.stringify({ scale: storyMediaScale, x: storyMediaX, y: storyMediaY }));

      const r = await fetch(`${API_URL}/stories/create`, { 
        method: "POST", 
        headers: { "Authorization": token }, 
        body: fd 
      });
      if (r.ok) { 
        setSelectedMusic(null); 
        clearSelectedFile(); 
        setCaption(""); 
        clearStoryMentions(); 
        setStoryLocation(""); 
        setStoryEditorPanel(null); 
        setStoryMediaScale(1); 
        setStoryMediaX(0); 
        setStoryMediaY(0); 
        setShowCreateStoryModal(false); 
        loadFeedData(); 
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setCreateLoading(false); 
    }
  };

  // Create Post Submit
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!caption.trim()) {
      alert("Please enter a caption.");
      return;
    }

    if (createPostTab === "code" && !codeContent.trim()) {
      alert("Please enter a code snippet.");
      return;
    }

    if (createPostTab === "media" && mediaType === "video") {
      const duration = trimEnd - trimStart;
      if (duration < 1.0) {
        alert("Selected video segment must be at least 1 second.");
        return;
      }
      if (duration > MAX_TRIM_DURATION) {
        alert(`Videos can be trimmed to a maximum of 3 minutes (180s). Currently selected: ${formatDuration(duration)}`);
        return;
      }
    }

    setCreateLoading(true);

    try {
      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("location", location);
      if (selectedMusic) {
        formData.append("music", JSON.stringify(selectedMusic));
      }
      if (selectedCollab) {
        formData.append("collaboratorId", selectedCollab._id);
      }

      // ⏳ Time-Capsule: append unlock date if set
      if (unlockDate) {
        formData.append("unlockDate", new Date(unlockDate).toISOString());
      }

      // 🔒 Vault Post
      if (isVaultPost) {
        formData.append("postType", "vault");
        if (vaultFile) formData.append("file", vaultFile);
        formData.append("mediaType", "image");
      } else if (createPostTab === "code") {
        formData.append("postType", "code");
        formData.append("codeSnippet", JSON.stringify({
          language: codeLanguage,
          code: codeContent
        }));
      } else {
        formData.append("postType", mediaType === "video" ? "video" : (mediaType === "image" ? "image" : "text"));
        if (selectedFile) {
          formData.append("file", selectedFile);
        }
        formData.append("mediaType", mediaType);
        if (mediaType === "video") {
          formData.append("videoTrim", JSON.stringify({ startTime: trimStart, endTime: trimEnd }));
        }
      }

      const res = await fetch(`${API_URL}/posts/create`, {
        method: "POST",
        headers: {
          "Authorization": token
        },
        body: formData
      });
      if (res.ok) {
        setCaption("");
        setLocation("");
        setSelectedMusic(null);
        clearSelectedFile();
        setCodeContent("");
        setCreatePostTab("media");
        setSelectedCollab(null);
        setCollabSearch("");
        setCollabResults([]);
        setUnlockDate("");
        setShowTimeCapsuleOptions(false);
        setIsVaultPost(false);
        setVaultFile(null);
        setVaultFilePreview("");
        setShowCreatePostModal(false);
        loadFeedData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  // 🔒 Vault Add: contribute a photo to unlock a vault
  const handleVaultAdd = async (postId) => {
    if (!vaultAddFile) return;
    setVaultAddLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", vaultAddFile);
      const res = await fetch(`${API_URL}/posts/${postId}/vault-add`, {
        method: "POST",
        headers: { "Authorization": token },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p =>
          p._id === postId ? { ...p, vaultPhotos: data.vaultPhotos } : p
        ));
        socket?.emit("post-update", { type: "vault-add", postId });
      } else {
        const err = await res.json();
        alert(err.message || "Failed to add photo to vault.");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding to vault.");
    } finally {
      setVaultAddLoading(false);
      setVaultAddingPostId(null);
      setVaultAddFile(null);
    }
  };

  const parseTagsAndMentions = (text) => {
    if (!text) return "";
    return text.split(/(\s+)/).map((part, index) => {
      if (part.startsWith("#")) {
        return <span key={index} className="text-violet-500 font-semibold cursor-pointer hover:underline" onClick={() => navigateTo("explore", part)}>{part}</span>;
      }
      if (part.startsWith("@")) {
        const username = part.substring(1).replace(/[^a-zA-Z0-9_]/g, "");
        const handleMention = async () => {
          try {
            const res = await fetch(`${API_URL}/users/by-username/${username}`, { headers: { "Authorization": token } });
            if (res.ok) {
              const u = await res.json();
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

  // Helper to render Markdown formatting (bold, italic, inline code, lists) and hashtags/mentions
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
          <div key={lineIdx} className="flex items-start gap-2 pl-3 my-0.5">
            <span className="text-violet-500 mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0"></span>
            <span className="flex-1 text-[14.5px] leading-relaxed">{parsedElements}</span>
          </div>
        );
      }
      
      return (
        <div key={lineIdx} className="min-h-[1.2rem] text-[14.5px] leading-relaxed">
          {parsedElements}
        </div>
      );
    });
  };

  const getAvatarUrl = (user) => {
    if (!user) return `https://api.dicebear.com/7.x/initials/svg?seed=DeletedUser&backgroundType=gradientLinear`;
    return user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username || "User")}&backgroundType=gradientLinear`;
  };

  return (
    <div className="flex w-full min-h-screen">
      {/* Hidden YouTube audio player for stories */}
      <div id="feed-story-yt-player" className="hidden" />
      {/* Central feed column */}
      <div className="flex-1 max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-2 px-1">
          <span className="text-2xl font-extrabold tracking-tight bg-vibe-gradient bg-clip-text text-transparent">VibeShare</span>
          <div className="relative">
            <button onClick={() => setShowMobileCreateMenu(!showMobileCreateMenu)} className="text-slate-700 dark:text-slate-200 p-1 flex items-center justify-center">
              <PlusCircle size={24} />
            </button>
            <AnimatePresence>
              {showMobileCreateMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-36 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl shadow-xl z-50 overflow-hidden text-xs text-left"
                >
                  <button 
                    onClick={() => {
                      setShowCreatePostModal(true);
                      setShowMobileCreateMenu(false);
                    }}
                    className="w-full px-4 py-2.5 hover:bg-violet-500/10 font-bold text-slate-700 dark:text-slate-200 text-left transition-colors"
                  >
                    Create Post
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateStoryModal(true);
                      setShowMobileCreateMenu(false);
                    }}
                    className="w-full px-4 py-2.5 hover:bg-violet-500/10 font-bold text-slate-700 dark:text-slate-200 text-left transition-colors border-t border-slate-100 dark:border-zinc-800/50"
                  >
                    Upload Story
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stories list */}
        <div className="flex items-center gap-4 overflow-x-auto pb-3 scrollbar-hide">
          {(() => {
            const myStoryGroup = stories.find(group => String(group.user._id) === String(currentUser?._id));
            const otherStories = stories.filter(group => String(group.user._id) !== String(currentUser?._id));

            // Check if user has active stories that haven't been viewed yet
            const myStoryHasUnviewed = myStoryGroup ? myStoryGroup.stories.some(st => 
              !st.viewers?.some(v => String(v.user?._id || v.user) === String(currentUser?._id))
            ) : false;

            const myStoryIsCloseFriends = myStoryGroup ? myStoryGroup.stories.some(st => st.isCloseFriendsOnly) : false;

            return (
              <>
                {/* Your Story Bubble */}
                <div className="flex flex-col items-center flex-shrink-0">
                  {myStoryGroup ? (
                    // Active Own Story - Click to view, click plus to add
                    <div 
                      className={`h-16 w-16 rounded-full mb-1.5 relative cursor-pointer flex items-center justify-center ${
                        myStoryHasUnviewed 
                          ? (myStoryIsCloseFriends ? "bg-emerald-500 p-0.5 animate-pulse" : "bg-vibe-gradient p-0.5 animate-pulse") 
                          : "border-2 border-slate-300 dark:border-zinc-800 p-[2px]"
                      }`}
                      onClick={() => openStoryViewer(myStoryGroup)}
                    >
                      <div className="h-full w-full rounded-full bg-[var(--bg-main)] p-0.5">
                        <img src={getAvatarUrl(currentUser)} className="h-full w-full rounded-full object-cover" />
                      </div>
                      <div 
                        className="absolute bottom-0 right-0 h-5 w-5 bg-violet-500 text-white rounded-full flex items-center justify-center text-[13px] font-bold border-2 border-[var(--bg-main)] cursor-pointer hover:bg-violet-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCreateStoryModal(true);
                        }}
                      >
                        +
                      </div>
                    </div>
                  ) : (
                    // No Active Story - Click to create
                    <div 
                      className="h-16 w-16 rounded-full border border-dashed border-slate-400 flex items-center justify-center p-0.5 relative mb-1.5 cursor-pointer hover:border-violet-500 transition-colors"
                      onClick={() => setShowCreateStoryModal(true)}
                    >
                      <img src={getAvatarUrl(currentUser)} className="h-full w-full rounded-full object-cover" />
                      <div className="absolute bottom-0 right-0 h-5 w-5 bg-violet-500 text-white rounded-full flex items-center justify-center text-[13px] font-bold border-2 border-[var(--bg-main)]">+</div>
                    </div>
                  )}
                  <span className="text-[11.5px] font-medium text-slate-500">Your Story</span>
                </div>

                {/* Render Others' Stories Feed */}
                {otherStories.map(group => {
                  const hasUnviewed = group.stories.some(st => 
                    !st.viewers?.some(v => String(v.user?._id || v.user) === String(currentUser?._id))
                  );
                  const isCloseFriendsGroup = group.stories.some(st => st.isCloseFriendsOnly);

                  return (
                    <div 
                      key={group.user._id} 
                      className="flex flex-col items-center flex-shrink-0 cursor-pointer" 
                      onClick={() => openStoryViewer(group)}
                    >
                      <div className={`h-16 w-16 rounded-full mb-1.5 relative flex items-center justify-center ${
                        hasUnviewed 
                          ? (isCloseFriendsGroup ? "bg-emerald-500 p-0.5" : "bg-vibe-gradient p-0.5") 
                          : "border-2 border-slate-300 dark:border-zinc-800 p-[2px]"
                      }`}>
                        <div className="h-full w-full rounded-full bg-[var(--bg-main)] p-0.5">
                          <img src={getAvatarUrl(group.user)} className="h-full w-full rounded-full object-cover" />
                        </div>
                      </div>
                      <span className="text-[11.5px] font-medium text-slate-500 truncate max-w-[70px]">{group.user.username}</span>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>

        {/* Create Post CTA box */}
        <div className="hidden md:flex items-center gap-4 p-5 glass-panel rounded-3xl cursor-pointer hover:bg-white/50 dark:hover:bg-black/20 transition-all shadow-sm" onClick={() => setShowCreatePostModal(true)}>
          <img src={getAvatarUrl(currentUser)} className="h-10 w-10 rounded-full object-cover" />
          <span className="text-slate-400 font-medium text-sm">Spread good vibes! Create a new post...</span>
        </div>

        {/* Feed Posts */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-violet-500 border-t-transparent"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center p-12 glass-panel rounded-3xl">
            <Compass className="mx-auto mb-4 text-slate-400" size={40} />
            <h3 className="text-lg font-bold">Feed is empty</h3>
            <p className="text-slate-500 text-sm mt-1">Start following users or explore trends!</p>
            <button onClick={() => navigateTo("explore")} className="mt-4 px-5 py-2.5 bg-violet-500 text-white rounded-xl font-semibold text-sm">Explore Trends</button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map(post => {
              const isLiked = post.likes.includes(currentUser._id);
              const isSaved = currentUser.savedPosts?.includes(post._id);

              return (
                <article key={post._id} className="glass-panel rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  {/* Card Header */}
                  <div className="flex justify-between items-center p-4 border-b border-slate-200/40 dark:border-slate-800/40">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo("profile", post.user._id)}>
                      <div className={`rounded-full flex items-center justify-center flex-shrink-0 ${
                        post.user?.avatarFrameTheme === "neon" ? "bg-gradient-to-tr from-green-400 via-cyan-400 to-blue-500 animate-pulse p-[2px]" :
                        post.user?.avatarFrameTheme === "gold" ? "bg-gradient-to-tr from-amber-200 via-yellow-400 to-amber-600 animate-pulse p-[2px]" :
                        post.user?.avatarFrameTheme === "cyberpunk" ? "bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 animate-pulse p-[2px]" :
                        post.user?.avatarFrameTheme === "sunset" ? "bg-gradient-to-tr from-orange-500 via-rose-500 to-violet-600 animate-pulse p-[2px]" :
                        "border border-violet-500/10 p-0"
                      }`}>
                        <img src={getAvatarUrl(post.user)} className="h-9 w-9 rounded-full object-cover bg-white dark:bg-[#0b0c10]" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm hover:underline flex items-center gap-1">
                            {post.user.username}
                            {post.user.isVerified && <Award size={14} className="text-violet-500 fill-violet-500/30 inline-block align-middle" title="Verified Creator" />}
                            {post.collaborators && post.collaborators.length > 0 && !post.collabPending && (
                              <span className="text-slate-500 font-medium"> & {post.collaborators.map(c => c.username).join(" & ")}</span>
                            )}
                          </span>
                          {post.collaborators && post.collaborators.length > 0 && !post.collabPending && (
                            <span className="text-[9px] bg-violet-500/15 text-violet-500 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">Collab</span>
                          )}
                        </div>
                        {post.location && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><MapPin size={10} /> {post.location}</span>
                        )}
                      </div>
                    </div>
                    {/* 3-dot Options Dropdown Menu */}
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownPostId(activeDropdownPostId === post._id ? null : post._id);
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-500 dark:text-slate-400 rounded-xl transition-all duration-300 active:scale-95"
                        title="Options"
                      >
                        <MoreVertical size={18} />
                      </button>

                      <AnimatePresence>
                        {activeDropdownPostId === post._id && (
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
                                setActiveDropdownPostId(null);
                              }}
                              className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                            >
                              Copy Link
                            </button>
                            <button 
                              onClick={() => {
                                handleSaveToggle(post);
                                setActiveDropdownPostId(null);
                              }}
                              className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                            >
                              {isSaved ? "Unsave Post" : "Save Post"}
                            </button>
                            {String(post.user._id) !== String(currentUser._id) && (
                              <button 
                                onClick={() => {
                                  handleFollowSuggestion(post.user._id);
                                  setActiveDropdownPostId(null);
                                }}
                                className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                              >
                                {currentUser.following?.some(f => String(f._id || f) === String(post.user?._id || post.user)) ? "Unfollow" : "Follow"}
                              </button>
                            )}
                            {String(post.user._id) === String(currentUser._id) && (
                              <button 
                                onClick={() => {
                                  triggerDeletePost(post);
                                  setActiveDropdownPostId(null);
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

                  {/* Card Body */}
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{renderText(post.caption)}</p>
                    
                    {/* ⏳ Time-Capsule Locked State */}
                    {post.unlockDate && new Date(post.unlockDate) > new Date() && (() => {
                      const diff = new Date(post.unlockDate) - new Date();
                      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      return (
                        <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 select-none">
                          <div className="text-4xl animate-pulse">⏳</div>
                          <p className="font-extrabold text-amber-600 dark:text-amber-400 text-base tracking-tight">Time Capsule — Locked!</p>
                          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 text-center">This post will reveal itself in</p>
                          <div className="flex items-center gap-3">
                            {days > 0 && <div className="flex flex-col items-center"><span className="text-2xl font-black text-amber-500">{days}</span><span className="text-[10px] text-amber-600/70 font-bold uppercase">days</span></div>}
                            <div className="flex flex-col items-center"><span className="text-2xl font-black text-amber-500">{hours}</span><span className="text-[10px] text-amber-600/70 font-bold uppercase">hrs</span></div>
                            <div className="flex flex-col items-center"><span className="text-2xl font-black text-amber-500">{mins}</span><span className="text-[10px] text-amber-600/70 font-bold uppercase">mins</span></div>
                          </div>
                          <p className="text-[10px] text-amber-500/60 font-semibold">Unlocks: {new Date(post.unlockDate).toLocaleString()}</p>
                        </div>
                      );
                    })()}

                    {/* 🔒 Vault Post UI */}
                    {post.postType === "vault" && (() => {
                      const alreadyContributed = post.vaultPhotos?.some(p => p.user === currentUser?._id || p.user?._id === currentUser?._id || p.user?.toString() === currentUser?._id);
                      const isOwner = post.user?._id === currentUser?._id || post.user === currentUser?._id;
                      const isUnlocked = alreadyContributed || isOwner;
                      return (
                        <div className="space-y-3">
                          {!isUnlocked ? (
                            /* Locked State */
                            <div className="flex flex-col items-center gap-3 py-8 px-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 select-none">
                              <div className="text-4xl">🔒</div>
                              <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base tracking-tight">Photo Vault</p>
                              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 text-center">
                                <span className="font-black text-emerald-500">{post.vaultPhotos?.length || 0} photo{(post.vaultPhotos?.length || 0) !== 1 ? "s" : ""}</span> inside.<br/>Upload 1 photo to unlock and see everything!
                              </p>
                              {vaultAddingPostId === post._id ? (
                                <div className="w-full space-y-2">
                                  {vaultAddFile ? (
                                    <div className="relative">
                                      <img src={URL.createObjectURL(vaultAddFile)} className="w-full max-h-[120px] object-contain rounded-xl" alt="preview" />
                                      <button onClick={() => setVaultAddFile(null)} className="absolute top-1 right-1 p-1 bg-rose-500 rounded-full text-white"><X size={12} /></button>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-emerald-500/40 rounded-xl cursor-pointer hover:bg-emerald-500/10 transition-all">
                                      <span className="text-xl">🖼️</span>
                                      <span className="text-xs font-bold text-emerald-500">Tap to choose photo</span>
                                      <input type="file" accept="image/*" className="hidden" onChange={e => setVaultAddFile(e.target.files[0])} />
                                    </label>
                                  )}
                                  <div className="flex gap-2">
                                    <button onClick={() => { setVaultAddingPostId(null); setVaultAddFile(null); }} className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-500">Cancel</button>
                                    <button
                                      onClick={() => handleVaultAdd(post._id)}
                                      disabled={!vaultAddFile || vaultAddLoading}
                                      className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                      {vaultAddLoading ? <span className="animate-spin h-3 w-3 rounded-full border-2 border-white border-t-transparent" /> : "🔓 Unlock Vault"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setVaultAddingPostId(post._id)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-lg hover:opacity-90 transition-all">
                                  🔓 Contribute to Unlock
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Unlocked State - Photo Grid */
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">🔓 Vault Unlocked • {post.vaultPhotos?.length} photo{post.vaultPhotos?.length !== 1 ? "s" : ""}</p>
                              <div className={`grid gap-1.5 ${post.vaultPhotos?.length === 1 ? "grid-cols-1" : post.vaultPhotos?.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                                {post.vaultPhotos?.map((vp, i) => (
                                  <div key={i} className="relative group rounded-xl overflow-hidden bg-black/10">
                                    <img src={vp.mediaUrl} className="w-full h-32 object-cover" alt={`Vault photo ${i + 1}`} />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <p className="text-[9px] text-white font-bold truncate">@{vp.username}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Code Snippet or Regular Media (only shown if NOT a vault post and NOT locked time capsule) */}
                    {post.postType !== "vault" && !(post.unlockDate && new Date(post.unlockDate) > new Date()) && (
                      post.postType === "code" && post.codeSnippet ? (
                      <div className="relative w-full border border-slate-200/40 dark:border-slate-800/40 rounded-2xl overflow-hidden bg-[#1e1e1e] font-mono text-xs shadow-md select-text">
                        {/* VS Code title bar / tab header look */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c] select-none">
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
                        <div className="max-h-[350px] overflow-auto text-left select-text">
                          <SyntaxHighlighter
                            language={post.codeSnippet.language || "javascript"}
                            style={vscDarkPlus}
                            showLineNumbers={true}
                            customStyle={{
                              margin: 0,
                              padding: "16px 8px 16px 0px",
                              background: "transparent",
                              fontFamily: '"Fira code", "Fira Mono", monospace',
                              fontSize: "12.5px",
                              lineHeight: "1.5",
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
                    ) : post.mediaUrl && (
                      <div 
                        className="relative w-full max-h-[480px] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200/40 dark:border-slate-800/40 select-none cursor-pointer"
                        onClick={(e) => handleDoubleTap(e, post)}
                      >
                        {post.mediaType === "image" ? (
                          <img src={post.mediaUrl} className="w-full h-full object-contain max-h-[480px]" alt="" />
                        ) : post.mediaType === "video" ? (
                          <video 
                            src={post.mediaUrl} 
                            className="w-full h-full object-contain max-h-[480px]" 
                            controls 
                            playsInline 
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
                        ) : null}

                        {/* Double tap heart overlay */}
                        <AnimatePresence>
                          {likeOverlayPostId === post._id && (
                            <motion.div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1.2, opacity: 0.9 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute z-10 text-white drop-shadow-2xl"
                            >
                              <Heart size={80} className="fill-rose-500 text-rose-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-4 pb-4 flex justify-between items-center border-t border-slate-200/10 dark:border-slate-800/10 pt-3">
                    <div className="flex items-center gap-5 flex-wrap">
                      <button 
                        onClick={() => handleLikeToggle(post)}
                        className={`flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-all ${isLiked ? "text-rose-500 dark:text-rose-400" : ""}`}
                      >
                        <Heart size={20} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                        <span className="text-[13.5px] font-bold">
                          {post.user?.hideLikes && post.user._id !== currentUser?._id ? "Likes" : post.likes.length}
                        </span>
                      </button>

                      <button 
                        onClick={() => openComments(post)}
                        className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-violet-500 transition-all"
                      >
                        <MessageCircle size={20} />
                        <span className="text-[13.5px] font-bold">{post.commentsCount || 0}</span>
                      </button>

                      <button 
                        onClick={() => handleSharePost(post)}
                        className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all"
                        title="Share Post"
                      >
                        <Share2 size={20} />
                        <span className="text-[13.5px] font-bold">{post.sharesCount || 0}</span>
                      </button>

                      {post.music && post.music.url && (
                        <button 
                          onClick={() => handlePostMusicToggle(post)}
                          className={`flex items-center gap-1.5 transition-all text-xs font-bold ${
                            playingPostId === post._id 
                              ? "text-violet-500 animate-pulse" 
                              : "text-slate-500 hover:text-violet-500"
                          }`}
                          title={`Song: ${post.music.title} - ${post.music.artist}`}
                        >
                          {playingPostId === post._id ? <Volume2 size={18} className="text-violet-500" /> : <VolumeX size={18} />}
                          <span className="text-[9.5px] max-w-[120px] truncate bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full">
                            {post.music.title}
                          </span>
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={() => handleSaveToggle(post)}
                      className={`text-slate-600 dark:text-slate-300 hover:text-violet-500 transition-all ${isSaved ? "text-violet-500" : ""}`}
                    >
                      <Bookmark size={20} className={isSaved ? "fill-violet-500" : ""} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Right widgets column (Desktop Sidebar) */}
      <div className="hidden lg:flex flex-col w-80 xl:w-96 border-l border-slate-200/80 dark:border-slate-800/80 bg-white/30 dark:bg-black/10 p-6 h-screen sticky top-0 gap-6">
        {/* User Card */}
        <div className="flex items-center justify-between p-4 glass-panel rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo("profile")}>
            <img src={getAvatarUrl(currentUser)} className="h-11 w-11 rounded-full object-cover border border-violet-500/20" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight">{currentUser.username}</span>
              <span className="text-xs text-slate-500 truncate max-w-[130px]">{currentUser.email}</span>
            </div>
          </div>
          <button onClick={() => navigateTo("settings")} className="text-xs font-bold text-violet-500 hover:underline">Settings</button>
        </div>

        {/* Suggested For You */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Suggested for you</span>
          <div className="flex flex-col gap-3">
            {suggestions.slice(0, 5).map(user => (
              <div key={user._id} className="flex justify-between items-center p-3 glass-panel rounded-2xl shadow-sm">
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigateTo("profile", user._id)}>
                  <img src={getAvatarUrl(user)} className="h-9 w-9 rounded-full object-cover" />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs leading-tight hover:underline">{user.username}</span>
                    <span className="text-[10px] text-slate-500 max-w-[100px] truncate">{user.bio || "Vibing"}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleFollowSuggestion(user._id)}
                  className="text-xs font-bold text-violet-500 hover:underline pr-1"
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- CREATE POST MODAL --- */}
      <AnimatePresence>
        {showCreatePostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md glass-panel p-6 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-lg font-bold">Create Post</h3>
                <button onClick={() => { setShowCreatePostModal(false); setCaption(""); clearSelectedFile(); setLocation(""); setSelectedMusic(null); }} className="text-slate-500 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4 overflow-y-auto pr-1.5 flex-grow">
                {/* Tab Selector */}
                <div className="flex bg-slate-100 dark:bg-zinc-800/60 p-1 rounded-2xl mb-2">
                  <button
                    type="button"
                    onClick={() => setCreatePostTab("media")}
                    className={`flex-grow py-2 text-xs font-bold rounded-xl transition-all ${
                      createPostTab === "media"
                        ? "bg-white dark:bg-zinc-800 text-slate-800 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-750 dark:hover:text-slate-350"
                    }`}
                  >
                    Media Post
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatePostTab("code")}
                    className={`flex-grow py-2 text-xs font-bold rounded-xl transition-all ${
                      createPostTab === "code"
                        ? "bg-white dark:bg-zinc-800 text-slate-800 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-750 dark:hover:text-slate-350"
                    }`}
                  >
                    Code Snippet
                  </button>
                </div>

                {/* Caption */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Caption / Text</label>
                  <textarea
                    required
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Tell a story... Use #tags or mention @users"
                    className="w-full p-4 rounded-xl border vibe-input-field outline-none text-sm min-h-[90px] font-medium"
                  />
                </div>

                {createPostTab === "media" ? (
                  /* File Upload Selector & Preview */
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Photo / Video</label>
                    
                    {!mediaPreview ? (
                      <div className="relative border-2 border-dashed border-[var(--border-color)] rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-violet-500/5 transition-all cursor-pointer group">
                        <input 
                          type="file" 
                          accept="image/*,video/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                        />
                        <PlusCircle size={28} className="text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Choose from gallery</span>
                        <span className="text-[10px] text-slate-400 mt-1">Supports images and videos</span>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-[var(--border-color)] bg-black/5 dark:bg-white/5 p-4 flex flex-col items-center">
                        {mediaType === "image" ? (
                          <img src={mediaPreview} className="max-h-[160px] object-contain rounded-xl" alt="Preview" />
                        ) : (
                          <video ref={previewVideoRef} src={mediaPreview} className="max-h-[160px] object-contain rounded-xl" muted playsInline autoPlay loop />
                        )}
                        <button 
                          type="button" 
                          onClick={clearSelectedFile}
                          className="absolute top-4 right-4 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-md"
                        >
                          <X size={14} />
                        </button>
                        <span className="text-[10px] text-slate-500 font-semibold mt-2 uppercase tracking-wide">
                          {mediaType} Selected
                        </span>
                      </div>
                    )}
                    {mediaType === "video" && videoDuration > 0 && (
                      <div className="space-y-3 p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-[var(--border-color)] text-left select-none">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                          <span>Cut Video Segment (1s - 3m)</span>
                          <span id="trimmer-duration-badge" className="bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full font-mono">
                            {formatDuration(trimStart)} - {formatDuration(trimEnd)}
                          </span>
                        </div>

                        {/* Custom Video Editor Timeline Track */}
                        <div 
                          onPointerDown={(e) => {
                            const track = e.currentTarget;
                            const rect = track.getBoundingClientRect();

                            const highlight = track.querySelector("#trimmer-highlight");
                            const startHandle = track.querySelector("#trimmer-handle-start");
                            const endHandle = track.querySelector("#trimmer-handle-end");
                            const durationBadge = track.parentNode.querySelector("#trimmer-duration-badge");
                            const labelStart = track.parentNode.querySelector("#trimmer-label-start");
                            const labelEnd = track.parentNode.querySelector("#trimmer-label-end");
                            const labelLength = track.parentNode.querySelector("#trimmer-label-length");

                            const getVal = (clientX) => {
                              const x = clientX - rect.left;
                              const pct = Math.max(0, Math.min(1, x / rect.width));
                              return pct * videoDuration;
                            };

                            const initialTime = getVal(e.clientX);
                            const distToStart = Math.abs(initialTime - trimStart);
                            const distToEnd = Math.abs(initialTime - trimEnd);
                            const activeHandle = distToStart < distToEnd ? "start" : "end";

                            let tempStart = trimStart;
                            let tempEnd = trimEnd;
                            let seekTimeout = null;

                            const handlePointerMove = (moveEvent) => {
                              const newTime = getVal(moveEvent.clientX);
                              if (activeHandle === "start") {
                                tempStart = Math.max(0, Math.min(tempEnd - 1.0, newTime));
                                if (tempEnd - tempStart > 180) {
                                  tempStart = tempEnd - 180;
                                }
                              } else {
                                tempEnd = Math.min(videoDuration, Math.max(tempStart + 1.0, newTime));
                                if (tempEnd - tempStart > 180) {
                                  tempEnd = tempStart + 180;
                                }
                              }

                              const startPct = (tempStart / videoDuration) * 100;
                              const endPct = (tempEnd / videoDuration) * 100;
                              const widthPct = endPct - startPct;

                              if (startHandle) startHandle.style.left = `calc(${startPct}% - 7px)`;
                              if (endHandle) endHandle.style.left = `calc(${endPct}% - 7px)`;
                              if (highlight) {
                                highlight.style.left = `${startPct}%`;
                                highlight.style.width = `${widthPct}%`;
                              }

                              const durationFormatted = formatDuration(tempEnd - tempStart);
                              if (durationBadge) durationBadge.innerText = `${formatDuration(tempStart)} - ${formatDuration(tempEnd)}`;
                              if (labelStart) labelStart.innerText = `Start: ${formatDuration(tempStart)}`;
                              if (labelEnd) labelEnd.innerText = `End: ${formatDuration(tempEnd)}`;
                              if (labelLength) labelLength.innerText = `Length: ${durationFormatted}`;

                              if (previewVideoRef.current) {
                                if (!seekTimeout) {
                                  seekTimeout = setTimeout(() => {
                                    if (previewVideoRef.current) {
                                      previewVideoRef.current.currentTime = activeHandle === "start" ? tempStart : tempEnd;
                                    }
                                    seekTimeout = null;
                                  }, 60);
                                }
                              }
                            };

                            const handlePointerUp = () => {
                              window.removeEventListener("pointermove", handlePointerMove);
                              window.removeEventListener("pointerup", handlePointerUp);
                              if (seekTimeout) clearTimeout(seekTimeout);

                              setTrimStart(tempStart);
                              setTrimEnd(tempEnd);
                              if (previewVideoRef.current) {
                                previewVideoRef.current.currentTime = tempStart;
                                previewVideoRef.current.play().catch(() => {});
                              }
                            };

                            window.addEventListener("pointermove", handlePointerMove);
                            window.addEventListener("pointerup", handlePointerUp);
                          }}
                          className="relative w-full h-12 bg-zinc-950/80 border border-slate-200/20 dark:border-zinc-800/80 rounded-2xl overflow-hidden cursor-ew-resize flex items-center shadow-inner"
                        >
                          <div className="absolute inset-0 flex justify-between px-2 opacity-15 pointer-events-none">
                            {Array.from({ length: 15 }).map((_, i) => (
                              <div key={i} className="w-1.5 h-full border-r border-dashed border-white"></div>
                            ))}
                          </div>

                          <div 
                            id="trimmer-highlight"
                            className="absolute h-full bg-violet-500/20 border-t-2 border-b-2 border-violet-500 pointer-events-none"
                            style={{
                              left: `${(trimStart / videoDuration) * 100}%`,
                              width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                            }}
                          ></div>

                          <div 
                            id="trimmer-handle-start"
                            className="absolute h-full w-3.5 bg-violet-600 hover:bg-violet-500 rounded-l-md flex items-center justify-center cursor-ew-resize shadow-md transition-colors"
                            style={{
                              left: `calc(${(trimStart / videoDuration) * 100}% - 7px)`
                            }}
                          >
                            <div className="w-0.5 h-4 bg-white/60 rounded"></div>
                          </div>

                          <div 
                            id="trimmer-handle-end"
                            className="absolute h-full w-3.5 bg-violet-600 hover:bg-violet-500 rounded-r-md flex items-center justify-center cursor-ew-resize shadow-md transition-colors"
                            style={{
                              left: `calc(${(trimEnd / videoDuration) * 100}% - 7px)`
                            }}
                          >
                            <div className="w-0.5 h-4 bg-white/60 rounded"></div>
                          </div>

                          <div 
                            className="absolute h-full w-0.5 bg-red-500 shadow-sm pointer-events-none z-10"
                            style={{
                              left: `${(previewTime / videoDuration) * 100}%`
                            }}
                          ></div>
                        </div>

                        <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400 font-mono">
                          <span id="trimmer-label-start">Start: {formatDuration(trimStart)}</span>
                          <span id="trimmer-label-length" className="text-violet-400 font-bold">Length: {formatDuration(trimEnd - trimStart)}</span>
                          <span id="trimmer-label-end">End: {formatDuration(trimEnd)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Code Snippet Editor */
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Language</label>
                      <select
                        value={codeLanguage}
                        onChange={(e) => setCodeLanguage(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-slate-800 dark:text-slate-200 outline-none text-sm font-semibold"
                      >
                        <option value="javascript" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">JavaScript</option>
                        <option value="typescript" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">TypeScript</option>
                        <option value="python" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Python</option>
                        <option value="java" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Java</option>
                        <option value="cpp" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">C++</option>
                        <option value="c" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">C</option>
                        <option value="markup" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">HTML / XML</option>
                        <option value="css" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">CSS</option>
                        <option value="sql" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">SQL</option>
                        <option value="go" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Go</option>
                        <option value="rust" className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100">Rust</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Code Snippet</label>
                      <div className="relative border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[#1e1e1e] font-mono text-sm shadow-inner min-h-[180px] max-h-[300px] overflow-y-auto select-text">
                        {/* VS Code title bar look */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c] select-none">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
                            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
                            <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
                          </div>
                          <span className="text-[11px] text-[#858585] font-bold uppercase tracking-wider">{codeLanguage}</span>
                        </div>
                        
                        <div className="p-4 relative min-h-[130px]">
                          <EditorComponent
                            value={codeContent}
                            onValueChange={(code) => setCodeContent(code)}
                            highlight={(code) => {
                              if (!code) return "";
                              try {
                                const activePrism = window.Prism || prism;
                                if (activePrism && activePrism.highlight && activePrism.languages) {
                                  const langGrammar = activePrism.languages[codeLanguage] || activePrism.languages.javascript;
                                  return activePrism.highlight(code, langGrammar, codeLanguage);
                                }
                              } catch (err) {
                                console.error("Prism highlighting failed:", err);
                              }
                              return code;
                            }}
                            padding={10}
                            style={{
                              fontFamily: '"Fira code", "Fira Mono", monospace',
                              fontSize: 13,
                              outline: 0,
                              minHeight: "130px",
                              color: "#d4d4d4",
                              backgroundColor: "transparent",
                            }}
                            className="w-full h-full text-slate-200 outline-none focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Background Music Option */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 flex justify-between items-center">
                    <span>Background Music (Optional)</span>
                    {selectedMusic && (
                      <button 
                        type="button" 
                        onClick={() => setSelectedMusic(null)}
                        className="text-[10px] text-rose-500 hover:underline font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </label>
                  {!selectedMusic ? (
                    <button
                      type="button"
                      onClick={() => setShowMusicLibrary(true)}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[var(--border-color)] hover:border-violet-500 hover:bg-violet-500/5 transition-all text-xs font-bold text-slate-600 dark:text-slate-300"
                    >
                      <Music size={16} /> Choose background music
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-violet-500/30 bg-violet-500/5 text-violet-500 text-xs font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        <Music size={14} className="animate-bounce flex-shrink-0" />
                        <span className="truncate">{selectedMusic.title} - {selectedMusic.artist} ({selectedMusic.startTime}s)</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowMusicLibrary(true)}
                        className="text-[10px] hover:underline flex-shrink-0 ml-2"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* Location Tag */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Location Tag (Optional)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Paris, France"
                    className="w-full px-3 py-2.5 rounded-xl border vibe-input-field outline-none text-sm"
                  />
                </div>

                {/* Invite Collaborator (Premium) */}
                <div className="space-y-1 relative select-none">
                  <label className="text-xs font-bold text-slate-500">Invite Co-author / Collaborator (Optional)</label>
                  {selectedCollab ? (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-violet-500/25 bg-violet-500/5 text-violet-500">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={getAvatarUrl(selectedCollab)} className="h-6 w-6 rounded-full object-cover border border-violet-500/20" />
                        <span className="text-xs font-bold truncate">@{selectedCollab.username}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSelectedCollab(null)}
                        className="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input 
                        type="text" 
                        value={collabSearch}
                        onChange={(e) => setCollabSearch(e.target.value)}
                        placeholder="Search username to invite..."
                        className="w-full px-3 py-2.5 rounded-xl border vibe-input-field outline-none text-sm"
                      />
                      {collabResults.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto glass-panel border border-[var(--border-color)] bg-[var(--bg-main)] rounded-xl z-50 shadow-xl text-xs">
                          {collabResults.map(user => (
                            <div 
                              key={user._id}
                              onClick={() => {
                                setSelectedCollab(user);
                                setCollabSearch("");
                                setCollabResults([]);
                              }}
                              className="flex items-center gap-2.5 p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors"
                            >
                              <img src={getAvatarUrl(user)} className="h-6.5 w-6.5 rounded-full object-cover" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{user.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ⏳ Time-Capsule Option */}
                <div className="space-y-2 p-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      ⏳ Time-Capsule (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowTimeCapsuleOptions(p => !p); setUnlockDate(""); }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${showTimeCapsuleOptions ? "bg-amber-500 text-white" : "bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30"}`}
                    >
                      {showTimeCapsuleOptions ? "ON" : "OFF"}
                    </button>
                  </div>
                  {showTimeCapsuleOptions && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">Post will be locked until this date. Viewers see a countdown.</p>
                      <input
                        type="datetime-local"
                        value={unlockDate}
                        min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                        onChange={e => setUnlockDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 outline-none text-sm font-semibold"
                      />
                    </div>
                  )}
                </div>

                {/* 🔒 Vault Post Option */}
                <div className="space-y-2 p-3 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      🔒 Photo Vault (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIsVaultPost(p => !p); setVaultFile(null); setVaultFilePreview(""); }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${isVaultPost ? "bg-emerald-500 text-white" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30"}`}
                    >
                      {isVaultPost ? "ON" : "OFF"}
                    </button>
                  </div>
                  {isVaultPost && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Others must upload a photo to unlock and see the vault contents.</p>
                      <div className="relative border border-dashed border-emerald-500/40 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-emerald-500/10 transition-all">
                        {vaultFilePreview ? (
                          <div className="relative w-full">
                            <img src={vaultFilePreview} className="max-h-[120px] w-full object-contain rounded-lg" alt="Vault preview" />
                            <button type="button" onClick={() => { setVaultFile(null); setVaultFilePreview(""); }} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl">🖼️</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Upload your photo to start the vault</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={e => {
                            const f = e.target.files[0];
                            if (!f) return;
                            setVaultFile(f);
                            const reader = new FileReader();
                            reader.onload = ev => setVaultFilePreview(ev.target.result);
                            reader.readAsDataURL(f);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createLoading || (isVaultPost && !vaultFile)}
                    className="w-full py-3 rounded-xl bg-vibe-gradient text-white font-semibold text-sm shadow-md disabled:opacity-60"
                  >
                    {createLoading ? "Creating Post..." : isVaultPost ? "🔒 Create Vault Post" : (unlockDate ? "⏳ Create Time Capsule" : "Create Post")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CREATE STORY MODAL --- */}
      <AnimatePresence>
        {showCreateStoryModal && (
          <>
            {/* ======================================================
                FULL-SCREEN INSTAGRAM-STYLE EDITOR
                Shows when a photo/video is selected (gallery tab)
                ====================================================== */}
            {storyTab === "gallery" && (mediaPreview || storyRepostUrl) && (
              <motion.div
                key="story-editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-[#07070a] select-none overflow-hidden"
              >
                {/* Full-viewport blurred background for premium desktop experience */}
                {(mediaType === "image" || storyRepostType === "image") ? (
                  <img
                    src={mediaPreview || storyRepostUrl}
                    className="absolute inset-0 w-full h-full object-cover filter blur-3xl opacity-20 scale-105 pointer-events-none select-none"
                    alt=""
                  />
                ) : (
                  (mediaPreview || storyRepostUrl) && (
                    <video
                      src={mediaPreview || storyRepostUrl}
                      className="absolute inset-0 w-full h-full object-cover filter blur-3xl opacity-20 scale-105 pointer-events-none select-none"
                      muted playsInline autoPlay loop
                    />
                  )
                )}

                {/* Centered Phone Preview Frame */}
                <div className="relative w-full max-w-[390px] h-[92vh] max-h-[800px] rounded-[36px] overflow-hidden bg-black border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between z-10">
                  {/* ---- Top Bar ---- */}
                  <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-6 pb-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                    <button
                      className="pointer-events-auto p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all"
                      onClick={() => { clearSelectedFile(); setStoryRepostUrl(""); setStoryRepostType("image"); setStoryEditorPanel(null); }}
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <span className="text-white font-extrabold text-base tracking-wide pointer-events-none">
                      {storyRepostUrl ? "📸 Add to Your Story" : "Your Story"}
                    </span>
                    {selectedMusic ? (
                      <div className="pointer-events-auto flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                        <Music size={11} className="text-violet-400 animate-bounce" />
                        <span className="text-[10px] text-violet-300 font-bold max-w-[80px] truncate">{selectedMusic.title}</span>
                        <button onClick={() => setSelectedMusic(null)} className="text-rose-400 ml-0.5"><X size={10} /></button>
                      </div>
                    ) : (
                      <div className="w-10 pointer-events-none" />
                    )}
                  </div>

                  {/* ---- Full-screen Media ---- */}
                  <div 
                    className="absolute inset-0 z-0 bg-[#050508] cursor-grab active:cursor-grabbing overflow-hidden"
                    onPointerDown={(e) => {
                      if (e.target.closest('button') || e.target.closest('.cursor-move')) return;
                      e.stopPropagation();
                      const startX = e.clientX - storyMediaX;
                      const startY = e.clientY - storyMediaY;
                      const move = (ev) => {
                        setStoryMediaX(ev.clientX - startX);
                        setStoryMediaY(ev.clientY - startY);
                      };
                      const up = () => {
                        window.removeEventListener("pointermove", move);
                        window.removeEventListener("pointerup", up);
                      };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }}
                  >
                    {/* Main centered media filling the phone-ratio frame with transforms */}
                    {(mediaType === "image" || storyRepostType === "image") && (mediaPreview || storyRepostUrl) ? (
                      <img
                        src={mediaPreview || storyRepostUrl}
                        className="w-full h-full object-cover z-10 select-none pointer-events-none"
                        style={{ transform: `scale(${storyMediaScale}) translate(${storyMediaX}px, ${storyMediaY}px)`, transition: "transform 0.05s ease-out" }}
                        alt="Story"
                      />
                    ) : (
                      <video
                        ref={previewVideoRef}
                        src={mediaPreview || storyRepostUrl}
                        className="w-full h-full object-cover z-10 select-none"
                        style={{ transform: `scale(${storyMediaScale}) translate(${storyMediaX}px, ${storyMediaY}px)`, transition: "transform 0.05s ease-out" }}
                        muted playsInline autoPlay loop
                      />
                    )}
                    {/* Subtle vignette */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none z-15" />
                  </div>

                {/* ---- Draggable Text Overlay ---- */}
                {storyTextOverlay.trim() && (
                  <div
                    className="absolute z-30 px-4 py-2 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 text-center font-extrabold text-lg cursor-move select-none touch-none shadow-2xl break-words max-w-[80%]"
                    style={{
                      left: `${storyTextX}%`,
                      top: `${storyTextY}%`,
                      color: storyTextColor,
                      fontFamily: storyTextFont,
                      transform: "translate(-50%, -50%)"
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const parent = e.currentTarget.parentElement;
                      const rect = parent.getBoundingClientRect();
                      const move = (ev) => {
                        setStoryTextX(Math.max(5, Math.min(95, ((ev.clientX - rect.left) / rect.width) * 100)));
                        setStoryTextY(Math.max(5, Math.min(95, ((ev.clientY - rect.top) / rect.height) * 100)));
                      };
                      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }}
                  >
                    {storyTextOverlay}
                  </div>
                )}

                {/* ---- Location sticker on media ---- */}
                {storyLocation.trim() && (
                  <div className="absolute bottom-32 left-1/2 z-30 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-xl cursor-move select-none">
                    <MapPin size={12} className="text-rose-500" /> {storyLocation}
                  </div>
                )}

                {/* ---- Mention pills on media ---- */}
                {storyMentions.length > 0 && (
                  <div className="absolute bottom-24 left-3 z-30 flex flex-col gap-1.5">
                    {storyMentions.map(u => (
                      <div key={u._id} className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
                        <img src={u.profilePic || `https://ui-avatars.com/api/?name=${u.username}&background=7c3aed&color=fff&size=32`} className="h-4 w-4 rounded-full object-cover" alt="" />
                        <span className="text-white text-[11px] font-bold">@{u.username}</span>
                        <button onClick={() => setStoryMentions(prev => prev.filter(m => m._id !== u._id))} className="text-rose-400"><X size={9} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ---- RIGHT Toolbar ---- */}
                <div className="absolute right-3 top-[20%] z-20 flex flex-col gap-3">
                  {[
                    { id: "text",     icon: <Type size={20} />,    label: "Text" },
                    { id: "music",    icon: <Music size={20} />,   label: "Music", active: !!selectedMusic },
                    { id: "location", icon: <MapPin size={20} />,  label: "Location", active: !!storyLocation.trim() },
                    { id: "emoji",    icon: <Smile size={20} />,   label: "Emoji" },
                    { id: "mention",  icon: <AtSign size={20} />,  label: "Mention", active: storyMentions.length > 0 },
                    { id: "adjust",   icon: <Move size={20} />,    label: "Adjust", active: storyMediaScale !== 1 || storyMediaX !== 0 || storyMediaY !== 0 },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setStoryEditorPanel(prev => prev === item.id ? null : item.id)}
                      className={`relative flex flex-col items-center gap-0.5 p-0 group`}
                      title={item.label}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                        storyEditorPanel === item.id
                          ? "bg-white text-black scale-110"
                          : "bg-black/50 backdrop-blur-md text-white border border-white/20 hover:bg-white/20"
                      } ${item.active && storyEditorPanel !== item.id ? "ring-2 ring-violet-400" : ""}`}>
                        {item.icon}
                      </div>
                      <span className="text-[9px] text-white/70 font-bold">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* ---- Bottom Panel (slides up when toolbar icon tapped) ---- */}
                <AnimatePresence>
                  {storyEditorPanel && (
                    <motion.div
                      key={storyEditorPanel}
                      initial={{ y: 120, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 120, opacity: 0 }}
                      transition={{ type: "spring", damping: 28, stiffness: 300 }}
                      className="absolute bottom-20 left-0 right-0 z-30 mx-3 rounded-3xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
                    >
                      {/* Text Panel */}
                      {storyEditorPanel === "text" && (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-extrabold text-sm">✏️ Text Overlay</span>
                            <button onClick={() => setStoryEditorPanel(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                          </div>
                          <input
                            type="text"
                            value={storyTextOverlay}
                            onChange={e => setStoryTextOverlay(e.target.value)}
                            placeholder="Type text + emoji... 😍🔥✨"
                            className="w-full px-4 py-3 rounded-2xl bg-zinc-800 text-white text-sm font-bold outline-none border border-white/10 placeholder-slate-500"
                            autoFocus
                          />
                          {storyTextOverlay.trim() && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Color</label>
                                <div className="flex gap-2 flex-wrap">
                                  {["#ffffff","#fcd34d","#f43f5e","#22c55e","#3b82f6","#a855f7","#000000"].map(c => (
                                    <button
                                      key={c}
                                      onClick={() => setStoryTextColor(c)}
                                      className={`h-7 w-7 rounded-full border-2 transition-all ${storyTextColor === c ? "border-white scale-110" : "border-transparent"}`}
                                      style={{ background: c }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Font</label>
                                <div className="flex flex-col gap-1">
                                  {[[ "sans-serif", "Modern" ], [ "serif", "Classic" ], [ "monospace", "Mono" ], [ "cursive", "Script" ]].map(([val, lbl]) => (
                                    <button
                                      key={val}
                                      onClick={() => setStoryTextFont(val)}
                                      className={`text-left text-xs px-2 py-1 rounded-lg transition-all font-bold ${
                                        storyTextFont === val ? "bg-violet-600 text-white" : "text-slate-300 hover:bg-white/10"
                                      }`}
                                      style={{ fontFamily: val }}
                                    >{lbl}</button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => setStoryEditorPanel(null)}
                            className="w-full py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all"
                          >Done ✓</button>
                        </div>
                      )}

                      {/* Music Panel */}
                      {storyEditorPanel === "music" && (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-extrabold text-sm">🎵 Background Music</span>
                            <button onClick={() => setStoryEditorPanel(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                          </div>
                          {selectedMusic ? (
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-violet-500/15 border border-violet-500/30">
                              <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center">
                                  <Music size={16} className="text-white animate-bounce" />
                                </div>
                                <div>
                                  <p className="text-white text-xs font-extrabold truncate max-w-[140px]">{selectedMusic.title}</p>
                                  <p className="text-violet-300 text-[10px]">{selectedMusic.artist || ""}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setShowMusicLibrary(true)} className="text-[10px] text-violet-300 font-bold hover:underline">Change</button>
                                <button onClick={() => setSelectedMusic(null)} className="text-rose-400"><X size={14} /></button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowMusicLibrary(true)}
                              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-violet-500/30 hover:border-violet-500 hover:bg-violet-500/10 transition-all text-violet-400 font-bold text-sm"
                            >
                              <Music size={20} /> Choose a Song
                            </button>
                          )}
                        </div>
                      )}

                      {/* Location Panel */}
                      {storyEditorPanel === "location" && (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-extrabold text-sm">📍 Add Location</span>
                            <button onClick={() => setStoryEditorPanel(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                          </div>
                          <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
                            <input
                              type="text"
                              value={storyLocation}
                              onChange={e => setStoryLocation(e.target.value)}
                              placeholder="Type your location..."
                              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-800 text-white text-sm font-bold outline-none border border-white/10 placeholder-slate-500"
                              autoFocus
                            />
                          </div>
                          {storyLocation.trim() && (
                            <div className="mt-2 flex items-center gap-1.5 bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full w-fit shadow-md">
                              <MapPin size={11} className="text-rose-500" /> {storyLocation}
                            </div>
                          )}
                          <button onClick={() => setStoryEditorPanel(null)} className="mt-3 w-full py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-all">Done ✓</button>
                        </div>
                      )}

                      {/* Emoji Panel */}
                      {storyEditorPanel === "emoji" && (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-extrabold text-sm">😊 Add Emoji</span>
                            <button onClick={() => setStoryEditorPanel(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                          </div>
                          <div className="grid grid-cols-8 gap-1 max-h-36 overflow-y-auto">
                            {["😀","😂","🥹","😍","🥰","😎","🤩","🥳","😜","🤪","😴","🤯","🥶","🔥","💯","✨","🎉","💀","🫶","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💅","👑","🌟","⚡","🌈","🎵","🎶","🏆","🎯","🚀","🌺","🌸","🍕","🍔","🧃","☕","🍦","📸","💬","📱","💪","🙌","👏","🤝","✌️","🤞","🫰","👀","🫡","🫠","😤","💁","🧘","🕺","💃","🐶","🐱"]
                              .map((em, i) => (
                              <button
                                key={i}
                                onClick={() => setStoryTextOverlay(prev => prev + em)}
                                className="text-2xl hover:scale-125 transition-transform leading-none p-0.5"
                              >{em}</button>
                            ))}
                          </div>
                          <p className="text-slate-500 text-[10px] mt-2">Tap emoji to add to text overlay</p>
                        </div>
                      )}

                      {/* Mention Panel */}
                      {storyEditorPanel === "mention" && (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-extrabold text-sm">👤 Tag People</span>
                            <button onClick={() => setStoryEditorPanel(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                          </div>
                          {storyMentions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {storyMentions.map(u => (
                                <span key={u._id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px] font-bold">
                                  <img src={u.profilePic || `https://ui-avatars.com/api/?name=${u.username}&background=7c3aed&color=fff&size=32`} className="h-4 w-4 rounded-full object-cover" alt="" />
                                  @{u.username}
                                  <button onClick={() => setStoryMentions(prev => prev.filter(m => m._id !== u._id))} className="ml-0.5 hover:text-rose-400"><X size={10} /></button>
                                </span>
                              ))}
                            </div>
                          )}
                          <input
                            type="text"
                            value={storyMentionSearch}
                            onChange={e => setStoryMentionSearch(e.target.value)}
                            placeholder="Search username..."
                            className="w-full px-4 py-2.5 rounded-2xl bg-zinc-800 text-white text-sm font-bold outline-none border border-white/10 placeholder-slate-500"
                            autoFocus
                          />
                          {storyMentionResults.length > 0 && (
                            <div className="mt-2 max-h-32 overflow-y-auto rounded-xl bg-zinc-900 border border-white/10">
                              {storyMentionResults.map(user => (
                                <div
                                  key={user._id}
                                  onClick={() => { setStoryMentions(prev => [...prev, user]); setStoryMentionSearch(""); setStoryMentionResults([]); }}
                                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                  <img src={user.profilePic || `https://ui-avatars.com/api/?name=${user.username}&background=7c3aed&color=fff&size=32`} className="h-7 w-7 rounded-full object-cover border border-white/10" alt="" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-white text-xs font-bold truncate">@{user.username}</span>
                                    {user.bio && <span className="text-slate-500 text-[10px] truncate">{user.bio}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Adjust Panel */}
                      {storyEditorPanel === "adjust" && (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-extrabold text-sm">📐 Adjust Photo/Video</span>
                            <button onClick={() => setStoryEditorPanel(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-400 font-bold">
                              <span>Zoom: {storyMediaScale.toFixed(1)}x</span>
                              <button onClick={() => { setStoryMediaScale(1); setStoryMediaX(0); setStoryMediaY(0); }} className="text-[10px] text-violet-400 hover:underline">Reset</button>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={3}
                              step={0.1}
                              value={storyMediaScale}
                              onChange={e => setStoryMediaScale(Number(e.target.value))}
                              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-500 bg-white/10"
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 font-medium text-center">
                            Use the slider to zoom. Drag the media directly on the screen above to pan/position.
                          </p>
                          <button
                            onClick={() => setStoryEditorPanel(null)}
                            className="w-full py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all"
                          >Done ✓</button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ---- Video Trimmer (bottom, above share button) ---- */}
                {mediaType === "video" && videoDuration > 0 && !storyEditorPanel && (
                  <div className="absolute bottom-20 left-3 right-16 z-20 bg-black/60 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1.5">
                      <span>✂️ Trim (max 15s)</span>
                      <span className="text-violet-300 font-mono">{formatDuration(trimStart)} – {formatDuration(trimEnd)}</span>
                    </div>
                    <div
                      className="relative w-full h-7 bg-zinc-800 rounded-xl overflow-hidden cursor-ew-resize flex items-center"
                      onPointerDown={(e) => {
                        const track = e.currentTarget;
                        const rect = track.getBoundingClientRect();
                        const getVal = (cx) => Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * videoDuration;
                        const iv = getVal(e.clientX);
                        const isStart = Math.abs(iv - trimStart) < Math.abs(iv - trimEnd);
                        let tempS = trimStart, tempE = trimEnd;
                        const move = (mv) => {
                          const nv = getVal(mv.clientX);
                          if (isStart) tempS = Math.max(0, Math.min(tempE - 1, nv)); else tempE = Math.min(videoDuration, Math.max(tempS + 1, nv));
                          if (tempE - tempS > 15) { if (isStart) tempS = tempE - 15; else tempE = tempS + 15; }
                          setTrimStart(Math.round(tempS * 100) / 100); setTrimEnd(Math.round(tempE * 100) / 100);
                        };
                        const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
                        window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
                      }}
                    >
                      <div className="absolute h-full bg-violet-600/30 border-t border-b border-violet-500 rounded-xl pointer-events-none"
                        style={{ left: `${(trimStart / videoDuration) * 100}%`, width: `${((trimEnd - trimStart) / videoDuration) * 100}%` }} />
                      <div className="absolute h-full w-3 bg-violet-500 rounded-l flex items-center justify-center"
                        style={{ left: `calc(${(trimStart / videoDuration) * 100}% - 6px)` }}>
                        <div className="w-0.5 h-3 bg-white/50" />
                      </div>
                      <div className="absolute h-full w-3 bg-violet-500 rounded-r flex items-center justify-center"
                        style={{ left: `calc(${(trimEnd / videoDuration) * 100}% - 6px)` }}>
                        <div className="w-0.5 h-3 bg-white/50" />
                      </div>
                      <div className="absolute h-full w-0.5 bg-red-500 pointer-events-none"
                        style={{ left: `${(previewTime / videoDuration) * 100}%` }} />
                    </div>
                  </div>
                )}

                {/* ---- Share to Story Button ---- */}
                <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent flex gap-3">
                  <button
                    disabled={createLoading}
                    onClick={() => handleShareStory(false)}
                    className="flex-1 py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm text-white shadow-2xl transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {createLoading ? (
                      <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sharing...</>
                    ) : (
                      <>Your Story</>
                    )}
                  </button>
                  <button
                    disabled={createLoading}
                    onClick={() => handleShareStory(true)}
                    className="flex-1 py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm text-white shadow-2xl transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {createLoading ? (
                      <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sharing...</>
                    ) : (
                      <>⭐ Close Friends</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

            {/* ======================================================
                SMALL MODAL — shown when no media selected yet
                (gallery upload prompt + Text Story tab)
                ====================================================== */}
            {!(storyTab === "gallery" && (mediaPreview || storyRepostUrl)) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-sm glass-panel p-6 rounded-3xl shadow-2xl relative max-h-[95vh] flex flex-col bg-[#07060f]/80 backdrop-blur-xl border border-white/10"
                >
                  <div className="flex justify-between items-center mb-4 flex-shrink-0 text-white">
                    <h3 className="text-md font-extrabold tracking-wide">Create Story</h3>
                    <button onClick={() => { setShowCreateStoryModal(false); setCaption(""); clearSelectedFile(); setSelectedMusic(null); setStoryRepostUrl(""); setStoryRepostType("image"); setStoryEditorPanel(null); setStoryLocation(""); setStoryMediaScale(1); setStoryMediaX(0); setStoryMediaY(0); clearStoryMentions(); }} className="text-slate-400 hover:text-white p-1">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex bg-zinc-900/60 p-1 rounded-2xl mb-4 border border-white/5 flex-shrink-0">
                    <button type="button" onClick={() => { setStoryTab("gallery"); clearSelectedFile(); setCaption(""); }}
                      className={`flex-grow py-2 text-xs font-bold rounded-xl transition-all ${ storyTab === "gallery" ? "bg-violet-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200" }`}>
                      Gallery Story
                    </button>
                    <button type="button" onClick={() => { setStoryTab("text"); clearSelectedFile(); setCaption(""); }}
                      className={`flex-grow py-2 text-xs font-bold rounded-xl transition-all ${ storyTab === "text" ? "bg-violet-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200" }`}>
                      Text Story
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto pr-1">
                    {storyTab === "gallery" ? (
                      /* Upload area — click to pick file */
                      <div className="relative aspect-[9/16] w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center hover:bg-white/5 transition-all cursor-pointer group">
                        <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <PlusCircle size={40} className="text-violet-400 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-extrabold text-white">Upload Photo or Video</span>
                        <span className="text-[11px] text-slate-500 mt-1">Max 15s for video</span>
                        <div className="mt-4 flex gap-3 text-[10px] text-slate-500 font-bold">
                          <span className="flex items-center gap-1"><Type size={10}/> Text</span>
                          <span className="flex items-center gap-1"><Music size={10}/> Music</span>
                          <span className="flex items-center gap-1"><MapPin size={10}/> Location</span>
                          <span className="flex items-center gap-1"><Smile size={10}/> Emoji</span>
                        </div>
                      </div>
                    ) : (
                      /* Text Story tab */
                      <div className="space-y-4">
                        <div className={`relative aspect-[9/16] w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 border border-white/10 bg-gradient-to-b ${
                          storyBgGradient === "sunset" ? "from-pink-500 to-orange-400" :
                          storyBgGradient === "emerald" ? "from-emerald-400 to-teal-600" :
                          storyBgGradient === "neon" ? "from-fuchsia-600 to-blue-600" :
                          storyBgGradient === "ocean" ? "from-cyan-400 to-blue-500" : "from-slate-900 to-slate-800"
                        }`}>
                          <textarea required value={caption} onChange={(e) => setCaption(e.target.value)}
                            placeholder="Start typing your story..."
                            style={{ color: storyTextColor, fontFamily: storyTextFont }}
                            className="w-full bg-transparent border-none resize-none text-center font-bold text-xl placeholder-white/40 outline-none leading-relaxed overflow-hidden" />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Background</label>
                          <div className="flex gap-2">
                            {["sunset","emerald","neon","ocean","dark"].map((grad) => (
                              <button key={grad} type="button" onClick={() => setStoryBgGradient(grad)}
                                className={`h-7 w-7 rounded-full border-2 transition-all ${ storyBgGradient === grad ? "border-violet-500 scale-110" : "border-transparent" } bg-gradient-to-b ${
                                  grad === "sunset" ? "from-pink-500 to-orange-400" : grad === "emerald" ? "from-emerald-400 to-teal-600" :
                                  grad === "neon" ? "from-fuchsia-600 to-blue-600" : grad === "ocean" ? "from-cyan-400 to-blue-500" : "from-slate-900 to-slate-850" }`} />
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-left">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Text Color</label>
                            <select value={storyTextColor} onChange={(e) => setStoryTextColor(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-zinc-900 text-white outline-none text-xs">
                              <option value="#ffffff" className="bg-zinc-950 text-white">White</option>
                              <option value="#fcd34d" className="bg-zinc-950 text-white">Yellow</option>
                              <option value="#f43f5e" className="bg-zinc-950 text-white">Rose</option>
                              <option value="#22c55e" className="bg-zinc-950 text-white">Green</option>
                              <option value="#3b82f6" className="bg-zinc-950 text-white">Blue</option>
                              <option value="#000000" className="bg-zinc-950 text-white">Black</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Font</label>
                            <select value={storyTextFont} onChange={(e) => setStoryTextFont(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-zinc-950 text-white outline-none text-xs">
                              <option value="sans-serif" className="bg-zinc-950 text-white">Modern Sans</option>
                              <option value="serif" className="bg-zinc-950 text-white">Classic Serif</option>
                              <option value="monospace" className="bg-zinc-950 text-white">Mono</option>
                              <option value="cursive" className="bg-zinc-950 text-white">Cursive</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Music for Text Story */}
                    {storyTab === "text" && (
                      <div className="mt-4 text-left">
                        <label className="text-xs font-bold text-slate-400 flex justify-between items-center mb-1">
                          <span>Background Music</span>
                          {selectedMusic && <button type="button" onClick={() => setSelectedMusic(null)} className="text-[9px] text-rose-400 hover:underline font-bold">Remove</button>}
                        </label>
                        {!selectedMusic ? (
                          <button type="button" onClick={() => setShowMusicLibrary(true)}
                            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/10 hover:border-violet-500 hover:bg-white/5 transition-all text-xs font-bold text-slate-300">
                            <Music size={14} /> Choose background music
                          </button>
                        ) : (
                          <div className="flex items-center justify-between p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-bold">
                            <span className="truncate flex items-center gap-1.5"><Music size={12} className="animate-bounce" /> {selectedMusic.title}</span>
                            <button type="button" onClick={() => setShowMusicLibrary(true)} className="text-[10px] hover:underline">Change</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Text Story Submit */}
                  {storyTab === "text" && (
                    <div className="flex flex-col gap-2 pt-4 border-t border-white/5 mt-4 flex-shrink-0">
                      <div className="flex gap-2 w-full">
                        <button
                          disabled={createLoading || !caption.trim()}
                          onClick={() => handleShareStory(false)}
                          className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center cursor-pointer ${
                            !caption.trim() ? "bg-violet-600/30 text-white/50 cursor-not-allowed" : "bg-vibe-gradient hover:opacity-90"
                          }`}
                        >
                          {createLoading ? "Sharing..." : "Your Story"}
                        </button>
                        <button
                          disabled={createLoading || !caption.trim()}
                          onClick={() => handleShareStory(true)}
                          className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center cursor-pointer ${
                            !caption.trim() ? "bg-emerald-700/30 text-white/50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"
                          }`}
                        >
                          {createLoading ? "Sharing..." : "⭐ Close Friends"}
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { 
                          setShowCreateStoryModal(false); 
                          setCaption(""); 
                          clearSelectedFile(); 
                          setSelectedMusic(null); 
                          setStoryEditorPanel(null); 
                          setStoryLocation(""); 
                          clearStoryMentions(); 
                          setStoryCloseFriendsOnly(false); 
                        }}
                        className="w-full py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* --- STORIES VIEWER MODAL --- */}
      <AnimatePresence>
        {activeStoryGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 select-none">
            <div className="relative w-full max-w-lg h-screen md:h-[90vh] md:max-h-[850px] bg-zinc-950 rounded-none md:rounded-3xl overflow-hidden flex flex-col justify-between">
              
              {/* Story Timer Bars */}
              <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
                {activeStoryGroup.stories.map((st, i) => (
                  <div key={st._id} className="flex-1 h-1 bg-zinc-700/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-75"
                      style={{ 
                        width: i < activeStoryIndex ? "100%" : i === activeStoryIndex ? `${storyTimer}%` : "0%" 
                      }}
                    ></div>
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div className="absolute top-8 left-4 right-4 z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={getAvatarUrl(activeStoryGroup.user)} className="h-9 w-9 rounded-full object-cover border border-white/20" />
                  <div className="flex flex-col text-left">
                      <span className="text-white text-sm font-bold leading-tight flex items-center gap-1">
                        {activeStoryGroup.user.username}
                        {activeStoryGroup.user.isVerified && <Award size={13} className="text-violet-400 fill-violet-400/30" title="Verified Creator" />}
                      </span>
                      {activeStoryGroup.stories[activeStoryIndex].isCloseFriendsOnly && (
                        <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 select-none" title="Close Friends Only">
                          ★ Close Friends
                        </span>
                      )}
                    {activeStoryGroup.stories[activeStoryIndex].music && (
                      <div className="flex items-center gap-1 text-[10px] text-violet-400 font-bold mt-0.5">
                        <Music size={10} className="animate-bounce" />
                        <span className="truncate max-w-[120px]">{activeStoryGroup.stories[activeStoryIndex].music.title}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeStoryGroup.stories[activeStoryIndex].music && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setStoryMuted(!storyMuted);
                      }} 
                      className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                      {storyMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  )}
                  {/* Story Options 3-dot Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStoryDropdown(!showStoryDropdown);
                      }}
                      className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                      title="Story Options"
                    >
                      <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                      {showStoryDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-2 w-36 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-30 overflow-hidden text-xs text-left"
                        >
                          <button 
                            onClick={() => {
                              const storyId = activeStoryGroup.stories[activeStoryIndex]._id;
                              navigator.clipboard.writeText(`${window.location.origin}/stories/${storyId}`);
                              alert("Story link copied to clipboard!");
                              setShowStoryDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 hover:bg-white/5 font-semibold text-slate-200 transition-colors text-left"
                          >
                            Copy Link
                          </button>
                          <button 
                            onClick={() => {
                              setStoryMuted(!storyMuted);
                              setShowStoryDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 hover:bg-white/5 font-semibold text-slate-200 transition-colors text-left"
                          >
                            {storyMuted ? "Unmute Audio" : "Mute Audio"}
                          </button>
                          <button 
                            onClick={() => {
                              const username = activeStoryGroup.user.username;
                              navigator.clipboard.writeText(`${window.location.origin}/profile/${activeStoryGroup.user._id}`);
                              alert(`Copied profile link of @${username} to share story!`);
                              setShowStoryDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 hover:bg-white/5 font-semibold text-slate-200 transition-colors text-left"
                          >
                            Share Profile
                          </button>
                          
                          {activeStoryGroup.user._id === currentUser._id && (
                            <button 
                              onClick={async () => {
                                setShowStoryDropdown(false);
                                if (!window.confirm("Are you sure you want to delete this story?")) return;
                                try {
                                  const storyId = activeStoryGroup.stories[activeStoryIndex]._id;
                                  const res = await fetch(`${API_URL}/stories/${storyId}`, {
                                    method: "DELETE",
                                    headers: { "Authorization": token }
                                  });
                                  if (res.ok) {
                                    if (activeStoryGroup.stories.length === 1) {
                                      closeStoryViewer();
                                    } else {
                                      const updatedStories = activeStoryGroup.stories.filter(s => s._id !== storyId);
                                      setActiveStoryGroup({ ...activeStoryGroup, stories: updatedStories });
                                      if (activeStoryIndex >= updatedStories.length) {
                                        setActiveStoryIndex(updatedStories.length - 1);
                                      }
                                    }
                                    loadFeedData();
                                    socket?.emit("story-update", { type: "delete", storyId });
                                  }
                                } catch (err) {
                                  console.error("Error deleting story:", err);
                                }
                              }}
                              className="w-full px-4 py-2.5 hover:bg-rose-500/10 font-bold text-rose-400 border-t border-white/5 transition-colors text-left"
                            >
                              Delete Story
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={closeStoryViewer} className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors">
                    <X size={22} />
                  </button>
                </div>
              </div>

              {/* Story Content Area */}
              <div 
                className="flex-1 flex items-center justify-center w-full h-full relative cursor-pointer overflow-hidden"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  if (x < rect.width / 3) {
                    // Tap left (previous)
                    if (activeStoryIndex > 0) setActiveStoryIndex(activeStoryIndex - 1);
                  } else {
                    // Tap right (next)
                    if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
                      setActiveStoryIndex(activeStoryIndex + 1);
                    } else {
                      closeStoryViewer();
                    }
                  }
                }}
              >
                 {activeStoryGroup.stories[activeStoryIndex].mediaType === "image" ? (
                   <img 
                     src={activeStoryGroup.stories[activeStoryIndex].mediaUrl} 
                     className="w-full h-full object-cover" 
                     style={activeStoryGroup.stories[activeStoryIndex].mediaAdjust ? {
                       transform: `scale(${activeStoryGroup.stories[activeStoryIndex].mediaAdjust.scale || 1}) translate(${activeStoryGroup.stories[activeStoryIndex].mediaAdjust.x || 0}px, ${activeStoryGroup.stories[activeStoryIndex].mediaAdjust.y || 0}px)`,
                       transition: "transform 0.2s ease-out"
                     } : {}}
                     alt="" 
                   />
                ) : (
                  <video 
                    ref={storyVideoRef}
                    src={activeStoryGroup.stories[activeStoryIndex].mediaUrl} 
                    className="w-full h-full object-cover" 
                    style={activeStoryGroup.stories[activeStoryIndex].mediaAdjust ? {
                      transform: `scale(${activeStoryGroup.stories[activeStoryIndex].mediaAdjust.scale || 1}) translate(${activeStoryGroup.stories[activeStoryIndex].mediaAdjust.x || 0}px, ${activeStoryGroup.stories[activeStoryIndex].mediaAdjust.y || 0}px)`,
                      transition: "transform 0.2s ease-out"
                    } : {}}
                    autoPlay 
                    muted 
                    playsInline 
                    onLoadedMetadata={handleStoryVideoLoaded}
                    onTimeUpdate={handleStoryVideoTimeUpdate}
                  />
                )}

                {/* Story Draggable Text Overlay */}
                {activeStoryGroup.stories[activeStoryIndex].textOverlay?.text ? (
                  <div 
                    style={{
                      left: `${activeStoryGroup.stories[activeStoryIndex].textOverlay.x}%`,
                      top: `${activeStoryGroup.stories[activeStoryIndex].textOverlay.y}%`,
                      color: activeStoryGroup.stories[activeStoryIndex].textOverlay.color,
                      fontFamily: activeStoryGroup.stories[activeStoryIndex].textOverlay.fontFamily,
                      transform: "translate(-50%, -50%)"
                    }}
                    className="absolute z-30 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-center font-bold text-xs md:text-sm pointer-events-none select-none break-words max-w-[80%]"
                  >
                    {activeStoryGroup.stories[activeStoryIndex].textOverlay.text}
                  </div>
                ) : (
                  /* Story Caption Overlay Fallback */
                  activeStoryGroup.stories[activeStoryIndex].caption && (
                    <div className="absolute bottom-16 left-6 right-6 z-20 bg-black/60 text-white font-bold text-center text-xs md:text-sm px-4 py-2.5 rounded-2xl shadow-xl border border-white/5 pointer-events-none break-words leading-relaxed select-none max-w-[85%] mx-auto">
                      {activeStoryGroup.stories[activeStoryIndex].caption}
                    </div>
                  )
                )}
              </div>

              {/* Mentioned users display (shown at bottom of story) */}
              {activeStoryGroup.stories[activeStoryIndex].mentions?.length > 0 && (
                <div className="absolute bottom-6 right-4 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
                  {activeStoryGroup.stories[activeStoryIndex].mentions.map(mentionId => {
                    const mentionUsername = typeof mentionId === "object" ? mentionId.username : null;
                    return (
                      <div
                        key={typeof mentionId === "object" ? mentionId._id : mentionId}
                        className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 pointer-events-auto"
                      >
                        <span className="text-[11px] font-bold text-white">
                          {mentionUsername ? `@${mentionUsername}` : "@user"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Viewers listing button (if story belongs to current user) */}
              {activeStoryGroup.user._id === currentUser._id && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenStoryAnalytics(activeStoryGroup.stories[activeStoryIndex]._id);
                  }}
                  className="absolute bottom-6 left-4 z-20 text-xs text-white hover:text-violet-400 font-bold bg-black/60 hover:bg-black/80 px-4 py-2 rounded-full flex items-center gap-1.5 transition-all shadow-lg border border-white/10"
                >
                  <Eye size={12} />
                  <span>Seen by {activeStoryGroup.stories[activeStoryIndex].viewers.length} users</span>
                </button>
              )}

              {/* Story Viewer Analytics Seen List Slide-Up Overlay */}
              <AnimatePresence>
                {isAnalyticsOpen && (
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()} // Prevent clicking drawer from advancing story
                    className="absolute inset-x-0 bottom-0 z-30 bg-zinc-900/95 backdrop-blur-md rounded-t-3xl border-t border-white/10 max-h-[60%] flex flex-col text-left"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-white/5">
                      <span className="text-white font-bold text-sm">Viewer Analytics</span>
                      <button onClick={handleCloseStoryAnalytics} className="text-white/60 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full">
                        <X size={16} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                      {storyAnalyticsLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500"></div>
                        </div>
                      ) : !showStoryAnalytics || showStoryAnalytics.viewers.length === 0 ? (
                        <p className="text-zinc-500 text-xs text-center py-8">No views yet.</p>
                      ) : (
                        showStoryAnalytics.viewers.map((v) => (
                          <div key={v._id || v.user?._id} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={getAvatarUrl(v.user)} 
                                className="h-9 w-9 rounded-full object-cover border border-white/10" 
                                alt="" 
                              />
                              <span className="text-white font-semibold">{v.user?.username || "Deleted User"}</span>
                            </div>
                            <span className="text-zinc-400 text-[10px]">
                              {v.viewedAt ? formatRelativeTime(v.viewedAt) : "Just now"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Summary Footer */}
                    {showStoryAnalytics && (
                      <div className="p-4 bg-black/40 text-[11px] text-zinc-400 font-bold border-t border-white/5 text-center">
                        Total Views: {showStoryAnalytics.viewsCount}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DETAILED COMMENTS MODAL --- */}
      <AnimatePresence>
        {showCommentsPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-lg glass-panel h-[80vh] flex flex-col justify-between rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-slate-200/40 dark:border-slate-800/40">
                <h3 className="font-bold text-[16px]">Comments</h3>
                <button onClick={() => setShowCommentsPost(null)} className="text-slate-500">
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {comments.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm pt-8">No comments yet. Be the first to start the vibe!</p>
                ) : (
                  comments.filter(c => !c.parentComment).map(c => {
                    const isLiked = c.likes?.includes(currentUser._id);
                    const isOwner = String(c.user?._id) === String(currentUser._id) || String(showCommentsPost.user?._id) === String(currentUser._id);
                    const replies = comments.filter(r => String(r.parentComment) === String(c._id));

                    return (
                      <div key={c._id} className="space-y-3">
                        {/* Parent Comment */}
                        <div className="flex gap-3 items-start text-[14px]">
                          <img src={getAvatarUrl(c.user)} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                          <div className="flex-1 bg-slate-100/80 dark:bg-slate-900/60 p-3.5 rounded-2xl">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-xs flex items-center gap-1">
                                {c.user?.username}
                                {c.user?.isVerified && <Award size={12} className="text-violet-500 fill-violet-500/30" />}
                              </span>
                              <span className="text-[9.5px] text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200">{renderText(c.text)}</p>
                            <div className="flex items-center gap-4 mt-2.5">
                              <button 
                                onClick={() => {
                                  setReplyToCommentId(c._id);
                                  setNewCommentText(`@${c.user?.username} `);
                                }}
                                className="text-[10.5px] font-bold text-violet-500 hover:underline"
                              >
                                Reply
                              </button>
                              
                              <button 
                                onClick={() => handleCommentLikeToggle(c._id)}
                                className={`text-[10.5px] font-bold flex items-center gap-1 hover:underline ${isLiked ? "text-rose-500" : "text-slate-500"}`}
                              >
                                <Heart size={11} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                                <span>{c.likes?.length || 0}</span>
                              </button>

                              <div className="relative ml-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownCommentId(activeDropdownCommentId === c._id ? null : c._id);
                                  }}
                                  className="p-1 hover:bg-slate-200/50 dark:hover:bg-zinc-800/80 rounded-full transition-all text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
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
                                          navigator.clipboard.writeText(`${window.location.origin}/posts/${showCommentsPost._id}`);
                                          alert("Post link copied to share!");
                                          setActiveDropdownCommentId(null);
                                        }}
                                        className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left"
                                      >
                                        Share Link
                                      </button>
                                      {isOwner && (
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

                        {/* Replies (Indented) */}
                        {replies.length > 0 && (
                          <div className="pl-6 space-y-2 border-l border-slate-200/50 dark:border-slate-800/50 ml-4">
                            {replies.map(r => {
                              const rLiked = r.likes?.includes(currentUser._id);
                              const rOwner = String(r.user?._id) === String(currentUser._id) || String(showCommentsPost.user?._id) === String(currentUser._id);

                              return (
                                <div key={r._id} className="flex gap-2.5 items-start text-[13px]">
                                  <img src={getAvatarUrl(r.user)} className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                                  <div className="flex-1 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-bold text-[11px] flex items-center gap-1">
                                        {r.user?.username}
                                        {r.user?.isVerified && <Award size={10} className="text-violet-500 fill-violet-500/30" />}
                                      </span>
                                      <span className="text-[9px] text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300">{renderText(r.text)}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <button 
                                        onClick={() => handleCommentLikeToggle(r._id)}
                                        className={`text-[10px] font-bold flex items-center gap-1 hover:underline ${rLiked ? "text-rose-500" : "text-slate-500"}`}
                                      >
                                        <Heart size={10} className={rLiked ? "fill-rose-500 text-rose-500" : ""} />
                                        <span>{r.likes?.length || 0}</span>
                                      </button>

                                      <div className="relative ml-auto">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdownCommentId(activeDropdownCommentId === r._id ? null : r._id);
                                          }}
                                          className="p-1 hover:bg-slate-200/50 dark:hover:bg-zinc-800/80 rounded-full transition-all text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
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
                                                  navigator.clipboard.writeText(`${window.location.origin}/posts/${showCommentsPost._id}`);
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
              </div>

              {/* Input Area */}
              <form onSubmit={submitComment} className="p-4 border-t border-slate-200/40 dark:border-slate-800/40 flex gap-3 items-center bg-white/60 dark:bg-black/20">
                <input
                  type="text"
                  required
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={replyToCommentId ? "Add a reply..." : "Add a comment..."}
                  className="flex-grow px-4 py-3 rounded-2xl border vibe-input-field outline-none text-sm"
                />
                <button type="submit" className="p-3 bg-violet-500 text-white rounded-2xl">
                  <Send size={16} />
                </button>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMusicLibrary && (
          <MusicLibrary 
            onClose={() => setShowMusicLibrary(false)}
            onSelect={(music) => setSelectedMusic(music)}
          />
        )}
      </AnimatePresence>

      {/* Post Delete Confirmation Dialog */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm glass-panel p-6 rounded-3xl shadow-2xl text-center flex flex-col gap-4"
            >
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Delete Post</h3>
              <p className="text-xs text-slate-500 font-medium">Are you sure you want to delete this post? This action cannot be undone.</p>
              
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setPostToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 dark:border-slate-800 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-900/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePost}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 shadow-md"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Share Modal */}
      <ShareModal
        isOpen={!!shareModalPost}
        onClose={() => setShareModalPost(null)}
        postId={shareModalPost?._id}
        onShareCountUpdate={(newCount) => {
          if (!shareModalPost) return;
          setPosts(prev => prev.map(p => {
            if (p._id === shareModalPost._id) {
              return { ...p, sharesCount: newCount };
            }
            return p;
          }));
        }}
      />

      {savingPostForCollection && (
        <SaveToCollectionModal 
          post={savingPostForCollection} 
          onClose={() => setSavingPostForCollection(null)} 
        />
      )}

    </div>
  );
};

export default Feed;