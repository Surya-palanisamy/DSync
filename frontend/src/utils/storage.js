// Local storage utilities
export const storage = {
  // User data
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  getUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  
  removeUser: () => {
    localStorage.removeItem('user');
  },
  
  // Token
  setToken: (token) => {
    localStorage.setItem('token', token);
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  removeToken: () => {
    localStorage.removeItem('token');
  },
  
  // Chats cache
  setChats: (chats) => {
    localStorage.setItem('chats', JSON.stringify(chats));
  },
  
  getChats: () => {
    try {
      const chats = localStorage.getItem('chats');
      return chats ? JSON.parse(chats) : [];
    } catch {
      return [];
    }
  },
  
  // Messages cache
  setMessages: (chatId, messages) => {
    localStorage.setItem(`messages_${chatId}`, JSON.stringify(messages));
  },
  
  getMessages: (chatId) => {
    try {
      const messages = localStorage.getItem(`messages_${chatId}`);
      return messages ? JSON.parse(messages) : [];
    } catch {
      return [];
    }
  },
  
  // Clear all data
  clear: () => {
    localStorage.clear();
  }
};