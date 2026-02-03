import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * API Client Configuration
 * Centralized Axios instance with interceptors
 */
const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Return response.data directly
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Auth API
 */
export const authAPI = {
  register: (userData) => apiClient.post("/auth/register", userData),
  login: (credentials) => apiClient.post("/auth/login", credentials),
  getProfile: () => apiClient.get("/auth/me"),
  updateProfile: (updates) => apiClient.put("/auth/profile", updates),
  changePassword: (passwords) => apiClient.put("/auth/password", passwords),
  getUserProfile: (userId) => apiClient.get(`/auth/users/${userId}`),
};

/**
 * Content API
 */
export const contentAPI = {
  // Get contents with filters
  getContents: (params) => apiClient.get("/contents", { params }),

  // Get single content
  getContent: (id) => apiClient.get(`/contents/${id}`),

  // Create content
  createContent: (data) => apiClient.post("/contents", data),

  // Update content
  updateContent: (id, data) => apiClient.put(`/contents/${id}`, data),

  // Delete content
  deleteContent: (id) => apiClient.delete(`/contents/${id}`),

  // Search
  semanticSearch: (query, options = {}) =>
    apiClient.post("/contents/search/semantic", { query, ...options }),

  // Popular & Trending
  getPopular: (params) => apiClient.get("/contents/popular", { params }),
  getTrending: (params) => apiClient.get("/contents/trending", { params }),

  // Analytics
  getContentAnalytics: (id) => apiClient.get(`/contents/${id}/analytics`),

  // Interactions
  likeContent: (id) => apiClient.post(`/contents/${id}/like`),
  shareContent: (id) => apiClient.post(`/contents/${id}/share`),
  bookmarkContent: (id) => apiClient.post(`/contents/${id}/bookmark`),
  removeBookmark: (id) => apiClient.delete(`/contents/${id}/bookmark`),

  // Bookmarks
  getBookmarks: (params) => apiClient.get("/contents/bookmarks/me", { params }),
};

/**
 * Analytics API
 */
export const analyticsAPI = {
  getTrending: (params) => apiClient.get("/analytics/trending", { params }),
  getTopByCategory: (params) => apiClient.get("/analytics/top-by-category", { params }),
  getLeaderboard: (params) => apiClient.get("/analytics/leaderboard", { params }),
  getCategoryAnalytics: () => apiClient.get("/analytics/categories"),
  getSearchAnalytics: (params) => apiClient.get("/analytics/search", { params }),
  getDashboard: () => apiClient.get("/analytics/dashboard"),
  getContentTimeseries: (id, params) =>
    apiClient.get(`/analytics/content/${id}/timeseries`, { params }),
  getUserEngagement: (userId) => apiClient.get(`/analytics/user/${userId}/engagement`),
  refreshViews: () => apiClient.post("/analytics/refresh-views"),
};

export default apiClient;
