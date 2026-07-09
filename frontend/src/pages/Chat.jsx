import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { 
  Send, Image, User, Circle, X, MessageCircle, ArrowLeft, Play, 
  Phone, Video, VideoOff, PhoneOff, Palette, Monitor, Search, Info, Mic, MicOff, Users, Plus, Trash, CheckSquare, BookmarkPlus, Check, Award
} from "lucide-react";

// Story Mention Card — shown in DM when someone tags you in their story
const StoryMentionCard = ({ msg, navigateTo }) => {

  const handleAddToStory = () => {
    // Store the story media in localStorage so Feed.jsx can pre-load the story creation modal
    localStorage.setItem("pendingStoryData", JSON.stringify({
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType || "image"
    }));
    // Navigate to feed page where the story modal will open pre-loaded
    navigateTo("feed");
  };

  return (
    <div className="flex flex-col gap-0 overflow-hidden" style={{ minWidth: 200, maxWidth: 240 }}>
      {/* Story media preview — 9:16 aspect */}
      <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: "9/16", maxHeight: 280 }}>
        {msg.mediaType === "video" ? (
          <video
            src={msg.mediaUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
            loop
          />
        ) : (
          <img
            src={msg.mediaUrl}
            className="w-full h-full object-cover"
            alt="Story preview"
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
        {/* Story badge top-left */}
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
          <span>📸</span> Story
        </div>
      </div>

      {/* Caption */}
      <p className="text-xs font-semibold text-white/90 mt-2 px-0.5 leading-tight">{msg.text}</p>

      {/* Add to Story button — navigates to Feed story creation modal */}
      <button
        onClick={handleAddToStory}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all bg-violet-600/80 hover:bg-violet-600 text-white border border-violet-500/30 hover:scale-[1.02] active:scale-95"
      >
        <BookmarkPlus size={13} /> Add to My Story
      </button>
    </div>
  );
};

const SharedProfilePreview = ({ profileId, token, API_URL, navigateTo }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/users/profile/${profileId}`, {
          headers: { "Authorization": token }
        });
        if (res.ok) {
          setProfile(await res.json());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching preview profile:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [profileId, token, API_URL]);

  if (loading) {
    return (
      <div className="w-56 p-3 bg-black/10 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-slate-200/40 dark:border-slate-800/40 mt-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-xs text-slate-400 italic p-2.5 border border-slate-200/20 dark:border-slate-800/40 rounded-xl bg-slate-50/5 dark:bg-zinc-900/10 mt-2 text-left">
        Profile unavailable
      </div>
    );
  }

  const getAvatarUrl = (user) => {
    if (!user) return "";
    return user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username || "User")}&backgroundType=gradientLinear`;
  };

  return (
    <div 
      onClick={() => navigateTo("profile", profile._id)}
      className="w-56 bg-white/90 dark:bg-[#1a1926]/95 hover:bg-white dark:hover:bg-[#1e1d2d] border border-slate-200/50 dark:border-slate-800/70 rounded-2xl p-4 flex flex-col items-center text-center shadow-md transition-all cursor-pointer select-none group text-left mt-2"
    >
      <img 
        src={getAvatarUrl(profile)} 
        className="w-14 h-14 rounded-full object-cover border-2 border-violet-500/20 group-hover:scale-105 transition-transform" 
        alt={profile.username}
      />
      <h4 className="font-bold text-xs mt-2 text-slate-850 dark:text-slate-200 flex items-center gap-1 leading-tight">
        @{profile.username}
        {profile.isVerified && <Award size={13} className="text-violet-500 fill-violet-500/30 flex-shrink-0" />}
      </h4>
      {profile.name && <p className="text-[10px] text-slate-400 font-semibold">{profile.name}</p>}
      <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-1.5 line-clamp-2 min-h-[28px] leading-relaxed">
        {profile.bio || "Active VibeShare member"}
      </p>
      <button 
        className="w-full mt-3 py-1.5 rounded-xl bg-vibe-gradient text-white text-[10px] font-extrabold hover:scale-[1.02] active:scale-95 transition-all text-center"
      >
        View Profile
      </button>
    </div>
  );
};

