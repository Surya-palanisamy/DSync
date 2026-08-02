"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";

export const useSocket = (user) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const userIdRef = useRef(null);

  const connectSocket = useCallback(() => {
    if (!user) return;

    // Prevent duplicate connections for the same user
    if (socketRef.current && userIdRef.current === user.id) {
      return;
    }

    // Clean up existing connection if user changed
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    userIdRef.current = user.id;

    const derivedBase = (() => {
      if (process.env.NEXT_PUBLIC_SOCKET_URL)
        return process.env.NEXT_PUBLIC_SOCKET_URL;
      if (typeof window === "undefined") return "http://localhost:5000";

      const isSecure = window.location.protocol === "https:";
      const host = window.location.hostname;
      const defaultPort = isSecure ? "" : ":5000";
      const port = process.env.NEXT_PUBLIC_SOCKET_PORT
        ? `:${process.env.NEXT_PUBLIC_SOCKET_PORT}`
        : defaultPort;
      const protocol = isSecure ? "https:" : "http:";
      return `${protocol}//${host}${port}`;
    })();

    const newSocket = io(derivedBase, {
      withCredentials: true,
      transports: ["polling", "websocket"],
      timeout: 20000,
      path: "/socket.io",
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Removed forceNew: true — allows Socket.io's built-in connection reuse
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("join", user.id);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("reconnect", () => {
      setIsConnected(true);
      // Re-emit join on reconnection to restore online status
      newSocket.emit("join", user.id);
    });

    newSocket.on("connect_error", (err) => {
      setIsConnected(false);
      console.error("Socket connect_error:", err?.message || err);
    });

    newSocket.on("error", (err) => {
      console.error("Socket error:", err?.message || err);
    });

    newSocket.on("online-users", (users) => {
      setOnlineUsers(users);
    });

    newSocket.on("user-online", (userId) => {
      setOnlineUsers((prev) => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
    });

    newSocket.on("user-offline", (data) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [user]);

  useEffect(() => {
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        userIdRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [connectSocket]);

  return { socket, onlineUsers, isConnected };
};
