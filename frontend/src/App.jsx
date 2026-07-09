import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AnimatePresence } from "framer-motion";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import OtpVerification from "./pages/OtpVerification";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Reels from "./pages/Reels";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import Notifications from "./pages/Notifications";
import CollaborativeCanvas from "./pages/CollaborativeCanvas";

// Layout Elements
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import PostDetailModal from "./components/PostDetailModal";

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [view, setView] = useState(() => localStorage.getItem("vibe_view") || "feed"); // feed, explore, reels, chat, profile, notifications
  const [targetId, setTargetId] = useState(() => localStorage.getItem("vibe_targetId") || null); // Used for viewing other user profiles
  const [authScreen, setAuthScreen] = useState("login"); // login, register, forgot, otp
  const [resetEmail, setResetEmail] = useState("");
  const [selectedPostId, setSelectedPostId] = useState(null);

  // Digital Wellbeing Screen Time Alert state
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [showTimeAlert, setShowTimeAlert] = useState(false);
  const [alertDismissedTime, setAlertDismissedTime] = useState(null);

  React.useEffect(() => {
    if (!currentUser || !currentUser.screenTimeLimit || currentUser.screenTimeLimit <= 0) {
      setActiveSeconds(0);
      setShowTimeAlert(false);
      return;
    }

    const timer = setInterval(() => {
      setActiveSeconds(prev => {
        const next = prev + 1;
        const limitSeconds = currentUser.screenTimeLimit * 60;
        
        if (next >= limitSeconds && !showTimeAlert && !alertDismissedTime) {
          setShowTimeAlert(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser, showTimeAlert, alertDismissedTime]);

  const handleExtendLimit = () => {
    setActiveSeconds(prev => Math.max(0, prev - 15 * 60));
    setShowTimeAlert(false);
  };

  const handleDismissAlert = () => {
    setAlertDismissedTime(Date.now());
    setShowTimeAlert(false);
  };

  const navigateTo = (viewName, id = null) => {
    if (viewName === "post") {
      setSelectedPostId(id);
    } else {
      if (viewName === "feed" && view === "feed") {
        window.dispatchEvent(new CustomEvent("refresh-feed"));
      }
      setView(viewName);
      setTargetId(id);
      localStorage.setItem("vibe_view", viewName);
      if (id) {
        localStorage.setItem("vibe_targetId", id);
      } else {
        localStorage.removeItem("vibe_targetId");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading VibeShare...</p>
      </div>
    );
  }

  // Not Authenticated
  if (!currentUser) {
    if (authScreen === "register") {
      return <Register setScreen={setAuthScreen} />;
    } else if (authScreen === "forgot") {
      return <ForgotPassword setScreen={setAuthScreen} setEmail={setResetEmail} />;
    } else if (authScreen === "otp") {
      return <OtpVerification setScreen={setAuthScreen} email={resetEmail} />;
    }
    return <Login setScreen={setAuthScreen} />;
  }

  // Authenticated Portal
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex w-full relative">
      {/* Background Decorative Globs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-[45vw] h-[45vw] rounded-full aurora-glow-1 animate-float opacity-70"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[45vw] h-[45vw] rounded-full aurora-glow-2 animate-float opacity-60" style={{ animationDelay: "-3s" }}></div>
        <div className="absolute top-[40%] right-[30%] w-[30vw] h-[30vw] rounded-full aurora-glow-3 animate-float opacity-50" style={{ animationDelay: "-6s" }}></div>
      </div>

      <div className="relative z-10 flex w-full min-h-screen">
        {/* Desktop Left Sidebar */}
        <Sidebar currentView={view} navigateTo={navigateTo} />

        {/* Main Feed/Content Pane */}
        <main className="flex-1 flex flex-col pb-16 md:pb-0 md:ml-64 xl:ml-72 min-h-screen max-w-full overflow-hidden">
          {view === "feed" && <Feed navigateTo={navigateTo} />}
          {view === "explore" && <Explore navigateTo={navigateTo} />}
          {view === "reels" && <Reels navigateTo={navigateTo} />}
          {view === "chat" && <Chat navigateTo={navigateTo} targetChatId={targetId} />}
          {view === "profile" && <Profile navigateTo={navigateTo} userId={targetId || currentUser._id} initialTab="posts" />}
          {view === "settings" && <Settings navigateTo={navigateTo} />}
          {view === "notifications" && <Notifications navigateTo={navigateTo} />}
          {view === "canvas" && <CollaborativeCanvas navigateTo={navigateTo} />}
        </main>

        {/* Mobile Bottom Navbar */}
        <BottomNav currentView={view} navigateTo={navigateTo} />

        {/* Post Detail Modal Overlay */}
        <AnimatePresence>
          {selectedPostId && (
            <PostDetailModal 
              postId={selectedPostId} 
              onClose={() => setSelectedPostId(null)} 
              navigateTo={navigateTo}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Digital Wellbeing Screen Time Alert Modal */}
      {showTimeAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
          <div className="w-full max-w-md bg-zinc-950/95 p-8 rounded-3xl border border-slate-200/10 dark:border-zinc-800 shadow-2xl text-center flex flex-col items-center gap-5">
            <div className="h-16 w-16 bg-violet-500/10 text-violet-550 dark:text-violet-400 rounded-full flex items-center justify-center animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Time for a Break! 🌸</h2>
              <p className="text-sm font-bold text-violet-500 uppercase tracking-widest text-[9px]">Digital Wellbeing Alert</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                You've been surfing VibeShare for <strong className="text-slate-700 dark:text-slate-250">{currentUser.screenTimeLimit} minutes</strong>. Let's take a quick stretch, rest your eyes, and grab a glass of water! 💧
              </p>
            </div>

            <div className="flex flex-col gap-2.5 w-full mt-4">
              <button
                onClick={handleExtendLimit}
                className="w-full py-3 bg-vibe-gradient text-white rounded-2xl font-bold text-xs shadow-md hover:opacity-95 transition-all"
              >
                Extend for 15 Minutes
              </button>
              <button
                onClick={handleDismissAlert}
                className="w-full py-3 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-350 hover:bg-slate-205 dark:hover:bg-zinc-800 rounded-2xl font-semibold text-xs transition-all"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
