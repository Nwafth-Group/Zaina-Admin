import axios from 'axios';



const axiosInstance = axios.create({
  
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
       
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('zaina_admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const currentLang = localStorage.getItem('i18nextLng') || 'ar';
        config.headers['Accept-Language'] = currentLang;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const isLoginRequest = error.config.url.includes('/login');
    if (error.response && error.response.status === 401 && !isLoginRequest) {
      console.warn("Session Expired - Redirecting to login...");

      localStorage.removeItem("zaina_admin_token");
      localStorage.removeItem("user");
      window.location.href = "/admin/auth/login";
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;