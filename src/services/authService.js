import api from "./api.js";

export const authService = {
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put("/auth/me", data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.put("/auth/change-password", data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("safeher-token");
    localStorage.removeItem("safeher-user");
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("safeher-token");
  },

  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem("safeher-user"));
    } catch {
      return null;
    }
  },
};

export default authService;
