"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

export const useSocket = (user) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && !socketRef.current) {
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
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
        path: "/socket.io",
        reconnectionAttempts: 5,
      });

      newSocket.on("connect", () => {
        newSocket.emit("join", user.id);
      });

      newSocket.on("connect_error", (err) => {
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
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user]);

  return { socket, onlineUsers };
};
