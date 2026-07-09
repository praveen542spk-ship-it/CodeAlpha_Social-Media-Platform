import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(true);

  // Sync token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  // Load profile on start if token exists
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/users/profile`, {
          headers: {
            "Authorization": token,
            "Content-Type": "application/json"
          }
        });
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        } else {
          // Token expired or invalid
          setToken("");
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    if (data.token) {
      setToken(data.token);
    }
    return data;
  };

  const verify2FA = async (email, code) => {
    const res = await fetch(`${API_URL}/auth/login/2fa-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Verification failed");
    if (data.token) {
      setToken(data.token);
    }
    return data;
  };

  const register = async (username, email, password) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    return data;
  };

  const logout = () => {
    setToken("");
    setCurrentUser(null);
    localStorage.removeItem("vibe_view");
    localStorage.removeItem("vibe_targetId");
  };

  const updateProfile = async (bio, profilePic, coverPic, websiteLinks) => {
    const res = await fetch(`${API_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bio, profilePic, coverPic, websiteLinks })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update profile");
    setCurrentUser(data);
    return data;
  };

  const togglePrivacy = async () => {
    const res = await fetch(`${API_URL}/users/privacy`, {
      method: "PUT",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to toggle privacy");
    setCurrentUser(prev => ({ ...prev, isPrivate: data.isPrivate }));
    return data;
  };

  const blockUser = async (userId) => {
    const res = await fetch(`${API_URL}/users/block/${userId}`, {
      method: "PUT",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to block user");
    
    // Refresh user profile details locally
    const profileRes = await fetch(`${API_URL}/users/profile`, {
      headers: { "Authorization": token }
    });
    if (profileRes.ok) {
      setCurrentUser(await profileRes.json());
    }
    return data;
  };

  const forgotPassword = async (email) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Forgot password query failed");
    return data;
  };

  const verifyOtp = async (email, otp, newPassword) => {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "OTP verification failed");
    return data;
  };

  const fetchUserProfile = async (userId) => {
    const res = await fetch(`${API_URL}/users/profile/${userId}`, {
      headers: { "Authorization": token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch user");
    return data;
  };

  // Follow / Unfollow actions
  const toggleFollowUser = async (userId, isFollowing) => {
    const endpoint = isFollowing ? `/users/unfollow/${userId}` : `/users/follow/${userId}`;
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Authorization": token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Follow toggle failed");
    
    await refreshCurrentUser();
    return data;
  };

  const refreshCurrentUser = async () => {
    if (!token) return;
    try {
      const profileRes = await fetch(`${API_URL}/users/profile`, {
        headers: { "Authorization": token }
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setCurrentUser(data);
        return data;
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      token,
      loading,
      login,
      verify2FA,
      register,
      logout,
      updateProfile,
      togglePrivacy,
      blockUser,
      forgotPassword,
      verifyOtp,
      fetchUserProfile,
      toggleFollowUser,
      refreshCurrentUser,
      API_URL
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
