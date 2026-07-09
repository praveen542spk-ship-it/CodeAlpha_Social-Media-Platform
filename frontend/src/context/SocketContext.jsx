import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { currentUser, token, API_URL } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeChatMessages, setActiveChatMessages] = useState([]);
  const [activeGroupMessages, setActiveGroupMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> boolean

  // --- Calling States ---
  const [call, setCall] = useState({}); // details about active call
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callType, setCallType] = useState("video"); // "video" or "audio"

  const resetCallState = () => {
    setCallAccepted(false);
    setCallEnded(false);
    setReceivingCall(false);
    setCaller("");
    setCallerSignal(null);
    setCall({});
  };

  useEffect(() => {
    if (!token || !currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to backend socket server
    const socketInstance = io(API_URL.replace("/api", ""));
    setSocket(socketInstance);

    // Register user details
    socketInstance.emit("register-user", currentUser._id);

    // Socket listeners
    socketInstance.on("update-online-users", (users) => {
      setOnlineUsers(users);
    });

    socketInstance.on("receive-message", (message) => {
      // Append to active chat if message belongs to current chat session
      setActiveChatMessages((prev) => {
        // Prevent duplicate appending
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    });

    socketInstance.on("receive-group-message", (message) => {
      // Append to active group chat if message belongs to current session
      setActiveGroupMessages((prev) => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    });

    socketInstance.on("message-deleted", (data) => {
      const { messageId } = data;
      setActiveChatMessages((prev) => prev.filter(m => m._id !== messageId));
    });

    socketInstance.on("group-message-deleted", (data) => {
      const { messageId } = data;
      setActiveGroupMessages((prev) => prev.filter(m => m._id !== messageId));
    });

    socketInstance.on("messages-bulk-deleted", (data) => {
      const { messageIds } = data;
      setActiveChatMessages((prev) => prev.filter(m => !messageIds.includes(m._id)));
    });

    socketInstance.on("group-messages-bulk-deleted", (data) => {
      const { messageIds } = data;
      setActiveGroupMessages((prev) => prev.filter(m => !messageIds.includes(m._id)));
    });

    socketInstance.on("typing-status-update", (data) => {
      const { senderId, isTyping } = data;
      setTypingUsers((prev) => ({
        ...prev,
        [senderId]: isTyping
      }));
    });

    socketInstance.on("receive-notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    // --- Call Sockets ---
    socketInstance.on("incoming-call", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
      setCallType(data.isVideo ? "video" : "audio");
      setCall({ isReceiving: true, from: data.from, name: data.name, isVideo: data.isVideo });
    });

    socketInstance.on("call-accepted", (data) => {
      setCallAccepted(true);
    });

    socketInstance.on("call-declined", () => {
      resetCallState();
    });

    socketInstance.on("call-ended", () => {
      resetCallState();
    });

    // Load initial notifications from REST on connection
    const loadNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/notifications`, {
          headers: { "Authorization": token }
        });
        if (res.ok) {
          const list = await res.json();
          setNotifications(list);
        }
      } catch (err) {
        console.error("Error loading notifications:", err);
      }
    };
    loadNotifications();

    return () => {
      socketInstance.disconnect();
    };
  }, [token, currentUser]);

  const sendMessage = (recipientId, text, mediaUrl = "", voiceUrl = "") => {
    if (socket && currentUser) {
      socket.emit("send-message", {
        senderId: currentUser._id,
        recipientId,
        text,
        mediaUrl,
        voiceUrl
      });
    }
  };

  const sendTypingStatus = (recipientId, isTyping) => {
    if (socket && currentUser) {
      socket.emit("typing-status", {
        senderId: currentUser._id,
        recipientId,
        isTyping
      });
    }
  };

  // --- Group chat helpers ---
  const joinGroupRoom = (groupId) => {
    if (socket) {
      socket.emit("join-group", groupId);
    }
  };

  const sendGroupMessage = (groupId, text, mediaUrl = "", voiceUrl = "") => {
    if (socket && currentUser) {
      socket.emit("send-group-message", {
        groupId,
        senderId: currentUser._id,
        text,
        mediaUrl,
        voiceUrl
      });
    }
  };

  // --- Calling helpers ---
  const callUser = (id, isVideo = true) => {
    if (socket && currentUser) {
      setCallType(isVideo ? "video" : "audio");
      socket.emit("call-user", {
        userToCall: id,
        signalData: "mock-signal",
        from: currentUser._id,
        name: currentUser.username,
        isVideo
      });
      setCall({ isCalling: true, to: id, isVideo });
    }
  };

  const acceptCall = () => {
    if (socket && caller) {
      setCallAccepted(true);
      socket.emit("accept-call", { to: caller, signal: "mock-accept-signal" });
    }
  };

  const declineCall = () => {
    if (socket && caller) {
      socket.emit("decline-call", { to: caller });
      resetCallState();
    }
  };

  const endCall = (toId) => {
    if (socket) {
      socket.emit("end-call", { to: toId });
      resetCallState();
    }
  };

  // Helper to trigger socket notifications on REST changes
  const pushRESTNotification = (recipientId, notification) => {
    if (socket) {
      socket.emit("push-notification", { recipientId, notification });
    }
  };

  const clearNotifications = async () => {
    try {
      await fetch(`${API_URL}/notifications/read`, {
        method: "PUT",
        headers: { "Authorization": token }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      onlineUsers,
      notifications,
      activeChatMessages,
      setActiveChatMessages,
      activeGroupMessages,
      setActiveGroupMessages,
      typingUsers,
      sendMessage,
      sendTypingStatus,
      pushRESTNotification,
      clearNotifications,
      // Calling
      call,
      callAccepted,
      callEnded,
      receivingCall,
      caller,
      callType,
      callUser,
      acceptCall,
      declineCall,
      endCall,
      resetCallState,
      // Group
      joinGroupRoom,
      sendGroupMessage
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
