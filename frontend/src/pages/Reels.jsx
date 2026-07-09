import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Heart, MessageCircle, Volume2, VolumeX, Play, Pause, ChevronRight, Subtitles } from "lucide-react";

const ReelsItem = ({ post, isActive, token, API_URL, currentUser, pushRESTNotification }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [likes, setLikes] = useState(post.likes || []);

  // Premium Reels Features: Playback Speed & Captions
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5, 1, 1.5, 2
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentCaption, setCurrentCaption] = useState("");

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.playbackRate = playbackSpeed;
        videoRef.current.play()
          .then(() => {
            setIsPlaying(true);
            fetch(`${API_URL}/posts/watch-reel/${post._id}`, {
              method: "POST",
              headers: { "Authorization": token }
            }).catch(err => console.error("Watch tracking error:", err));
          })
          .catch((err) => console.log("Auto-play blocked:", err));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, playbackSpeed]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleCycleSpeed = () => {
    let nextSpeed = 1;
    if (playbackSpeed === 1) nextSpeed = 1.5;
    else if (playbackSpeed === 1.5) nextSpeed = 2;
    else if (playbackSpeed === 2) nextSpeed = 0.5;
    else if (playbackSpeed === 0.5) nextSpeed = 1;

    setPlaybackSpeed(nextSpeed);
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`${API_URL}/posts/like/${post._id}`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        const isLiked = likes.includes(currentUser._id);
        setLikes(prev => isLiked ? prev.filter(id => id !== currentUser._id) : [...prev, currentUser._id]);
        
        if (data.notification) {
          pushRESTNotification(post.user._id, data.notification);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimeUpdate = (e) => {
    const time = e.target.currentTime;
    
    // Trim limitations
    if (post.videoTrim && post.videoTrim.endTime > 0) {
      if (time < post.videoTrim.startTime) {
        e.target.currentTime = post.videoTrim.startTime;
      }
      if (time >= post.videoTrim.endTime) {
        e.target.currentTime = post.videoTrim.startTime;
        e.target.play().catch(() => {});
      }
    }

    // Dynamic captions sync overlay
    if (showCaptions) {
      const relativeTime = post.videoTrim && post.videoTrim.endTime > 0
        ? time - post.videoTrim.startTime
        : time;
      
      const captionText = post.caption || "VibeShare Premium Reels Moment";
      const words = captionText.split(" ");
      const segmentSize = Math.max(3, Math.ceil(words.length / 4));
      
      const segments = [];
      for (let i = 0; i < words.length; i += segmentSize) {
        segments.push(words.slice(i, i + segmentSize).join(" "));
      }

      if (segments.length < 4) {
        segments.push("Feelin' the amazing vibes on VibeShare ✨");
        segments.push("Hit the heart button to show some love! ❤️");
        segments.push("Sharing premium visual stories every day 🌟");
      }

      const index = Math.floor(relativeTime / 2.5) % segments.length;
      setCurrentCaption(segments[index] || "");
    }
  };

  const isLikedByMe = likes.includes(currentUser._id);

  return (
    <div className="snap-start relative w-full h-[calc(100vh-4rem)] md:h-screen bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={post.mediaUrl}
        className="w-full h-full object-cover cursor-pointer"
        loop
        muted={isMuted}
        playsInline
        onClick={handlePlayPause}
        onLoadedMetadata={(e) => {
          if (post.videoTrim && post.videoTrim.endTime > 0) {
            e.target.currentTime = post.videoTrim.startTime;
          }
          e.target.playbackRate = playbackSpeed;
        }}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Play/Pause Overlay indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/10">
          <div className="p-4 rounded-full bg-black/40 text-white">
            <Pause size={30} />
          </div>
        </div>
      )}

      {/* CC Subtitles Caption Text Overlay */}
      {showCaptions && currentCaption && (
        <div className="absolute bottom-24 left-6 right-20 z-20 flex justify-center pointer-events-none">
          <div className="bg-black/75 text-yellow-350 dark:text-yellow-300 font-extrabold text-center text-xs md:text-sm px-4.5 py-2.5 rounded-2xl shadow-2xl max-w-[85%] border border-white/5 tracking-wide select-none">
            {currentCaption}
          </div>
        </div>
      )}

      {/* Right controls side panel */}
      <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-6 text-white select-none">
        <button 
          onClick={handleLike} 
          className="flex flex-col items-center hover:scale-105 transition-all text-white drop-shadow-lg"
        >
          <Heart size={28} className={isLikedByMe ? "fill-rose-500 text-rose-500" : "text-white"} />
          <span className="text-xs font-bold mt-1">{likes.length}</span>
        </button>

        <button className="flex flex-col items-center hover:scale-105 transition-all text-white drop-shadow-lg">
          <MessageCircle size={28} />
          <span className="text-xs font-bold mt-1">Reels</span>
        </button>

        {/* Speed Rate Toggle Switch */}
        <button 
          onClick={handleCycleSpeed} 
          className="flex flex-col items-center hover:scale-105 transition-all text-white drop-shadow-lg"
          title="Change playback speed"
        >
          <div className="h-9 w-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10">
            {playbackSpeed}x
          </div>
          <span className="text-[9px] font-black mt-1 uppercase tracking-wider text-slate-300">Speed</span>
        </button>

        {/* Captions Subtitles Switch */}
        <button 
          onClick={() => setShowCaptions(!showCaptions)} 
          className="flex flex-col items-center hover:scale-105 transition-all text-white drop-shadow-lg"
          title="Toggle Subtitles"
        >
          <div className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all ${
            showCaptions 
              ? "bg-violet-500 text-white border-violet-500/20" 
              : "bg-black/40 text-white border-white/10 hover:bg-black/60"
          }`}>
            <Subtitles size={18} />
          </div>
          <span className="text-[9px] font-black mt-1 uppercase tracking-wider text-slate-300">CC</span>
        </button>

        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="p-2 bg-black/40 rounded-full hover:scale-105 transition-all text-white border border-white/10 hover:bg-black/60"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Bottom info panel overlay */}
      <div className="absolute bottom-6 left-4 right-16 z-20 text-white flex flex-col gap-2 pointer-events-none drop-shadow-md">
        <div className="flex items-center gap-2.5">
          <img 
            src={post.user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.user.username)}`} 
            className="h-8 w-8 rounded-full border border-white/20 object-cover" 
            alt=""
          />
          <span className="font-bold text-sm">{post.user.username}</span>
        </div>
        <p className="text-xs text-zinc-100 max-w-sm line-clamp-2 font-medium">{post.caption}</p>
        {post.location && (
          <span className="text-[10px] text-zinc-300 flex items-center gap-0.5"><ChevronRight size={12} /> {post.location}</span>
        )}
      </div>
    </div>
  );
};

const Reels = () => {
  const { token, API_URL, currentUser } = useAuth();
  const { pushRESTNotification } = useSocket();

  const [reels, setReels] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const res = await fetch(`${API_URL}/posts/reels`, {
          headers: { "Authorization": token }
        });
        if (res.ok) setReels(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReels();
  }, []);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, clientHeight } = containerRef.current;
      const index = Math.round(scrollTop / clientHeight);
      if (index !== activeIndex && index >= 0 && index < reels.length) {
        setActiveIndex(index);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-black text-white h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-black text-white h-screen p-6 text-center">
        <p className="text-slate-400 text-sm mb-4">No video reels shared yet.</p>
        <p className="text-xs text-slate-500">Be the first to upload one from the post create panel!</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-grow snap-y snap-mandatory overflow-y-scroll h-[calc(100vh-4rem)] md:h-screen scrollbar-hide bg-black"
    >
      {reels.map((reel, index) => (
        <ReelsItem
          key={reel._id}
          post={reel}
          isActive={index === activeIndex}
          token={token}
          API_URL={API_URL}
          currentUser={currentUser}
          pushRESTNotification={pushRESTNotification}
        />
      ))}
    </div>
  );
};

export default Reels;
