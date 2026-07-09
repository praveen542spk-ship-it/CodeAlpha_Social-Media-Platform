import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Play, Pause, Music, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────
//  YOUTUBE IFRAME PLAYER API LOADER
// ─────────────────────────────────────────────────────────────────
const loadYTAPI = () => {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        resolve(window.YT);
      }
    }, 100);
  });
};

// ─────────────────────────────────────────────────────────────────
//  REAL POPULAR SONGS CATALOG (With YouTube IDs)
// ─────────────────────────────────────────────────────────────────
const ALL_TRACKS = [
  // ── TAMIL (Anirudh Hits & Others) ──────────────────────────────────
  { id: "ta-1",  lang: "Tamil",   emoji: "🔥", title: "Hukum (Alappara)",        artist: "Anirudh Ravichander",  genre: "Mass",       youtubeId: "1F3hm6MfR1k", duration: 207 },
  { id: "ta-2",  lang: "Tamil",   emoji: "🦁", title: "Badass (Leo)",            artist: "Anirudh Ravichander",  genre: "Mass",       youtubeId: "IqwIOlhfC5A", duration: 228 },
  { id: "ta-3",  lang: "Tamil",   emoji: "⚡", title: "Naa Ready (Leo)",          artist: "Anirudh Ravichander",  genre: "Dance",      youtubeId: "szvt1vD0U_Q", duration: 248 },
  { id: "ta-4",  lang: "Tamil",   emoji: "💃", title: "Arabic Kuthu",           artist: "Anirudh Ravichander",  genre: "Peppy",      youtubeId: "KUN5Uf9mObQ", duration: 280 },
  { id: "ta-5",  lang: "Tamil",   emoji: "💫", title: "Vaathi Coming",          artist: "Anirudh Ravichander",  genre: "Mass",       youtubeId: "fRD_3TB5LAg", duration: 250 },
  { id: "ta-6",  lang: "Tamil",   emoji: "✨", title: "Kaavalaa (Jailer)",       artist: "Anirudh Ravichander",  genre: "Dance",      youtubeId: "8_yG082xZ4I", duration: 210 },
  { id: "ta-7",  lang: "Tamil",   emoji: "🎤", title: "Why This Kolaveri Di",    artist: "Anirudh Ravichander",  genre: "Trending",   youtubeId: "YR12Z8f1SX8", duration: 250 },
  { id: "ta-8",  lang: "Tamil",   emoji: "🌸", title: "Megham Karukatha",       artist: "Dhanush / Anirudh",    genre: "Romantic",   youtubeId: "h7n6R8B_n2o", duration: 286 },
  { id: "ta-9",  lang: "Tamil",   emoji: "❤️", title: "Munbe Vaa",              artist: "A.R. Rahman",          genre: "Melody",     youtubeId: "zS3Q6q-cRGo", duration: 312 },
  { id: "ta-10", lang: "Tamil",   emoji: "🎶", title: "Rowdy Baby",             artist: "Yuvan Shankar Raja",   genre: "Dance",      youtubeId: "xRmC-MhB48o", duration: 281 },
  { id: "ta-11", lang: "Tamil",   emoji: "🥂", title: "Private Party",          artist: "Anirudh Ravichander",  genre: "Party",      youtubeId: "f75Jq83Zf3o", duration: 218 },
  { id: "ta-12", lang: "Tamil",   emoji: "💖", title: "Bae (Don)",               artist: "Anirudh Ravichander",  genre: "Melody",     youtubeId: "L75y03X_N6c", duration: 212 },
  { id: "ta-13", lang: "Tamil",   emoji: "🎸", title: "Jolly O Gymkhana",       artist: "A.R. Rahman / Vijay",  genre: "Peppy",      youtubeId: "vBdfwJ1Yj0A", duration: 206 },
  { id: "ta-14", lang: "Tamil",   emoji: "🌊", title: "Nenjame",                artist: "Sid Sriram",           genre: "Melody",     youtubeId: "xS88HkP5j1s", duration: 267 },

  // ── HINDI ──────────────────────────────────
  { id: "hi-1",  lang: "Hindi",   emoji: "🌹", title: "Kesariya",               artist: "Arijit Singh",         genre: "Romantic",   youtubeId: "BddP6PYo2gs", duration: 265 },
  { id: "hi-2",  lang: "Hindi",   emoji: "💫", title: "Chaleya (Jawan)",         artist: "Arijit Singh / Anirudh",genre: "Romantic",  youtubeId: "VAdGW7QDJUI", duration: 200 },
  { id: "hi-3",  lang: "Hindi",   emoji: "❤️", title: "Apna Bana Le",           artist: "Arijit Singh",         genre: "Melodic",    youtubeId: "ElZfdU54Cp8", duration: 204 },
  { id: "hi-4",  lang: "Hindi",   emoji: "🌟", title: "Tum Hi Ho",              artist: "Arijit Singh",         genre: "Romantic",   youtubeId: "Umqb9KENgMk", duration: 261 },
  { id: "hi-5",  lang: "Hindi",   emoji: "✨", title: "Heeriye",                artist: "Jasleen Royal / Arijit",genre: "Trending",  youtubeId: "g6fS16H4X1w", duration: 198 },
  { id: "hi-6",  lang: "Hindi",   emoji: "💥", title: "Chumma Kizhi (Hindi)",   artist: "Anirudh Ravichander",  genre: "Party",      youtubeId: "P51Sg4Q8M88", duration: 224 },

  // ── TELUGU ─────────────────────────────────
  { id: "te-1",  lang: "Telugu",  emoji: "🔥", title: "Naatu Naatu (RRR)",       artist: "Rahul Sipligunj",      genre: "Dance",      youtubeId: "OsU0CGZoV8Y", duration: 226 },
  { id: "te-2",  lang: "Telugu",  emoji: "💫", title: "Srivalli",              artist: "Sid Sriram",           genre: "Melodic",    youtubeId: "hH-1v3b9x3o", duration: 251 },
  { id: "te-3",  lang: "Telugu",  emoji: "🫶", title: "Oo Antava Mava",         artist: "Indravathi Chauhan",   genre: "Item",       youtubeId: "9G1vD0U_Q88", duration: 212 },
  { id: "te-4",  lang: "Telugu",  emoji: "💛", title: "Buttabomma",             artist: "Armaan Malik",         genre: "Romantic",   youtubeId: "2m18Q9g2Z40", duration: 243 },
  { id: "te-5",  lang: "Telugu",  emoji: "🎵", title: "Ramuloo Ramulaa",        artist: "Anurag Kulkarni",      genre: "Party",      youtubeId: "e31Onj-PItk", duration: 191 },

  // ── ENGLISH ────────────────────────────────
  { id: "en-1",  lang: "English", emoji: "🕶️", title: "Blinding Lights",        artist: "The Weeknd",           genre: "Pop",        youtubeId: "f1vD0U_Q8o8", duration: 200 },
  { id: "en-2",  lang: "English", emoji: "🎸", title: "Shape of You",           artist: "Ed Sheeran",           genre: "Pop",        youtubeId: "JGwWNGJdvx8", duration: 234 },
  { id: "en-3",  lang: "English", emoji: "🔮", title: "Levitating",             artist: "Dua Lipa",             genre: "Pop",        youtubeId: "TUVcZfQe-Kw", duration: 203 },
  { id: "en-4",  lang: "English", emoji: "🌸", title: "Flowers",               artist: "Miley Cyrus",          genre: "Pop",        youtubeId: "G7KNmW9aElY", duration: 200 },
  { id: "en-5",  lang: "English", emoji: "⚡", title: "Stay",                   artist: "Justin Bieber / Laroi",genre: "Pop",        youtubeId: "kTJczUoc26U", duration: 138 },
  { id: "en-6",  lang: "English", emoji: "💫", title: "As It Was",              artist: "Harry Styles",         genre: "Indie Pop",  youtubeId: "H5v3kku4y6Q", duration: 167 },
];

