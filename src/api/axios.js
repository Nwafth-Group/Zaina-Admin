import axios from 'axios';



// إنشاء نسخة مخصصة من axios
const axiosInstance = axios.create({
  
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
       
    },
});

// Interceptor لإضافة التوكن (Token) تلقائياً لأي ريكويست في حال كان اليوزر مسجل دخول
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('zaina_admin_token'); // رح نخزن التوكن هون بعدين
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
    // إذا صار أي خطأ، بنفحص نوعه
    if (error.response && error.response.status === 401 && !isLoginRequest) {
      console.warn("Session Expired - Redirecting to login...");

      // أ. احذف التوكن الخربان عشان ما يضل يحاول يرسله
      localStorage.removeItem("zaina_admin_token");
      localStorage.removeItem("user"); // إذا مخزن بيانات يوزر كمان احذفها
      window.location.href = "/auth/login";
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;