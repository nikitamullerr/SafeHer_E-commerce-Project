import api from "./api.js";

export const checkinService = {
  start: async (duration_minutes) => {
    const response = await api.post("/safety-hub/checkins", {
      duration_minutes,
    });

    return response.data;
  },

  getAll: async () => {
    const response = await api.get("/safety-hub/checkins");

    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.put(`/safety-hub/checkins/${id}`, {
      status,
    });

    return response.data;
  },
};

export default checkinService;