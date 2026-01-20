export const storage = {
  setUser: (user) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("user", JSON.stringify(user));
    } catch (error) {
      console.error("Failed to save user to localStorage:", error);
    }
  },

  getUser: () => {
    if (typeof window === "undefined") return null;
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Failed to get user from localStorage:", error);
      return null;
    }
  },

  removeUser: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Failed to remove user from localStorage:", error);
    }
  },

  setToken: (token) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("token", token);
    } catch (error) {
      console.error("Failed to save token to localStorage:", error);
    }
  },

  getToken: () => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("token");
    } catch (error) {
      console.error("Failed to get token from localStorage:", error);
      return null;
    }
  },

  removeToken: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Failed to remove token from localStorage:", error);
    }
  },

  setChats: (chats) => {
    if (typeof window === "undefined") return;
    try {
      const limitedChats = chats.slice(0, 50);
      localStorage.setItem("chats", JSON.stringify(limitedChats));
    } catch (error) {
      console.error("Failed to save chats to localStorage:", error);
      try {
        localStorage.removeItem("chats");
        localStorage.setItem("chats", JSON.stringify(chats.slice(0, 20)));
      } catch (retryError) {
        console.error("Failed to save chats after cleanup:", retryError);
      }
    }
  },

  getChats: () => {
    if (typeof window === "undefined") return [];
    try {
      const chats = localStorage.getItem("chats");
      return chats ? JSON.parse(chats) : [];
    } catch (error) {
      console.error("Failed to get chats from localStorage:", error);
      return [];
    }
  },

  setMessages: (chatId, messages) => {
    if (typeof window === "undefined") return;
    try {
      const limitedMessages = messages.slice(-200);
      localStorage.setItem(
        `messages_${chatId}`,
        JSON.stringify(limitedMessages),
      );
    } catch (error) {
      console.error(`Failed to save messages for chat ${chatId}:`, error);
      try {
        const evenMoreLimited = messages.slice(-100);
        localStorage.setItem(
          `messages_${chatId}`,
          JSON.stringify(evenMoreLimited),
        );
      } catch (retryError) {
        console.error(
          `Failed to save messages after cleanup for chat ${chatId}:`,
          retryError,
        );
      }
    }
  },

  getMessages: (chatId) => {
    if (typeof window === "undefined") return [];
    try {
      const messages = localStorage.getItem(`messages_${chatId}`);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error(`Failed to get messages for chat ${chatId}:`, error);
      return [];
    }
  },

  removeMessages: (chatId) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(`messages_${chatId}`);
    } catch (error) {
      console.error(`Failed to remove messages for chat ${chatId}:`, error);
    }
  },

  getStorageInfo: () => {
    if (typeof window === "undefined")
      return { totalSize: 0, itemCount: 0, sizeInMB: "0.00" };
    try {
      let totalSize = 0;
      let itemCount = 0;

      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
          itemCount++;
        }
      }

      return {
        totalSize: totalSize,
        itemCount: itemCount,
        sizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
      };
    } catch (error) {
      console.error("Failed to get storage info:", error);
      return { totalSize: 0, itemCount: 0, sizeInMB: "0.00" };
    }
  },

  cleanupOldMessages: () => {
    if (typeof window === "undefined") return;
    try {
      const keys = Object.keys(localStorage);
      const messageKeys = keys.filter((key) => key.startsWith("messages_"));

      if (messageKeys.length > 10) {
        const keysToRemove = messageKeys.slice(10);
        keysToRemove.forEach((key) => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error("Failed to cleanup old messages:", error);
    }
  },

  clear: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
  },
};

if (typeof window !== "undefined") {
  storage.cleanupOldMessages();
}
