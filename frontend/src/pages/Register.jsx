import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Lock, Mail, User, CheckCircle, XCircle, Loader } from "lucide-react";

const Register = ({ setScreen }) => {
  const { register, API_URL } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken" | "short"
  const [usernameMessage, setUsernameMessage] = useState("");
  const debounceTimer = useRef(null);

  // Check username availability with debounce
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmed = username.trim();

    if (trimmed.length === 0) {
      setUsernameStatus(null);
      setUsernameMessage("");
      return;
    }

    if (trimmed.length < 3) {
      setUsernameStatus("short");
      setUsernameMessage("Username must be at least 3 characters.");
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage("Checking availability...");

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.available) {
          setUsernameStatus("available");
          setUsernameMessage(data.message);
        } else {
          setUsernameStatus("taken");
          setUsernameMessage(data.message);
        }
      } catch (err) {
        setUsernameStatus(null);
        setUsernameMessage("");
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [username, API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    if (usernameStatus === "taken" || usernameStatus === "short") return;
    setError("");
    setLoading(true);

    try {
      await register(username, email, password);
      setScreen("otp");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case "checking":
        return <Loader size={16} className="animate-spin text-violet-400" />;
      case "available":
        return <CheckCircle size={16} className="text-emerald-500" />;
      case "taken":
        return <XCircle size={16} className="text-rose-500" />;
      case "short":
        return <XCircle size={16} className="text-amber-500" />;
      default:
        return null;
    }
  };

  const getUsernameStatusColor = () => {
    switch (usernameStatus) {
      case "available": return "text-emerald-500";
      case "taken": return "text-rose-500";
      case "short": return "text-amber-500";
      case "checking": return "text-violet-400";
      default: return "text-slate-400";
    }
  };

  const getUsernameBorderColor = () => {
    switch (usernameStatus) {
      case "available": return "border-emerald-500/50 focus:border-emerald-500";
      case "taken": return "border-rose-500/50 focus:border-rose-500";
      case "short": return "border-amber-500/50 focus:border-amber-500";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] px-4 relative overflow-hidden">
      {/* Background Decorative Globs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full aurora-glow-1 animate-float opacity-70"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full aurora-glow-2 animate-float opacity-60" style={{ animationDelay: "-3s" }}></div>
      </div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl relative z-10">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-syne font-extrabold tracking-tight bg-vibe-gradient bg-clip-text text-transparent inline-block">
            VibeShare
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            Join VibeShare today and connect.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                placeholder="choose_username"
                className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border vibe-input-field outline-none transition-all text-[14.5px] font-medium ${getUsernameBorderColor()}`}
              />
              {/* Status Icon */}
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                {getUsernameStatusIcon()}
              </span>
            </div>
            {/* Username availability message */}
            {usernameMessage && (
              <div className={`flex items-center gap-1.5 pl-1 mt-1 ${getUsernameStatusColor()}`}>
                <span className="text-[11px] font-semibold">{usernameMessage}</span>
              </div>
            )}
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border vibe-input-field outline-none transition-all text-[14.5px] font-medium"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3.5 rounded-2xl border vibe-input-field outline-none transition-all text-[14.5px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={loading || usernameStatus === "taken" || usernameStatus === "short" || usernameStatus === "checking"}
            className={`w-full py-4 rounded-2xl bg-vibe-gradient hover:opacity-95 text-white font-semibold text-[15px] shadow-lg shadow-violet-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${
              (usernameStatus === "taken" || usernameStatus === "short") ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <button
            onClick={() => setScreen("login")}
            className="text-violet-500 dark:text-violet-400 hover:underline font-bold"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
