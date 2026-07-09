import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { KeyRound, Lock } from "lucide-react";

const OtpVerification = ({ setScreen, email }) => {
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return;
    setError("");
    setLoading(true);

    try {
      await verifyOtp(email, otp, newPassword);
      setSuccess(true);
      setTimeout(() => {
        setScreen("login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Invalid OTP code or password constraints.");
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-syne font-extrabold tracking-tight bg-vibe-gradient bg-clip-text text-transparent inline-block">
            Verify Code
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            Enter the 6-digit code sent to <span className="font-bold">{email}</span>.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm text-center font-medium">
            Verification success! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* OTP Code input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              Verification Code
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                <KeyRound size={18} />
              </span>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border vibe-input-field outline-none transition-all text-center tracking-[8px] text-[18px] font-bold"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border vibe-input-field outline-none transition-all text-[14.5px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-4 rounded-2xl bg-vibe-gradient hover:opacity-95 text-white font-semibold text-[15px] shadow-lg shadow-violet-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Didn't receive code?{" "}
          <button
            onClick={() => setScreen("forgot")}
            className="text-violet-500 dark:text-violet-400 hover:underline font-bold"
          >
            Resend Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
