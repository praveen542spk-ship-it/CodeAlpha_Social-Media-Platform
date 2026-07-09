import React from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import { 
  Home, Compass, Film, MessageCircle, Bell, 
  PlusSquare, User, LogOut, Sun, Moon, Settings, Sparkles
} from "lucide-react";

// const Sidebar ... (lines omitted for context, we do the full edit)

const Sidebar = ({ currentView, navigateTo }) => {
  const { currentUser, logout, token, refreshCurrentUser, API_URL } = useAuth();
  const { notifications, clearNotifications } = useSocket();
  const { darkMode, toggleDarkMode } = useTheme();

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const handleNotificationsClick = () => {
    navigateTo("notifications");
    // Clear notifications on click
    clearNotifications();
  };

  const avatarUrl = currentUser.profilePic 
    ? currentUser.profilePic 
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.username)}&backgroundType=gradientLinear`;

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 xl:w-72 border-r border-[var(--border-color)] bg-white/60 dark:bg-[#07060f]/60 backdrop-blur-2xl z-30 p-6 justify-between">
      <div className="flex flex-col gap-8">
        <div 
          onClick={() => navigateTo("feed")}
          className="flex items-center gap-2.5 text-2xl font-syne font-extrabold tracking-tight bg-vibe-gradient bg-clip-text text-transparent select-none cursor-pointer"
        >
          <Sparkles className="text-violet-500 dark:text-violet-400" size={24} />
          <span>VibeShare</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => navigateTo("feed")}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${currentView === "feed" ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-semibold" : "hover:bg-violet-500/5 dark:hover:bg-violet-400/5 text-slate-600 dark:text-slate-300"}`}
          >
            <Home size={22} />
            <span>Home</span>
          </button>

          <button 
            onClick={() => navigateTo("explore")}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${currentView === "explore" ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-semibold" : "hover:bg-violet-500/5 dark:hover:bg-violet-400/5 text-slate-600 dark:text-slate-300"}`}
          >
            <Compass size={22} />
            <span>Explore</span>
          </button>

          <button 
            onClick={() => navigateTo("reels")}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${currentView === "reels" ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-semibold" : "hover:bg-violet-500/5 dark:hover:bg-violet-400/5 text-slate-600 dark:text-slate-300"}`}
          >
            <Film size={22} />
            <span>Reels</span>
          </button>

          <button 
            onClick={() => navigateTo("chat")}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${currentView === "chat" ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-semibold" : "hover:bg-violet-500/5 dark:hover:bg-violet-400/5 text-slate-600 dark:text-slate-300"}`}
          >
            <MessageCircle size={22} />
            <span>Messages</span>
          </button>

          {/* Notifications Button */}
          <button 
            onClick={handleNotificationsClick}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${currentView === "notifications" ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-semibold" : "hover:bg-violet-500/5 dark:hover:bg-violet-400/5 text-slate-600 dark:text-slate-300"}`}
          >
            <div className="flex items-center gap-4">
              <Bell size={22} />
              <span>Notifications</span>
            </div>
            {unreadNotifications > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                {unreadNotifications}
              </span>
            )}
          </button>

          <button 
            onClick={() => navigateTo("profile")}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${currentView === "profile" ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-semibold" : "hover:bg-violet-500/5 dark:hover:bg-violet-400/5 text-slate-600 dark:text-slate-300"}`}
          >
            <img src={avatarUrl} alt="Avatar" className="h-6 w-6 rounded-full object-cover border border-violet-500/30" />
            <span>Profile</span>
          </button>
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        {/* Theme Toggle */}
        <button 
          onClick={toggleDarkMode}
          className="flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-violet-500/5 dark:hover:bg-violet-400/5 transition-all duration-300 w-full"
        >
          {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {/* Settings */}
        <button 
          onClick={() => navigateTo("settings")}
          className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 w-full ${currentView === "settings" ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-semibold" : "hover:bg-violet-500/5 dark:hover:bg-violet-400/5 text-slate-600 dark:text-slate-300"}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>

        {/* Log Out */}
        <button 
          onClick={logout}
          className="flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-rose-500 hover:bg-rose-500/10 transition-all duration-300 w-full"
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