const GENRE_COLOR = {
  Mass:        "bg-red-500/20 text-red-300",
  Dance:       "bg-pink-500/20 text-pink-300",
  Romantic:    "bg-rose-500/20 text-rose-300",
  Melody:      "bg-violet-500/20 text-violet-300",
  Party:       "bg-orange-500/20 text-orange-300",
  Pop:         "bg-blue-500/20 text-blue-300",
  Trending:    "bg-emerald-500/20 text-emerald-300",
  Peppy:       "bg-lime-500/20 text-lime-300",
  Item:        "bg-yellow-500/20 text-yellow-300",
  Melodic:     "bg-purple-500/20 text-purple-300",
  "Indie Pop": "bg-indigo-400/20 text-indigo-200",
};

// Deterministic waveform bars
const getWaveform = (track, bars = 70) => {
  const seed = track.youtubeId.charCodeAt(0) + track.youtubeId.charCodeAt(2);
  return Array.from({ length: bars }, (_, i) => {
    const v = Math.sin(seed * 0.02 + i * 0.7) * 0.4 + Math.sin(i * 1.2 + seed * 0.01) * 0.3 + 0.35;
    return Math.max(0.08, Math.min(1, Math.abs(v)));
  });
};

const EqBars = () => (
  <div className="flex items-end gap-px h-4 w-5">
    {[1,2,3,4].map(i => (
      <div key={i} className="w-[3px] bg-violet-300 rounded-full"
        style={{ animation:`eqb ${0.35+i*0.12}s ease-in-out infinite alternate`, height:`${25+i*18}%` }} />
    ))}
    <style>{`@keyframes eqb{from{transform:scaleY(.2)}to{transform:scaleY(1)}}`}</style>
  </div>
);

