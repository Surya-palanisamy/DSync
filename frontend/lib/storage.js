// Debounce timer references for batched localStorage writes
const writeTimers = {};
const WRITE_DEBOUNCE_MS = 300;

/**
 * Debounced localStorage write. Batches rapid writes to the same key
 * into a single I/O operation after WRITE_DEBOUNCE_MS of inactivity.
 */
const debouncedWrite = (key, value) => {
  if (typeof window === "undefined") return;
  if (writeTimers[key]) {
    clearTimeout(writeTimers[key]);
  }
  writeTimers[key] = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to write ${key} to localStorage:`, error);
    }
    delete writeTimers[key];
  }, WRITE_DEBOUNCE_MS);
};

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

  setChats: (chats) => {
    if (typeof window === "undefined") return;
    try {
      const limitedChats = chats.slice(0, 50);
      debouncedWrite("chats", limitedChats);
    } catch (error) {
      console.error("Failed to save chats to localStorage:", error);
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
    const limitedMessages = messages.slice(-200);
    debouncedWrite(`messages_${chatId}`, limitedMessages);
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

  /**
   * LRU eviction for message caches.
   * Keeps the 10 most recently accessed message caches, evicts the rest.
   */
  cleanupOldMessages: () => {
    if (typeof window === "undefined") return;
    try {
      const keys = Object.keys(localStorage);
      const messageKeys = keys.filter((key) => key.startsWith("messages_"));

      if (messageKeys.length <= 10) return;

      // Sort by the latest message timestamp in each cache (most recent first)
      const keysWithTimestamp = messageKeys.map((key) => {
        try {
          const messages = JSON.parse(localStorage.getItem(key));
          const lastMessage = messages[messages.length - 1];
          const timestamp = lastMessage?.createdAt
            ? new Date(lastMessage.createdAt).getTime()
            : 0;
          return { key, timestamp };
        } catch {
          return { key, timestamp: 0 };
        }
      });

      keysWithTimestamp.sort((a, b) => b.timestamp - a.timestamp);

      // Keep top 10, evict the rest
      const keysToRemove = keysWithTimestamp.slice(10);
      keysToRemove.forEach(({ key }) => {
        localStorage.removeItem(key);
      });
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
