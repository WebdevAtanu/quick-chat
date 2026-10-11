const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Auth API
export const authAPI = {
  register: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  },

  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  },

  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/users`);
    return response.json();
  },

  getChatHistory: async (userId1, userId2) => {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/chats?userId1=${userId1}&userId2=${userId2}`
    );
    return response.json();
  },
};

// Groups API
export const groupsAPI = {
  createGroup: async (name, memberIds, createdBy) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, memberIds, createdBy }),
    });
    return response.json();
  },

  getGroups: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/list?userId=${userId}`);
    return response.json();
  },

  getGroupMessages: async (groupId) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/messages?groupId=${groupId}`);
    return response.json();
  },
};
