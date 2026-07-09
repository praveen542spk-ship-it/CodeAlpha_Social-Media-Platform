import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Search, Compass, Heart, MessageCircle, ArrowLeft } from "lucide-react";

const Explore = ({ navigateTo }) => {
  const { token, API_URL } = useAuth();
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);

  const loadExploreFeed = async (searchQuery = "") => {
    setLoading(true);
    try {
      const headers = { "Authorization": token };
      // Fetch matching explore posts
      const res = await fetch(`${API_URL}/posts/explore?q=${encodeURIComponent(searchQuery)}`, { headers });
      if (res.ok) setPosts(await res.json());

      // If searching, also search users
      if (searchQuery.trim() && !searchQuery.startsWith("#")) {
        const userRes = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(searchQuery)}`, { headers });
        if (userRes.ok) setUsers(await userRes.json());
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExploreFeed();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowResults(true);
    loadExploreFeed(query);
  };

  const handleClearSearch = () => {
    setQuery("");
    setShowResults(false);
    setUsers([]);
    loadExploreFeed("");
  };

  const getAvatarUrl = (user) => {
    return user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}&backgroundType=gradientLinear`;
  };

  return (
    <div className="w-full min-h-screen px-4 py-6 max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full gap-3">
        {showResults && (
          <button 
            type="button" 
            onClick={handleClearSearch} 
            className="p-3 glass-panel rounded-2xl text-slate-500 hover:text-violet-500 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, hashtags (#vibe), or keywords..."
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border vibe-input-field outline-none transition-all text-sm font-semibold"
          />
        </div>
        <button 
          type="submit" 
          className="px-6 py-3.5 bg-violet-500 text-white font-semibold rounded-2xl text-sm shadow-md active:scale-95 transition-all"
        >
          Search
        </button>
      </form>

      {/* Suggested Users Search Results */}
      {showResults && users.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Accounts Found</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {users.map(u => (
              <div 
                key={u._id} 
                onClick={() => navigateTo("profile", u._id)}
                className="flex items-center gap-3 p-3.5 glass-panel rounded-2xl shadow-sm cursor-pointer hover:bg-white/60 dark:hover:bg-black/20 transition-all"
              >
                <img src={getAvatarUrl(u)} className="h-10 w-10 rounded-full object-cover" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-tight">{u.username}</span>
                  <span className="text-xs text-slate-500 truncate max-w-[150px]">{u.bio || "Spread vibes"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Header */}
      <div className="flex items-center gap-2 border-b border-slate-200/40 dark:border-slate-800/40 pb-3 mt-2">
        <Compass size={20} className="text-violet-500" />
        <h2 className="font-extrabold text-lg">
          {showResults ? `Search Results for "${query}"` : "Trending Vibes"}
        </h2>
      </div>

      {/* Posts 3-Column Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-violet-500 border-t-transparent"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center p-12 glass-panel rounded-3xl">
          <Compass className="mx-auto mb-4 text-slate-400" size={36} />
          <h3 className="text-md font-bold">No trending content found</h3>
          <p className="text-slate-500 text-xs mt-1">Try adjusting your search query or upload something new!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {posts.map(post => {
            const hasMedia = post.mediaUrl && post.mediaType !== "none";

            return (
              <div 
                key={post._id} 
                onClick={() => navigateTo("post", post._id)}
                className="relative aspect-square rounded-2xl overflow-hidden glass-panel group cursor-pointer border border-slate-200/50 dark:border-slate-800/50 shadow-sm"
              >
                {/* Media representation */}
                {hasMedia ? (
                  post.mediaType === "image" ? (
                    <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <video src={post.mediaUrl} className="w-full h-full object-cover" muted loop playsInline />
                  )
                ) : (
                  <div className="w-full h-full p-4 flex items-center justify-center bg-gradient-to-br from-aurora-lavender to-aurora-mint dark:from-violet-950/20 dark:to-teal-950/20 text-center font-semibold text-xs leading-relaxed text-slate-700 dark:text-slate-200 overflow-hidden text-ellipsis">
                    {post.caption}
                  </div>
                )}

                {/* Overlay statistics on hover */}
                <div className="absolute inset-0 bg-violet-600/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 text-white font-bold text-sm transition-all duration-300">
                  <span className="flex items-center gap-1.5"><Heart size={16} className="fill-white" /> {post.likes.length}</span>
                  <span className="flex items-center gap-1.5"><MessageCircle size={16} /> View</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Explore;
