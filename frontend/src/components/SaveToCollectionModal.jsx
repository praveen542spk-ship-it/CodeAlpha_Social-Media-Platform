import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Folder, Plus, X } from "lucide-react";

const SaveToCollectionModal = ({ post, onClose }) => {
  const { currentUser, token, refreshCurrentUser, API_URL } = useAuth();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showCreateField, setShowCreateField] = useState(false);

  if (!post) return null;

  const collections = currentUser.savedCollections || [];

  const handleTogglePostInCollection = async (collectionName, isCurrentlyAdded) => {
    const endpoint = isCurrentlyAdded ? "/users/collections/remove" : "/users/collections/add";
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ collectionName, postId: post._id })
      });
      if (res.ok) {
        await refreshCurrentUser();
      }
    } catch (err) {
      console.error("Error toggling post in collection:", err);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/users/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ name: newCollectionName.trim() })
      });
      if (res.ok) {
        await refreshCurrentUser();
        // Automatically add the post to the newly created collection
        await handleTogglePostInCollection(newCollectionName.trim(), false);
        setNewCollectionName("");
        setShowCreateField(false);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to create collection");
      }
    } catch (err) {
      console.error("Error creating collection:", err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm glass-panel p-6 rounded-3xl shadow-2xl relative flex flex-col gap-4 text-left border border-slate-200/50 dark:border-zinc-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Folder size={18} className="text-violet-500" />
            <span>Save to Collection</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-slate-500 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-normal">
          Select folders to organize this post:
        </p>

        {/* Collections List */}
        <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
          {collections.length === 0 ? (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-6">No collections created yet.</p>
          ) : (
            collections.map(col => {
              const isAdded = col.posts?.includes(post._id);
              return (
                <div 
                  key={col._id || col.name}
                  onClick={() => handleTogglePostInCollection(col.name, isAdded)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    isAdded 
                      ? "border-violet-500 bg-violet-500/5 text-violet-500 dark:text-violet-400"
                      : "border-slate-150 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/10 hover:bg-slate-50 dark:hover:bg-zinc-900/30 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder size={16} className={isAdded ? "text-violet-500" : "text-slate-400"} />
                    <span className="text-xs font-semibold truncate">{col.name}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={!!isAdded}
                    readOnly
                    className="h-4.5 w-4.5 rounded border-slate-350 text-violet-600 focus:ring-violet-500 accent-violet-500 cursor-pointer pointer-events-none"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Create Field Toggle */}
        {!showCreateField ? (
          <button 
            onClick={() => setShowCreateField(true)}
            className="flex items-center justify-center gap-2 p-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-850 hover:border-violet-500 hover:bg-violet-500/5 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all w-full"
          >
            <Plus size={14} />
            <span>Create New Collection</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Folder name..." 
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs font-semibold outline-none focus:border-violet-500 text-slate-800 dark:text-slate-200"
            />
            <button 
              onClick={handleCreateCollection}
              className="px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Add
            </button>
            <button 
              onClick={() => { setShowCreateField(false); setNewCollectionName(""); }}
              className="px-3 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        <button 
          onClick={onClose}
          className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold text-xs shadow-md transition-all mt-1"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default SaveToCollectionModal;