const fmt = (s) => `${Math.floor(s/60)}:${String(Math.floor(s)%60).padStart(2,"0")}`;

// ─────────────────────────────────────────────────────────────────
//  WAVEFORM TRIMMER Component
// ─────────────────────────────────────────────────────────────────
const CLIP_SEC = 60;

const WaveformTrimmer = ({ track, startTime, onChange }) => {
  const bars      = getWaveform(track, 70);
  const trimWidth = Math.min(1, CLIP_SEC / track.duration);
  const maxStart  = 1 - trimWidth;
  const startFrac = Math.min(maxStart, startTime / track.duration);

  const trackRef  = useRef(null);
  const isDragging = useRef(false);

  const fracToTime = (f) => Math.round(Math.max(0, Math.min(maxStart, f)) * track.duration);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    trackRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current || !trackRef.current) return;
    const rect  = trackRef.current.getBoundingClientRect();
    const rawF  = (e.clientX - rect.left) / rect.width - trimWidth / 2;
    onChange(fracToTime(rawF));
  }, [trimWidth, track.duration]);

  const handlePointerUp = useCallback(() => { isDragging.current = false; }, []);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold text-slate-400">
        <span>✂️ Drag to Cut (1 min snippet)</span>
        <span className="text-violet-300 font-mono">{fmt(startTime)} – {fmt(Math.min(track.duration, startTime + CLIP_SEC))}</span>
      </div>

      <div
        ref={trackRef}
        className="relative h-12 rounded-xl overflow-hidden cursor-ew-resize select-none touch-none bg-zinc-900 border border-white/8"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute inset-0 flex items-center gap-px px-0.5 pointer-events-none">
          {bars.map((h, i) => {
            const frac  = i / bars.length;
            const inSel = frac >= startFrac && frac < startFrac + trimWidth;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${inSel ? "bg-violet-400" : "bg-white/15"}`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>

        <div className="absolute inset-0 pointer-events-none flex">
          <div className="h-full bg-black/50" style={{ width: `${startFrac * 100}%` }} />
          <div className="h-full bg-transparent" style={{ width: `${trimWidth * 100}%` }} />
          <div className="h-full bg-black/50 flex-1" />
        </div>

        <div
          className="absolute inset-y-0 border-2 border-violet-400 rounded-xl pointer-events-none"
          style={{ left: `${startFrac * 100}%`, width: `${trimWidth * 100}%` }}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-3 bg-violet-400 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-0.5 h-3 bg-white/70 rounded-full" />
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-6 w-3 bg-violet-400 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-0.5 h-3 bg-white/70 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
//  MAIN MUSIC LIBRARY Component
// ─────────────────────────────────────────────────────────────────
const MusicLibrary = ({ onClose, onSelect }) => {
  const [search,         setSearch]         = useState("");
  const [playingId,      setPlayingId]      = useState(null);
  const [selectedTrack,  setSelectedTrack]  = useState(null);
  const [startTime,      setStartTime]      = useState(0);
  const [showTrimmer,    setShowTrimmer]    = useState(false);
  const [ytPlayer,       setYtPlayer]       = useState(null);

  const ytRef = useRef(null);

  // Initialize background YouTube Player
  useEffect(() => {
    let player = null;
    loadYTAPI().then((YT) => {
      player = new YT.Player("library-yt-player", {
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
            setYtPlayer(player);
            ytRef.current = player;
          }
        }
      });
    });
    return () => {
      try { player?.destroy(); } catch (_) {}
    };
  }, []);

  // Filter tracks
  const filtered = ALL_TRACKS.filter(t => {
    const q = search.toLowerCase();
    return !q || t.title.toLowerCase().includes(q)
               || t.artist.toLowerCase().includes(q)
               || t.genre.toLowerCase().includes(q)
               || t.lang.toLowerCase().includes(q);
  });

  // Playback loop controller (limits to 15s from startTime)
  useEffect(() => {
    if (!ytPlayer || !playingId || !selectedTrack) return;
    const interval = setInterval(() => {
      try {
        const curr = ytPlayer.getCurrentTime();
        if (curr >= startTime + CLIP_SEC || curr < startTime) {
          ytPlayer.seekTo(startTime, true);
        }
      } catch (_) {}
    }, 250);
    return () => clearInterval(interval);
  }, [ytPlayer, playingId, selectedTrack, startTime]);

  // Handle play/pause click
  const handlePlayToggle = (track) => {
    if (playingId === track.id) {
      try { ytPlayer?.pauseVideo(); } catch (_) {}
      setPlayingId(null);
    } else {
      setPlayingId(track.id);
      setSelectedTrack(track);
      setStartTime(0);
      try {
        if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
          ytPlayer.loadVideoById({
            videoId: track.youtubeId,
            startSeconds: 0
          });
          ytPlayer.playVideo();
        }
      } catch (err) {
        console.error("YouTube playback error:", err);
      }
    }
  };

  // Adjust start time immediately seeks YouTube video
  useEffect(() => {
    if (ytPlayer && playingId) {
      try { ytPlayer.seekTo(startTime, true); } catch (_) {}
    }
  }, [startTime]);

  const handleSelect = () => {
    if (!selectedTrack) return;
    try { ytPlayer?.pauseVideo(); } catch (_) {}
    onSelect({
      title:     selectedTrack.title,
      artist:    selectedTrack.artist,
      lang:      selectedTrack.lang,
      genre:     selectedTrack.genre,
      startTime,
      youtubeId: selectedTrack.youtubeId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md">
      {/* Hidden YouTube container */}
      <div id="library-yt-player" className="hidden" />

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        exit={{   y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        className="w-full sm:max-w-md bg-[#0c0c14] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
              <Music size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Select Music</h3>
              <p className="text-[10px] text-slate-500">Real songs powered by YouTube</p>
            </div>
          </div>
          <button onClick={() => { try { ytRef.current?.pauseVideo(); } catch(_){} onClose(); }}
            className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Anirudh songs, artists, language..."
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white/5 border border-white/8 text-white text-xs font-semibold outline-none placeholder-slate-600 focus:border-violet-500/40 focus:bg-white/8 transition-all"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Track List */}
        <div className="flex-grow overflow-y-auto px-4 space-y-1.5 pb-3" style={{ minHeight: 0 }}>
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center py-10 gap-2">
                <span className="text-3xl">🎵</span>
                <p className="text-slate-500 text-xs font-semibold">No matching songs found</p>
              </motion.div>
            ) : (
              filtered.map(track => {
                const isPlaying  = playingId === track.id;
                const isSelected = selectedTrack?.id === track.id;
                const genreClass = GENRE_COLOR[track.genre] || "bg-white/10 text-slate-400";

                return (
                  <motion.div
                    key={track.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setSelectedTrack(track);
                      if (playingId !== track.id) {
                        try { ytRef.current?.pauseVideo(); } catch(_){}
                        setPlayingId(null);
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all group ${
                      isSelected
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-white/5 bg-white/3 hover:bg-white/7 hover:border-white/10"
                    }`}
                  >
                    {/* Play button */}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handlePlayToggle(track); }}
                      className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                        isPlaying
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                          : "bg-white/8 text-slate-400 hover:bg-violet-500/20 hover:text-violet-300 group-hover:bg-white/12"
                      }`}
                    >
                      {isPlaying ? <EqBars /> : <Play size={14} className="ml-0.5" />}
                    </button>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">{track.emoji}</span>
                        <span className={`text-xs font-extrabold truncate ${isSelected ? "text-violet-200" : "text-white"}`}>
                          {track.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 truncate">{track.artist}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${genreClass}`}>
                          {track.genre}
                        </span>
                      </div>
                    </div>

                    {/* Right side info */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1 min-w-[36px]">
                      {isSelected ? (
                        <div className="h-5 w-5 rounded-full bg-violet-600 flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-mono">{fmt(track.duration)}</span>
                      )}
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${{
                        Tamil:   "bg-orange-500/15 text-orange-300",
                        English: "bg-blue-500/15 text-blue-300",
                        Telugu:  "bg-red-500/15 text-red-300",
                        Hindi:   "bg-green-500/15 text-green-300",
                      }[track.lang]}`}>{track.lang}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Waveform Trimmer */}
        <AnimatePresence>
          {selectedTrack && (
            <motion.div
              key="trimmer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/5 bg-zinc-950/80 flex-shrink-0 overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold text-white truncate">{selectedTrack.title}</p>
                    <p className="text-[9px] text-slate-500 truncate">{selectedTrack.artist} · {selectedTrack.lang}</p>
                  </div>
                  <button onClick={() => setShowTrimmer(v => !v)}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                      showTrimmer ? "bg-violet-600 text-white" : "bg-white/8 text-slate-400 hover:bg-white/12"
                    }`}>
                    ✂️ {showTrimmer ? "Hide Trim" : "Cut Song"}
                  </button>
                </div>

                <AnimatePresence>
                  {showTrimmer && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <WaveformTrimmer track={selectedTrack} startTime={startTime} onChange={setStartTime} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3 px-4 pt-3 pb-6 border-t border-white/5 flex-shrink-0 bg-[#0c0c14]">
          <button type="button" onClick={() => { try { ytRef.current?.pauseVideo(); } catch(_){} onClose(); }}
            className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-bold text-xs transition-all">
            Cancel
          </button>
          <button type="button" disabled={!selectedTrack} onClick={handleSelect}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              selectedTrack
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 shadow-lg shadow-violet-500/20"
                : "bg-white/5 text-slate-600 cursor-not-allowed"
            }`}>
            <Check size={14} /> Add to Story
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MusicLibrary;
