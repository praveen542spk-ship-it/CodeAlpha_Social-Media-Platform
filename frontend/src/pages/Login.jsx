import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowLeft } from "lucide-react";

const Login = ({ setScreen }) => {
  const { login, verify2FA } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA States
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res && res.requires2FA) {
        setRequires2FA(true);
        setSimulatedOtp(res.otp || "");
      }
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!otpCode) return;
    setError("");
    setLoading(true);

    try {
      await verify2FA(email, otpCode);
    } catch (err) {
      setError(err.message || "Invalid 2FA code. Please try again.");
    } finally {
      setLoading(false);
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
            {requires2FA ? "Security Verification" : "Sign in to share your vibe with the world."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {requires2FA ? (
          /* 2FA Form Panel */
          <form onSubmit={handleVerify2FA} className="space-y-5">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold text-center leading-normal">
              Two-Factor Authentication (2FA) is enabled for your account. Please enter the 6-digit code.
            </div>

            {simulatedOtp && (
              <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Simulated 2FA Code (Demo Mode)</span>
                <span className="text-lg font-mono font-extrabold text-violet-500 select-all tracking-widest">{simulatedOtp}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-violet-500" /> Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center py-4 rounded-2xl border vibe-input-field outline-none transition-all text-xl font-mono tracking-[0.4em] font-extrabold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-vibe-gradient hover:opacity-95 text-white font-semibold text-[15px] shadow-lg shadow-violet-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Verify Code"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setOtpCode("");
                setSimulatedOtp("");
                setError("");
              }}
              className="w-full py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 rounded-xl text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        ) : (
          /* Normal Sign In Form */
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex justify-between items-center pl-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setScreen("forgot")}
                  className="text-xs font-bold text-violet-500 dark:text-violet-400 hover:underline"
                >
                  Forgot?
                </button>
              </div>
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

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-vibe-gradient hover:opacity-95 text-white font-semibold text-[15px] shadow-lg shadow-violet-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        {!requires2FA && (
          <div className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            New to VibeShare?{" "}
            <button
              onClick={() => setScreen("register")}
              className="text-violet-500 dark:text-violet-400 hover:underline font-bold"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
