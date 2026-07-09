import React from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Home, Compass, Film, MessageCircle, User } from "lucide-react";

const BottomNav = ({ currentView, navigateTo }) => {
  const { currentUser } = useAuth();
  const { notifications } = useSocket();

  const unreadMessages = notifications.filter(n => n.type === "message" && !n.isRead).length;

  const avatarUrl = currentUser.profilePic 
    ? currentUser.profilePic 
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.username)}&backgroundType=gradientLinear`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 border-t border-[var(--border-color)] bg-white/70 dark:bg-[#07060f]/60 backdrop-blur-2xl z-30 flex items-center justify-around px-4">
      <button 
        onClick={() => navigateTo("feed")}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${currentView === "feed" ? "text-violet-500" : "text-slate-500"}`}
      >
        <Home size={22} />
      </button>

      <button 
        onClick={() => navigateTo("explore")}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${currentView === "explore" ? "text-violet-500" : "text-slate-500"}`}
      >
        <Compass size={22} />
      </button>

      <button 
        onClick={() => navigateTo("reels")}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${currentView === "reels" ? "text-violet-500" : "text-slate-500"}`}
      >
        <Film size={22} />
      </button>

      <button 
        onClick={() => navigateTo("chat")}
        className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${currentView === "chat" ? "text-violet-500" : "text-slate-500"}`}
      >
        <MessageCircle size={22} />
        {unreadMessages > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unreadMessages}
          </span>
        )}
      </button>

      <button 
        onClick={() => navigateTo("profile")}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${currentView === "profile" ? "text-violet-500" : "text-slate-500"}`}
      >
        <img 
          src={avatarUrl} 
          alt="Profile" 
          className={`h-6 w-6 rounded-full object-cover border ${currentView === "profile" ? "border-violet-500" : "border-transparent"}`}
        />
      </button>
    </nav>
  );
};

export default BottomNav;
