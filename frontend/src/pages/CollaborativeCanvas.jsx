import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  Pencil, Eraser, Trash2, Download, Upload, Palette,
  Minus, Plus, Users, Copy, Check, X, Send
} from "lucide-react";

const COLORS = [
  "#ffffff", "#f87171", "#fb923c", "#fbbf24", "#a3e635",
  "#34d399", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6",
  "#000000", "#334155", "#6b7280", "#d97706", "#059669"
];

const generateRoomId = () => Math.random().toString(36).substring(2, 9).toUpperCase();

export default function CollaborativeCanvas({ navigateTo }) {
  const { currentUser, token, API_URL } = useAuth();
  const { socket } = useSocket();

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef(null);
  const roomIdRef = useRef(null);

  const [roomId, setRoomId] = useState("");
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [activeUsers, setActiveUsers] = useState([currentUser?.username]);
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState("pen"); // "pen" | "eraser"
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishCaption, setPublishCaption] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [cursors, setCursors] = useState({});

  // Create a new room
  const handleCreateRoom = useCallback(() => {
    const id = generateRoomId();
    roomIdRef.current = id;
    setRoomId(id);
    socket?.emit("create-canvas", id);
    setInRoom(true);
  }, [socket]);

  // Join existing room
  const handleJoinRoom = useCallback(() => {
    const id = joinRoomInput.trim().toUpperCase();
    if (!id) return;
    
    if (socket) {
      socket.emit("join-canvas", id, (res) => {
        if (res && res.success) {
          roomIdRef.current = id;
          setRoomId(id);
          setInRoom(true);
        } else {
          alert(res?.message || "Invalid Room ID");
        }
      });
    } else {
      alert("Connection to server is not established. Please try again.");
    }
  }, [socket, joinRoomInput]);

  // Copy room ID
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get canvas position relative to canvas element
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Draw a stroke on the canvas
  const drawStroke = useCallback((ctx, from, to, strokeColor, size, isEraser) => {
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : strokeColor;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  // Mouse/touch down
  const handlePointerDown = useCallback((e) => {
    if (!inRoom) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e, canvas);
  }, [inRoom]);

  // Mouse/touch move
  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current || !inRoom) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const currentPos = getPos(e, canvas);
    const from = lastPosRef.current;

    drawStroke(ctx, from, currentPos, color, brushSize, tool === "eraser");

    // Emit stroke to other users
    socket?.emit("canvas-draw", {
      roomId: roomIdRef.current,
      from,
      to: currentPos,
      color,
      brushSize,
      isEraser: tool === "eraser"
    });

    // Emit cursor
    socket?.emit("canvas-cursor", {
      roomId: roomIdRef.current,
      username: currentUser?.username,
      x: currentPos.x,
      y: currentPos.y
    });

    lastPosRef.current = currentPos;
  }, [inRoom, color, brushSize, tool, socket, currentUser, drawStroke]);

  // Mouse/touch up
  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  // Clear canvas
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket?.emit("canvas-clear", roomIdRef.current);
  }, [socket]);

  // Download canvas
  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `vibe-canvas-${roomId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Publish canvas as a post
  const handlePublish = async () => {
    if (!publishCaption.trim()) return;
    setPublishing(true);
    try {
      const canvas = canvasRef.current;
      const base64 = canvas.toDataURL("image/jpeg", 0.92);

      // Convert base64 to blob
      const res = await fetch(base64);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append("file", blob, `canvas-${roomId}.jpg`);
      formData.append("caption", publishCaption);
      formData.append("postType", "image");
      formData.append("mediaType", "image");

      const response = await fetch(`${API_URL}/posts/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) throw new Error("Failed to publish");

      setShowPublishModal(false);
      setPublishCaption("");
      alert("Canvas published to your feed!");
      navigateTo("feed");
    } catch (err) {
      alert("Error publishing canvas: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Initialize canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onDraw = ({ from, to, color: c, brushSize: bs, isEraser }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      drawStroke(ctx, from, to, c, bs, isEraser);
    };

    const onClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const onCursor = ({ username, x, y }) => {
      setCursors(prev => ({ ...prev, [username]: { x, y } }));
    };

    socket.on("canvas-draw", onDraw);
    socket.on("canvas-clear", onClear);
    socket.on("canvas-cursor", onCursor);

    return () => {
      socket.off("canvas-draw", onDraw);
      socket.off("canvas-clear", onClear);
      socket.off("canvas-cursor", onCursor);
    };
  }, [socket, drawStroke]);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/20 bg-[#12122a]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo("feed")}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              🎨 Collab Canvas
            </h1>
            {inRoom && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-400">Room:</span>
                <span className="text-[11px] font-bold text-violet-300">{roomId}</span>
                <button onClick={handleCopyRoomId} className="text-slate-400 hover:text-violet-300 transition-colors">
                  {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                </button>
              </div>
            )}
          </div>
        </div>
        {inRoom && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Users size={13} className="text-violet-400" />
              <span className="text-xs text-slate-300">Live</span>
            </div>
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              title="Download"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-xs transition-all shadow-lg"
            >
              <Upload size={14} />
              Publish
            </button>
          </div>
        )}
      </div>

      {/* Room Join/Create screen */}
      {!inRoom ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="text-6xl">🎨</div>
              <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Collab Canvas
              </h2>
              <p className="text-slate-400 text-sm">Draw together in real-time with your friends</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-sm transition-all shadow-xl shadow-violet-900/40"
              >
                ✨ Create New Canvas Room
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-slate-500 text-xs font-semibold">or join existing</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinRoomInput}
                  onChange={e => setJoinRoomInput(e.target.value.toUpperCase())}
                  placeholder="Enter Room ID (e.g. AB3X9K2)"
                  maxLength={7}
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none text-sm placeholder-slate-500 focus:border-violet-500/50 font-mono tracking-widest"
                  onKeyDown={e => e.key === "Enter" && handleJoinRoom()}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={joinRoomInput.length < 7}
                  className="px-4 py-3 rounded-2xl bg-violet-600/80 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold text-sm"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Canvas + Toolbar */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[#12122a]/60 border-b border-white/5 flex-wrap">
            {/* Tool selector */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => setTool("pen")}
                className={`p-2 rounded-lg transition-all ${tool === "pen" ? "bg-violet-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                title="Pen"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setTool("eraser")}
                className={`p-2 rounded-lg transition-all ${tool === "eraser" ? "bg-violet-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                title="Eraser"
              >
                <Eraser size={16} />
              </button>
            </div>

            {/* Brush size */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => setBrushSize(s => Math.max(1, s - 2))}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="text-xs font-bold text-slate-300 w-5 text-center">{brushSize}</span>
              <button
                onClick={() => setBrushSize(s => Math.min(60, s + 2))}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Color picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 hover:border-violet-500/40 transition-colors"
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-white/30 shadow-lg"
                  style={{ backgroundColor: color }}
                />
                <Palette size={14} className="text-slate-400" />
              </button>
              {showColorPicker && (
                <div className="absolute top-full mt-2 left-0 z-50 p-3 rounded-2xl bg-[#1e1e3a] border border-white/10 shadow-2xl">
                  <div className="grid grid-cols-5 gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => { setColor(c); setShowColorPicker(false); }}
                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${c === color ? "border-violet-400 scale-110" : "border-white/20"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="mt-2 w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                </div>
              )}
            </div>

            {/* Clear */}
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 rounded-xl border border-rose-500/20 hover:border-rose-500/40 transition-all text-rose-400 text-xs font-bold"
            >
              <Trash2 size={14} />
              Clear All
            </button>

            {/* Current color indicator */}
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
              <span className="hidden sm:inline">Drawing as</span>
              <span className="font-bold text-violet-300">{currentUser?.username}</span>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#0f0f1a] p-2">
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              className="rounded-2xl shadow-2xl border border-white/10 touch-none cursor-crosshair"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
            {/* Remote cursors overlay */}
            {Object.entries(cursors).map(([uname, pos]) =>
              uname !== currentUser?.username ? (
                <div
                  key={uname}
                  className="absolute pointer-events-none"
                  style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-3 h-3 rounded-full bg-fuchsia-400 border-2 border-white shadow-lg" />
                  <span className="absolute left-4 top-0 text-[10px] bg-fuchsia-600 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap font-bold">
                    {uname}
                  </span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#1a1a2e] border border-violet-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-base tracking-tight">Publish Canvas</h3>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400">Your canvas artwork will be posted to your feed as an image.</p>
            <textarea
              value={publishCaption}
              onChange={e => setPublishCaption(e.target.value)}
              placeholder="Add a caption for your artwork..."
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 outline-none text-sm placeholder-slate-500 min-h-[80px] resize-none focus:border-violet-500/50"
            />
            <button
              onClick={handlePublish}
              disabled={publishing || !publishCaption.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {publishing ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : <Send size={15} />}
              {publishing ? "Publishing..." : "Publish to Feed"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