const SharedPostPreview = ({ postId, token, API_URL, navigateTo }) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!postId) return;
    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_URL}/posts/${postId}`, {
          headers: { "Authorization": token }
        });
        if (res.ok) {
          setPost(await res.json());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching preview post:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId, token, API_URL]);

  if (loading) {
    return (
      <div className="w-56 p-3 bg-black/10 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-slate-200/40 dark:border-slate-800/40 mt-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-xs text-slate-400 italic p-2.5 border border-slate-200/20 dark:border-slate-800/40 rounded-xl bg-slate-50/5 dark:bg-zinc-900/10 mt-2 text-left">
        Post unavailable or deleted
      </div>
    );
  }

  const getAvatarUrl = (user) => {
    if (!user) return "";
    return user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username || "User")}&backgroundType=gradientLinear`;
  };

  const isCode = post.postType === "code";
  const isVideo = post.mediaType === "video" || post.postType === "video";
  const isImage = post.mediaType === "image" || post.postType === "image";

  return (
    <div 
      onClick={() => navigateTo("post", post._id)}
      className="w-56 bg-white/90 dark:bg-[#1a1926]/95 hover:bg-white dark:hover:bg-[#1e1d2d] border border-slate-200/50 dark:border-slate-800/70 rounded-2xl overflow-hidden shadow-md transition-all cursor-pointer select-none group text-left mt-2"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b border-slate-200/10 dark:border-slate-800/20 bg-slate-50/50 dark:bg-black/10">
        <img 
          src={getAvatarUrl(post.user)} 
          className="h-5 w-5 rounded-full object-cover border border-violet-500/10" 
          alt="" 
        />
        <span className="font-bold text-[10.5px] text-slate-700 dark:text-slate-200 truncate group-hover:underline max-w-[100px]">
          {post.user?.username || "user"}
        </span>
        <span className="text-[8px] text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded-full ml-auto font-extrabold uppercase tracking-wider">
          {isCode ? "Code" : isVideo ? "Reel" : "Post"}
        </span>
      </div>

      {/* Preview area */}
      {isCode && post.codeSnippet ? (
        <div className="p-3 bg-[#13131a] font-mono text-[9px] leading-tight text-[#c5c5d2] overflow-hidden max-h-20 relative select-none">
          <pre className="overflow-hidden truncate">{post.codeSnippet.code}</pre>
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#13131a] to-transparent pointer-events-none" />
        </div>
      ) : post.mediaUrl && (isImage || isVideo) ? (
        <div className="relative h-28 w-full bg-black/10 flex items-center justify-center overflow-hidden">
          {isImage ? (
            <img src={post.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
          ) : (
            <div className="relative w-full h-full">
              <video src={post.mediaUrl} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white scale-90 group-hover:scale-100 transition-all shadow-md">
                  <Play size={12} className="fill-white text-white" />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Caption snippet */}
      {post.caption && (
        <div className="p-2 text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed break-words bg-slate-50/5 dark:bg-black/5 border-t border-slate-200/5 dark:border-slate-800/5">
          {post.caption}
        </div>
      )}
    </div>
  );
};

// Voice Note Player Component
const VoiceMsgBubble = ({ voiceUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio(voiceUrl);
    
    const updateProgress = () => {
      if (audioRef.current) {
        const current = audioRef.current.currentTime || 0;
        const duration = audioRef.current.duration || 1;
        setProgress((current / duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audioRef.current.addEventListener("timeupdate", updateProgress);
    audioRef.current.addEventListener("ended", handleEnded);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("timeupdate", updateProgress);
        audioRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, [voiceUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error("Playback error:", e));
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 w-48 py-1">
      <button 
        type="button" 
        onClick={togglePlay}
        className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <span className="flex gap-0.5 items-center justify-center">
            <span className="w-0.5 h-3 bg-white animate-pulse" />
            <span className="w-0.5 h-3 bg-white animate-pulse" style={{ animationDelay: "0.2s" }} />
          </span>
        ) : (
          <Play size={14} className="fill-white ml-0.5" />
        )}
      </button>
      <div className="flex-grow flex flex-col gap-1">
        <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[8px] text-white/70 font-semibold uppercase tracking-wider">Voice Message</span>
      </div>
    </div>
  );
};

const Chat = ({ navigateTo, targetChatId }) => {
  const { currentUser, token, API_URL } = useAuth();
  const { 
    onlineUsers, 
    activeChatMessages, 
    setActiveChatMessages, 
    activeGroupMessages,
    setActiveGroupMessages,
    typingUsers, 
    sendMessage, 
    sendTypingStatus,
    // Calling States/Helpers
    call,
    callAccepted,
    callEnded,
    receivingCall,
    caller,
    callType,
    callUser,
    acceptCall,
    declineCall,
    endCall,
    resetCallState,
    // Group Helpers
    joinGroupRoom,
    sendGroupMessage
  } = useSocket();

  const [chatTab, setChatTab] = useState("direct"); // "direct" or "group"
  const [threads, setThreads] = useState([]);
  const [groupThreads, setGroupThreads] = useState([]);
  
  const [activePartner, setActivePartner] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  
  const [inputText, setInputText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Theme state
  const [activeTheme, setActiveTheme] = useState("classic");
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Gallery Panel state
  const [showGallery, setShowGallery] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  // Group Create Modal state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchList, setGroupSearchList] = useState([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  // Voice Note states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Video call simulation streams state
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");

  // Multi-select message deletion states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  // HTML5 video refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const ringtoneRef = useRef(null);

  const setLocalVideoRef = (el) => {
    localVideoRef.current = el;
    if (el) {
      el.srcObject = isScreenSharing ? screenStream : localStream;
    }
  };

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = isScreenSharing ? screenStream : localStream;
    }
  }, [localStream, screenStream, isScreenSharing]);

  const handleChatImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Fetch direct active chat threads list
  const loadThreads = async () => {
    setLoadingThreads(true);
    try {
      const res = await fetch(`${API_URL}/messages/chats`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const list = await res.json();
        setThreads(list);
        
        // If targetChatId is passed, load that partner
        if (targetChatId) {
          const partnerExists = list.find(t => t.partner._id === targetChatId);
          if (partnerExists) {
            selectPartner(partnerExists.partner);
          } else {
            const userRes = await fetch(`${API_URL}/users/profile/${targetChatId}`, {
              headers: { "Authorization": token }
            });
            if (userRes.ok) {
              const partnerUser = await userRes.json();
              selectPartner(partnerUser);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  };

  // Fetch group threads list
  const loadGroupThreads = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/groups`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setGroupThreads(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadThreads();
    loadGroupThreads();
  }, [targetChatId]);

  // Load chat messages history
  const selectPartner = async (partner) => {
    setActivePartner(partner);
    setActiveGroup(null);
    setLoadingHistory(true);
    setActiveChatMessages([]);
    setShowGallery(false);
    setSearchQuery("");
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    
    // Load theme for this partner thread
    if (currentUser?.chatThemes && currentUser.chatThemes[partner._id]) {
      setActiveTheme(currentUser.chatThemes[partner._id]);
    } else {
      setActiveTheme("classic");
    }

    try {
      const res = await fetch(`${API_URL}/messages/history/${partner._id}`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setActiveChatMessages(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load Group Chat messages history
  const selectGroup = async (group) => {
    setActiveGroup(group);
    setActivePartner(null);
    setLoadingHistory(true);
    setActiveGroupMessages([]);
    setShowGallery(false);
    setSearchQuery("");
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    joinGroupRoom(group._id);

    if (currentUser?.chatThemes && currentUser.chatThemes[group._id]) {
      setActiveTheme(currentUser.chatThemes[group._id]);
    } else {
      setActiveTheme("classic");
    }

    try {
      const res = await fetch(`${API_URL}/messages/groups/${group._id}/history`, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setActiveGroupMessages(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Scroll messages to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChatMessages, activeGroupMessages, typingUsers]);

  // Load shared gallery items
  const loadGalleryMedia = async () => {
    setLoadingGallery(true);
    try {
      const endpoint = activeGroup 
        ? `${API_URL}/messages/groups/${activeGroup._id}/gallery`
        : `${API_URL}/messages/gallery/${activePartner._id}`;
      
      const res = await fetch(endpoint, {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        setGalleryMedia(await res.json());
      }
    } catch (err) {
      console.error("Error loading gallery media:", err);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    if (showGallery && (activePartner || activeGroup)) {
      loadGalleryMedia();
    }
  }, [showGallery, activePartner, activeGroup]);

  // Theme selection handler
  const handleSelectTheme = async (themeName) => {
    const threadId = activeGroup ? activeGroup._id : activePartner._id;
    try {
      const res = await fetch(`${API_URL}/users/chat-theme`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ threadId, theme: themeName })
      });
      if (res.ok) {
        setActiveTheme(themeName);
        setShowThemePicker(false);
        // Sync local current user themes reference
        if (!currentUser.chatThemes) currentUser.chatThemes = {};
        currentUser.chatThemes[threadId] = themeName;
      }
    } catch (err) {
      console.error("Error setting chat theme:", err);
    }
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result;
      handleSelectTheme(base64Image);
    };
    reader.readAsDataURL(file);
  };

  // Group search user suggestions
  useEffect(() => {
    if (!groupSearchQuery.trim()) {
      setGroupSearchList([]);
      return;
    }
    const searchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(groupSearchQuery)}`, {
          headers: { "Authorization": token }
        });
        if (res.ok) {
          setGroupSearchList(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    };
    searchUsers();
  }, [groupSearchQuery]);

  // Create group chat handler
  const handleCreateGroupChat = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/messages/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          memberIds: selectedGroupMembers.map(m => m._id)
        })
      });
      if (res.ok) {
        const newGroup = await res.json();
        loadGroupThreads();
        setShowCreateGroup(false);
        setNewGroupName("");
        setSelectedGroupMembers([]);
        selectGroup(newGroup);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Voice recording timer effect
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  const handleStartVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result;
          if (activeGroup) {
            sendGroupMessage(activeGroup._id, "", "", base64Audio);
          } else if (activePartner) {
            sendMessage(activePartner._id, "", "", base64Audio);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission denied. Unable to record voice.");
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startRingtone = () => {
    try {
      if (ringtoneRef.current) return;
      
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const isIncoming = call.isReceiving;
      
      const scheduleTone = () => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.type = "sine";
        osc2.type = "sine";
        
        if (isIncoming) {
          // Pleasant high-end double chime for incoming call (vibrato chime)
          osc1.frequency.setValueAtTime(660, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
          
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.05); // Louder volume (0.35 instead of 0.12)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);
          
          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc1.start();
          osc2.start();
          osc1.stop(audioCtx.currentTime + 1.8);
          osc2.stop(audioCtx.currentTime + 1.8);
        } else {
          // Standard ringback tone for outgoing calls (beep... beep...)
          osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(480, audioCtx.currentTime);
          
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.1); // Louder volume (0.25 instead of 0.08)
          gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime + 1.2);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.4);
          
          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc1.start();
          osc2.start();
          osc1.stop(audioCtx.currentTime + 1.4);
          osc2.stop(audioCtx.currentTime + 1.4);
        }
      };

      const playTone = () => {
        if (audioCtx.state === "suspended") {
          audioCtx.resume()
            .then(() => {
              scheduleTone();
            })
            .catch(err => console.error("Error resuming audio context:", err));
        } else {
          scheduleTone();
        }
      };
      
      playTone();
      const intervalId = setInterval(playTone, 3000);
      
      ringtoneRef.current = {
        audioCtx,
        intervalId
      };
    } catch (e) {
      console.error("Failed to start ringtone:", e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current.intervalId);
      try {
        ringtoneRef.current.audioCtx.close();
      } catch (e) {}
      ringtoneRef.current = null;
    }
  };

  // Manage calling ringtone sound
  useEffect(() => {
    const isRinging = (call.isCalling || call.isReceiving) && !callAccepted && !callEnded;
    if (isRinging) {
      startRingtone();
    } else {
      stopRingtone();
    }

    const handleUserInteraction = () => {
      if (ringtoneRef.current && ringtoneRef.current.audioCtx) {
        const { audioCtx } = ringtoneRef.current;
        if (audioCtx.state === "suspended") {
          audioCtx.resume()
            .then(() => console.log("AudioContext resumed by user interaction"))
            .catch(err => console.error("Failed to resume AudioContext:", err));
        }
      }
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);

    return () => {
      stopRingtone();
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [call.isCalling, call.isReceiving, callAccepted, callEnded]);

  // Connected calling timer counter
  useEffect(() => {
    let callTimer = null;
    if (callAccepted && !callEnded) {
      callTimer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(callTimer);
  }, [callAccepted, callEnded]);

  const [localCallType, setLocalCallType] = useState("video");

  useEffect(() => {
    if (call.to || call.from) {
      setLocalCallType(callType);
    }
  }, [call.to, call.from, callType]);

  // Query and populate available video input devices (cameras)
  useEffect(() => {
    const shouldAccessMedia = callAccepted || (call.isCalling && callType === "video");
    if (shouldAccessMedia && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevs = devices.filter(d => d.kind === "videoinput");
          setVideoDevices(videoDevs);
          if (videoDevs.length > 0 && !selectedVideoDeviceId) {
            setSelectedVideoDeviceId(videoDevs[0].deviceId);
          }
        })
        .catch(err => console.error("Error enumerating devices:", err));
    }
  }, [callAccepted, call.isCalling, callType]);

  // Video call stream setup
  useEffect(() => {
    const shouldAccessMedia = callAccepted || (call.isCalling && localCallType === "video");
    if (shouldAccessMedia) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("getUserMedia is not supported in this browser/context.");
        return;
      }

      // Stop existing stream tracks to release device locks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      const constraints = {
        video: localCallType === "video" ? (selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true) : false,
        audio: true
      };

      navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Re-enumerate devices to get actual labels now that permission is granted
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices()
            .then(devices => {
              const videoDevs = devices.filter(d => d.kind === "videoinput");
              setVideoDevices(videoDevs);
            });
        }
      })
      .catch(err => {
        console.error("Camera access error, trying fallback to audio only:", err);
        if (localCallType === "video") {
          navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            .then(stream => {
              setLocalStream(stream);
              localStreamRef.current = stream;
              setLocalCallType("audio"); // Switch local UI to audio call immediately
              alert("Camera access failed. Connected with audio only.");
            })
            .catch(fallbackErr => {
              console.error("Audio-only access error:", fallbackErr);
              alert("Could not access camera or microphone. Please check your browser permissions.");
            });
        } else {
          alert("Could not access microphone. Please check your browser permissions.");
        }
      });
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
    };
  }, [callAccepted, call.isCalling, localCallType, selectedVideoDeviceId]);

  const handleToggleScreenSharing = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
          }
        };
      } catch (err) {
        console.error("Screen sharing error:", err);
      }
    }
  };

  const handleToggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleCam = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !imageUrl.trim()) return;

    if (activeGroup) {
      sendGroupMessage(activeGroup._id, inputText, imageUrl);
    } else if (activePartner) {
      sendMessage(activePartner._id, inputText, imageUrl);
    }
    
    setInputText("");
    setImageUrl("");
    if (activePartner) {
      sendTypingStatus(activePartner._id, false);
    }
  };

  const handleDeleteMessage = async (messageId, isGroup = false) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      const url = isGroup 
        ? `${API_URL}/messages/group/${messageId}` 
        : `${API_URL}/messages/${messageId}`;
        
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        }
      });
      
      if (res.ok) {
        if (isGroup) {
          setActiveGroupMessages(prev => prev.filter(m => m._id !== messageId));
        } else {
          setActiveChatMessages(prev => prev.filter(m => m._id !== messageId));
        }
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to delete message");
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("Error deleting message");
    }
  };

  const handleBulkDeleteMessages = async (isGroup = false) => {
    if (selectedMessageIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedMessageIds.length} selected messages?`)) return;
    
    try {
      const url = isGroup 
        ? `${API_URL}/messages/group/bulk-delete` 
        : `${API_URL}/messages/bulk-delete`;
        
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messageIds: selectedMessageIds })
      });

      if (res.ok) {
        if (isGroup) {
          setActiveGroupMessages(prev => prev.filter(m => !selectedMessageIds.includes(m._id)));
        } else {
          setActiveChatMessages(prev => prev.filter(m => !selectedMessageIds.includes(m._id)));
        }
        setIsSelectionMode(false);
        setSelectedMessageIds([]);
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to delete messages");
      }
    } catch (err) {
      console.error("Error bulk deleting messages:", err);
      alert("Error bulk deleting messages");
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (activePartner) {
      sendTypingStatus(activePartner._id, e.target.value.length > 0);
    }
  };

  const formatCallTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getAvatarUrl = (user) => {
    return user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}&backgroundType=gradientLinear`;
  };

  const isPartnerOnline = activePartner && onlineUsers.includes(activePartner._id);
  
  // Theme Background mapping classes
  const themeContainerBg = {
    classic: "bg-slate-50/5 dark:bg-zinc-950/10",
    sunset: "bg-gradient-to-tr from-amber-500/10 via-rose-500/10 to-violet-500/10",
    emerald: "bg-gradient-to-tr from-teal-500/10 via-emerald-500/10 to-green-500/10",
    "neon-glow": "bg-neutral-950",
    ocean: "bg-gradient-to-tr from-blue-600/10 via-cyan-500/10 to-sky-400/10"
  };

  const themeBubbleMe = {
    classic: "bg-vibe-gradient text-white rounded-br-none",
    sunset: "bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-br-none",
    emerald: "bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-br-none",
    "neon-glow": "bg-purple-600/90 border border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.35)] text-white rounded-br-none",
    ocean: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-none"
  };

  const currentMessages = activeGroup ? activeGroupMessages : activeChatMessages;
  const filteredMessages = currentMessages.filter(msg => {
    if (!searchQuery.trim()) return true;
    return msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-grow flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden relative">
      
      {/* Sidebar Threads list */}
      <div className={`w-full md:w-80 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-black/10 flex flex-col ${activePartner || activeGroup ? "hidden md:flex" : "flex"}`}>
        {/* Switcher header tabs */}
        <div className="p-4 border-b border-slate-200/40 dark:border-slate-800/40 flex justify-between items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl flex-grow">
            <button 
              onClick={() => setChatTab("direct")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${chatTab === "direct" ? "bg-white dark:bg-zinc-800 text-violet-500 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Direct
            </button>
            <button 
              onClick={() => setChatTab("group")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${chatTab === "group" ? "bg-white dark:bg-zinc-800 text-violet-500 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Groups
            </button>
          </div>
          {chatTab === "group" && (
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all"
              title="Create Group Chat"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chatTab === "direct" ? (
            loadingThreads ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
              </div>
            ) : threads.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-8">No chats started yet.</p>
            ) : (
              threads.map(thread => {
                const isOnline = onlineUsers.includes(thread.partner._id);
                const isSelected = activePartner && activePartner._id === thread.partner._id;
                
                return (
                  <div 
                    key={thread.partner._id}
                    onClick={() => selectPartner(thread.partner)}
                    className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-violet-500/10 text-violet-500" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img src={getAvatarUrl(thread.partner)} className="h-10 w-10 rounded-full object-cover" />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0b0c10]" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs leading-tight truncate flex items-center gap-1">
                          {thread.partner.username}
                          {thread.partner.isVerified && <Award size={13} className="text-violet-500 fill-violet-500/30 flex-shrink-0" />}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5">
                          {thread.lastMessage?.isStoryMention ? "📸 Story mention" : thread.lastMessage?.voiceUrl ? "🎤 Voice Message" : thread.lastMessage?.text?.includes("/posts/") ? "🔗 Shared a post" : thread.lastMessage?.text?.includes("/profile/") ? "👤 Shared a profile" : (thread.lastMessage?.text || "📷 Media attachment")}
                        </span>
                      </div>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="h-4 min-w-[16px] rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )
          ) : (
            groupThreads.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-8">No group chats created yet.</p>
            ) : (
              groupThreads.map(thread => {
                const isSelected = activeGroup && activeGroup._id === thread.group._id;
                const groupPic = thread.group.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(thread.group.name)}&backgroundType=gradientLinear`;
                
                return (
                  <div 
                    key={thread.group._id}
                    onClick={() => selectGroup(thread.group)}
                    className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-violet-500/10 text-violet-500" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img src={groupPic} className="h-10 w-10 rounded-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs leading-tight truncate">{thread.group.name}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5">
                          {thread.lastMessage?.sender ? `${thread.lastMessage.sender.username}: ` : ""}
                          {thread.lastMessage?.voiceUrl ? "🎤 Voice Note" : thread.lastMessage?.text?.includes("/posts/") ? "🔗 Shared a post" : thread.lastMessage?.text?.includes("/profile/") ? "👤 Shared a profile" : (thread.lastMessage?.text || "📷 Media attachment")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Active Chat Conversation Viewport */}
      <div className={`flex-grow flex flex-col justify-between bg-white/10 dark:bg-black/5 relative ${!activePartner && !activeGroup ? "hidden md:flex" : "flex"}`}>
        {activePartner || activeGroup ? (
          <>
            {/* Thread Header Info Panel */}
            <div className="relative p-4 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between bg-white/70 dark:bg-black/35 backdrop-blur-md z-30">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => { setActivePartner(null); setActiveGroup(null); }} 
                  className="md:hidden p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-700 dark:text-slate-200"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="relative flex-shrink-0">
                  <img src={activeGroup ? (activeGroup.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeGroup.name)}`) : getAvatarUrl(activePartner)} className="h-10 w-10 rounded-full object-cover" />
                  {isPartnerOnline && !activeGroup && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0b0c10]" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm leading-tight truncate flex items-center gap-1">
                    {activeGroup ? activeGroup.name : activePartner.username}
                    {!activeGroup && activePartner.isVerified && <Award size={14} className="text-violet-500 fill-violet-500/30 flex-shrink-0" />}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    {activeGroup ? (
                      `Group (${activeGroup.members?.length || 0} members)`
                    ) : isPartnerOnline ? (
                      <>
                        <Circle size={8} className="fill-emerald-500 text-emerald-500" /> Active Now
                      </>
                    ) : (
                      "Offline"
                    )}
                  </span>
                </div>
              </div>

              {/* Toolbar controls (Theme, Call, Gallery, Search) */}
              <div className="flex items-center gap-1.5 relative">
                {/* Select Messages Toggle */}
                <button 
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedMessageIds([]);
                  }}
                  className={`p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/50 rounded-xl text-slate-500 dark:text-slate-400 transition-colors ${isSelectionMode ? "bg-violet-500/10 text-violet-500 dark:text-violet-400" : ""}`}
                  title="Select Messages"
                >
                  <CheckSquare size={18} />
                </button>

                {/* Search Toggle */}
                <button 
                  onClick={() => setShowSearchBar(!showSearchBar)}
                  className={`p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/50 rounded-xl text-slate-500 dark:text-slate-400 transition-colors ${showSearchBar ? "text-violet-500" : ""}`}
                  title="Search Messages"
                >
                  <Search size={18} />
                </button>

                {/* Theme Selector Trigger */}
                <button 
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/50 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                  title="Chat Themes"
                >
                  <Palette size={18} />
                </button>

                {/* Video/Audio calling triggers (Direct Chats only) */}
                {!activeGroup && (
                  <>
                    <button 
                      onClick={() => callUser(activePartner._id, false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/50 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                      title="Audio Call"
                    >
                      <Phone size={18} />
                    </button>
                    <button 
                      onClick={() => callUser(activePartner._id, true)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/50 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                      title="Video Call"
                    >
                      <Video size={18} />
                    </button>
                  </>
                )}

                {/* Media Gallery Toggle */}
                <button 
                  onClick={() => setShowGallery(!showGallery)}
                  className={`p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/50 rounded-xl text-slate-500 dark:text-slate-400 transition-colors ${showGallery ? "text-violet-500" : ""}`}
                  title="Shared Media & Gallery"
                >
                  <Info size={18} />
                </button>

                {/* Theme Options Dropdown List */}
                {showThemePicker && (
                  <div className="absolute right-0 top-11 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-2.5 shadow-xl z-50 flex flex-col gap-1.5 w-42 text-left">
                    <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">Themes</span>
                    {["classic", "sunset", "emerald", "neon-glow", "ocean"].map((t) => (
                      <button
                        key={t}
                        onClick={() => handleSelectTheme(t)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl capitalize transition-colors ${activeTheme === t ? "bg-violet-500/10 text-violet-500" : "hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-250"}`}
                      >
                        {t.replace("-", " ")}
                      </button>
                    ))}
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1.5">
                      <input
                        type="file"
                        id="chat-wallpaper-upload"
                        accept="image/*"
                        onChange={handleWallpaperUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById("chat-wallpaper-upload")?.click()}
                        className="w-full text-[10px] font-bold px-3 py-2 rounded-xl bg-violet-500/10 text-violet-500 hover:bg-violet-500/15 transition-colors text-center flex items-center justify-center gap-1"
                      >
                        <span>🌅 Custom Image</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Local Text Filter Search Bar */}
            {showSearchBar && (
              <div className="px-4 py-2 border-b border-slate-200/20 dark:border-slate-800/20 bg-slate-50/50 dark:bg-black/10 flex items-center justify-between gap-3 animate-slide-down">
                <input
                  type="text"
                  placeholder="Filter messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow px-3 py-1.5 rounded-xl border border-slate-200/30 dark:border-zinc-800 bg-[var(--bg-main)] text-xs font-semibold outline-none focus:border-violet-500 text-slate-800 dark:text-slate-200"
                />
                <button 
                  onClick={() => { setSearchQuery(""); setShowSearchBar(false); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Chat backdrop area with dynamic styling */}
            <div 
              className={`flex-1 overflow-y-auto p-5 space-y-4 relative transition-all duration-300 ${activeTheme && !activeTheme.startsWith("data:image/") ? themeContainerBg[activeTheme] : ""}`}
              style={activeTheme && activeTheme.startsWith("data:image/") ? {
                backgroundImage: `url(${activeTheme})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              } : {}}
            >
              {activeTheme && activeTheme.startsWith("data:image/") && (
                <div className="absolute inset-0 bg-slate-100/10 dark:bg-black/45 pointer-events-none z-0" />
              )}
              {loadingHistory ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-violet-500 border-t-transparent"></div>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-10">
                  {searchQuery ? "No matching messages found." : "No messages in this chat session yet."}
                </div>
              ) : (
                filteredMessages.map(msg => {
                  const isMe = msg.sender === currentUser._id || msg.sender?._id === currentUser._id;
                  const senderName = msg.sender?.username || (isMe ? currentUser.username : activePartner?.username || "user");
                  
                  // Parse post/profile ID from shared links
                  const postMatch = msg.text ? msg.text.match(/\/posts\/([a-fA-F0-9]{24})/) : null;
                  const sharedPostId = postMatch ? postMatch[1] : null;
                  const isPlainShareLink = msg.text ? (/^(Check out this post:\s*)?https?:\/\/[^\s]+\/posts\/[a-fA-F0-9]{24}\s*$/i).test(msg.text.trim()) : false;

                  const profileMatch = msg.text ? msg.text.match(/\/profile\/([a-fA-F0-9]{24})/) : null;
                  const sharedProfileId = profileMatch ? profileMatch[1] : null;
                  const isPlainProfileLink = msg.text ? (/^https?:\/\/[^\s]+\/profile\/[a-fA-F0-9]{24}\s*$/i).test(msg.text.trim()) : false;

                  return (
                    <div key={msg._id} className={`flex flex-col relative z-10 ${isMe ? "items-end" : "items-start"}`}>
                      {/* Show sender username in group chats */}
                      {activeGroup && !isMe && (
                        <span className="text-[10px] font-bold text-slate-500 mb-0.5 px-1">{senderName}</span>
                      )}
                      
                      <div className="flex items-center gap-2 max-w-[70%] group">
                        {isSelectionMode ? (
                          isMe && (
                            <input
                              type="checkbox"
                              checked={selectedMessageIds.includes(msg._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMessageIds(prev => [...prev, msg._id]);
                                } else {
                                  setSelectedMessageIds(prev => prev.filter(id => id !== msg._id));
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-350 dark:border-slate-700 text-violet-500 focus:ring-violet-500 cursor-pointer flex-shrink-0 accent-violet-600"
                            />
                          )
                        ) : (
                          isMe && (
                            <button
                              onClick={() => handleDeleteMessage(msg._id, !!activeGroup)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all duration-200 cursor-pointer flex-shrink-0"
                              title="Delete Message"
                            >
                              <Trash size={14} />
                            </button>
                          )
                        )}
                        <div 
                          onClick={() => {
                            if (isSelectionMode && isMe) {
                              if (selectedMessageIds.includes(msg._id)) {
                                setSelectedMessageIds(prev => prev.filter(id => id !== msg._id));
                              } else {
                                setSelectedMessageIds(prev => [...prev, msg._id]);
                              }
                            }
                          }}
                          className={`rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
                            isSelectionMode && isMe ? "cursor-pointer select-none" : ""
                          } ${
                            isSelectionMode && isMe && selectedMessageIds.includes(msg._id)
                              ? "ring-2 ring-violet-500 bg-violet-500/20 text-slate-800 dark:text-slate-200"
                              : isMe 
                                ? (themeBubbleMe[activeTheme] || themeBubbleMe.classic) 
                                : "bg-slate-100 dark:bg-[#1a1926] text-slate-800 dark:text-slate-100 rounded-bl-none"
                          }`}
                        >
                          {/* Story Mention Card */}
                          {msg.isStoryMention ? (
                            <StoryMentionCard msg={msg} navigateTo={navigateTo} />
                          ) : (
                            <>
                              {msg.text && !isPlainShareLink && !isPlainProfileLink && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                              
                              {sharedPostId && (
                                <SharedPostPreview 
                                  postId={sharedPostId} 
                                  token={token} 
                                  API_URL={API_URL} 
                                  navigateTo={navigateTo} 
                                />
                              )}

                              {sharedProfileId && (
                                <SharedProfilePreview 
                                  profileId={sharedProfileId} 
                                  token={token} 
                                  API_URL={API_URL} 
                                  navigateTo={navigateTo} 
                                />
                              )}

                              {msg.voiceUrl && (
                                <VoiceMsgBubble voiceUrl={msg.voiceUrl} />
                              )}

                              {msg.mediaUrl && !msg.isStoryMention && (
                                <img src={msg.mediaUrl} className="mt-2 rounded-xl max-w-full max-h-60 object-cover" alt="" />
                              )}
                            </>
                          )}
                          <span className={`block text-[9px] mt-1.5 text-right ${isMe ? "text-white/60" : "text-slate-400"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicators */}
              {!activeGroup && activePartner && typingUsers[activePartner._id] && (
                <div className="flex justify-start items-center gap-2 relative z-10">
                  <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2.5 rounded-2xl rounded-bl-none flex gap-1 items-center">
                    <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce" />
                    <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="relative z-10" />
            </div>

            {/* Input Toolbar Form panel or Bulk Action Bar */}
            {isSelectionMode ? (
              <div className="p-4 border-t border-slate-200/40 dark:border-slate-800/40 bg-white/70 dark:bg-black/35 flex justify-between items-center relative z-10 animate-slide-up">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedMessageIds.length} messages selected
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Only messages sent by you can be deleted
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedMessageIds([]);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkDeleteMessages(!!activeGroup)}
                    disabled={selectedMessageIds.length === 0}
                    className={`px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                      selectedMessageIds.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Trash size={14} />
                    <span>Delete Selected</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200/40 dark:border-slate-800/40 bg-white/70 dark:bg-black/35 flex flex-col gap-3 relative z-10">
                {imageUrl && (
                  <div className="relative self-start rounded-xl overflow-hidden border border-[var(--border-color)] bg-black/5 dark:bg-white/5 p-1.5 flex items-center">
                    <img src={imageUrl} className="h-16 w-16 object-cover rounded-lg" alt="Preview" />
                    <button 
                      type="button" 
                      onClick={() => setImageUrl("")}
                      className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-md scale-75"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-3 items-center">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleChatImageChange}
                    className="hidden" 
                  />
                  
                  {/* Choose Image input */}
                  <button 
                    type="button" 
                    disabled={isRecording}
                    onClick={() => fileInputRef.current?.click()} 
                    className={`p-3 border rounded-2xl transition-all ${
                      imageUrl ? "bg-violet-500/10 text-violet-500 border-violet-500/30" : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-violet-500/5"
                    } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Image size={18} />
                  </button>

                  {/* Voice Record trigger */}
                  <button
                    type="button"
                    onClick={isRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
                    className={`p-3 border rounded-2xl transition-all flex items-center justify-center ${
                      isRecording 
                        ? "bg-rose-500 text-white border-rose-600 animate-pulse" 
                        : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-rose-500/5 hover:text-rose-500"
                    }`}
                    title={isRecording ? "Stop and Send Voice Note" : "Record Voice Note"}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  {/* Interactive Message input or recording timer */}
                  {isRecording ? (
                    <div className="flex-grow px-4 py-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-rose-500 font-bold text-xs flex items-center justify-between">
                      <span>Recording Audio...</span>
                      <span>{formatCallTime(recordingTime)}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder="Message..."
                      className="flex-grow px-4 py-3 rounded-2xl border vibe-input-field outline-none text-sm font-medium"
                    />
                  )}

                  <button 
                    type="submit" 
                    disabled={isRecording}
                    className={`p-3 bg-violet-500 hover:bg-violet-600 text-white rounded-2xl shadow-md transition-all ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <MessageCircle size={40} className="text-slate-400 mb-2" />
            <h3 className="font-bold text-sm">No Active Chat</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">Select one of your threads or search for a user profile to start direct messaging.</p>
          </div>
        )}
      </div>

      {/* Shared Media Gallery Drawer Slide-out panel */}
      {showGallery && (activePartner || activeGroup) && (
        <div className="absolute top-0 right-0 h-full w-80 bg-white dark:bg-zinc-950 border-l border-slate-200/50 dark:border-zinc-800/80 shadow-2xl z-30 flex flex-col p-5 animate-slide-left">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200/30 dark:border-slate-800/40">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <Info size={16} className="text-violet-500" />
              <span>Conversation Gallery</span>
            </h3>
            <button 
              onClick={() => setShowGallery(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 dark:text-slate-500"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-4 space-y-4">
            {loadingGallery ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
              </div>
            ) : galleryMedia.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-8">No shared attachments found.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {galleryMedia.map(msg => {
                  if (msg.voiceUrl) {
                    return (
                      <div key={msg._id} className="col-span-3 p-2 bg-slate-50 dark:bg-zinc-900 rounded-xl flex items-center justify-between border border-slate-150 dark:border-slate-850">
                        <Mic size={14} className="text-violet-500" />
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-350">Voice note attachment</span>
                        <span className="text-[8px] text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg._id} className="relative aspect-square bg-slate-100 dark:bg-zinc-900 rounded-xl overflow-hidden shadow-sm group">
                      <img src={msg.mediaUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Group Chat Modal Drawer */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl shadow-2xl flex flex-col gap-4 text-left border border-slate-200/50 dark:border-zinc-800">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Users size={18} className="text-violet-500" />
                <span>Create Group Chat</span>
              </h3>
              <button 
                onClick={() => { setShowCreateGroup(false); setNewGroupName(""); setSelectedGroupMembers([]); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-slate-500 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Group Name</label>
              <input 
                type="text" 
                placeholder="Enter group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs font-semibold outline-none focus:border-violet-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Search members list */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Add Members</label>
              <input 
                type="text" 
                placeholder="Search usernames..."
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs font-semibold outline-none focus:border-violet-500 text-slate-800 dark:text-slate-200"
              />
              
              {/* Search suggestions list */}
              {groupSearchList.length > 0 && (
                <div className="flex flex-col gap-1 border border-slate-200/50 dark:border-zinc-800 rounded-2xl p-2 max-h-[120px] overflow-y-auto bg-[var(--bg-main)] mt-1.5">
                  {groupSearchList.map(user => {
                    const alreadySelected = selectedGroupMembers.some(m => m._id === user._id);
                    if (user._id === currentUser._id || alreadySelected) return null;
                    
                    return (
                      <div 
                        key={user._id}
                        onClick={() => {
                          setSelectedGroupMembers(prev => [...prev, user]);
                          setGroupSearchQuery("");
                          setGroupSearchList([]);
                        }}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                      >
                        <img src={getAvatarUrl(user)} className="h-6 w-6 rounded-full object-cover" />
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{user.username}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Members Chips */}
            {selectedGroupMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                {selectedGroupMembers.map(user => (
                  <div key={user._id} className="flex items-center gap-1 px-2.5 py-1 bg-violet-500/10 text-violet-500 rounded-full text-[10px] font-bold">
                    <span>{user.username}</span>
                    <button 
                      onClick={() => setSelectedGroupMembers(prev => prev.filter(m => m._id !== user._id))}
                      className="hover:text-rose-500 font-extrabold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={handleCreateGroupChat}
              disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
              className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* --- Connected Calling UI Overlay (WebRTC Calling Simulation screen) --- */}
      {(call.to || call.from) && (
        <div className="fixed inset-0 z-[100] bg-[#0a0914] text-white select-none overflow-hidden flex flex-col justify-between">
          {/* Background Video Stream */}
          {((callAccepted && !callEnded) || (call.isCalling && localCallType === "video")) && localCallType === "video" && (
            <video 
              ref={setLocalVideoRef}
              autoPlay 
              playsInline 
              muted={true}
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-0"
            />
          )}

          {/* Semi-transparent dark overlay for text readability */}
          {localCallType === "video" && (
            <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
          )}

          {/* Immersive Floating Content */}
          <div className="relative z-20 flex flex-col items-center justify-between w-full h-full p-6 md:p-10">
            {/* Header calling status */}
            <div className="flex flex-col items-center gap-2 mt-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-violet-500/25 shadow-md animate-pulse">
                {localCallType === "video" ? "Video Call" : "Audio Call"}
              </span>
              <h2 className="text-xl md:text-2xl font-black mt-2 tracking-tight drop-shadow-md">
                {call.isReceiving ? (caller ? call.name : "Incoming call...") : (activePartner ? activePartner.username : "Calling...")}
              </h2>
              <span className="text-xs text-slate-350 font-bold tracking-wide mt-1 drop-shadow-sm">
                {callAccepted ? `Connected • ${formatCallTime(callDuration)}` : call.isReceiving ? "Incoming Session..." : "Connecting..."}
              </span>
            </div>

            {/* Audio call waves and avatar (ONLY shown for audio call) */}
            {localCallType === "audio" && (
              <div className="flex-grow flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <img src={getAvatarUrl(activePartner || currentUser)} className="h-28 w-28 rounded-full object-cover border-4 border-violet-500 shadow-2xl" />
                  <span className="absolute inset-0 rounded-full border-4 border-violet-500/30 animate-ping" />
                </div>
                <div className="flex gap-1 justify-center items-end h-8">
                  {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                    <span 
                      key={i} 
                      className="w-1 bg-violet-500 rounded-full animate-pulse"
                      style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s`, animationDuration: "0.8s" }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Remote Partner Mini Viewport (Only for connected active Video Call) */}
            {localCallType === "video" && callAccepted && (
              <div className="absolute top-24 right-6 h-28 w-20 bg-black/60 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl flex items-center justify-center z-30 animate-fade-in">
                <img src={getAvatarUrl(activePartner || currentUser)} className="h-10 w-10 rounded-full object-cover animate-pulse" />
              </div>
            )}

            {/* Bottom Controls HUD wrapper */}
            <div className="w-full flex flex-col items-center gap-4 mt-auto">
              {/* Camera Selection Dropdown (Only for Video Calls) */}
              {localCallType === "video" && videoDevices.length > 0 && (
                <div className="flex flex-col items-center gap-1 z-30 bg-black/50 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/5 shadow-md">
                  <label className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Select Camera</label>
                  <select
                    value={selectedVideoDeviceId}
                    onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-[10px] font-bold text-slate-350 outline-none focus:border-violet-500 max-w-[200px]"
                  >
                    {videoDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId} className="bg-slate-950 text-white text-[10px]">
                        {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* CALL CONTROLS HUD BUTTONS */}
              <div className="flex items-center gap-4 bg-black/45 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 shadow-2xl z-30">
                {call.isReceiving && !callAccepted ? (
                  // Incoming Call accept / decline
                  <div className="flex gap-6">
                    <button 
                      onClick={declineCall}
                      className="h-14 w-14 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all hover:scale-105"
                      title="Decline Call"
                    >
                      <PhoneOff size={22} />
                    </button>
                    <button 
                      onClick={acceptCall}
                      className="h-14 w-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all hover:scale-105"
                      title="Accept Call"
                    >
                      <Phone size={22} className="rotate-45" />
                    </button>
                  </div>
                ) : (
                  // Connected active call HUD controls
                  <div className="flex items-center gap-4">
                    {callAccepted && (
                      <>
                        {/* Mute button */}
                        <button 
                          type="button"
                          onClick={handleToggleMute}
                          className={`h-12 w-12 rounded-full border flex items-center justify-center transition-all ${isMuted ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "border-white/10 bg-white/5 hover:bg-white/15 text-white"}`}
                          title={isMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>

                        {/* Video Camera Toggle */}
                        {localCallType === "video" && (
                          <button 
                            type="button"
                            onClick={handleToggleCam}
                            className={`h-12 w-12 rounded-full border flex items-center justify-center transition-all ${isCamOff ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "border-white/10 bg-white/5 hover:bg-white/15 text-white"}`}
                            title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
                          >
                            {isCamOff ? <VideoOff size={18} /> : <Video size={18} />}
                          </button>
                        )}

                        {/* Screen Sharing Toggle */}
                        {localCallType === "video" && (
                          <button 
                            type="button"
                            onClick={handleToggleScreenSharing}
                            className={`h-12 w-12 rounded-full border flex items-center justify-center transition-all ${isScreenSharing ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "border-white/10 bg-white/5 hover:bg-white/15 text-white"}`}
                            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
                          >
                            <Monitor size={18} />
                          </button>
                        )}
                      </>
                    )}

                    {/* End Call Button */}
                    <button 
                      onClick={() => endCall(call.isReceiving ? caller : activePartner?._id)}
                      className="h-14 w-14 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 hover:scale-105 transition-all"
                      title="End Call"
                    >
                      <PhoneOff size={22} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Chat;
