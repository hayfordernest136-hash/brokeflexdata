import axios from 'axios';

const getBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return '/api';
    }
    return import.meta.env.VITE_API_BASE_URL || '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 30000,
});

if (import.meta.env.DEV) {
    api.interceptors.response.use(
        (response) => {
            console.log(`[API] ${response.config.method.toUpperCase()} ${response.config.url} -> ${response.status}`);
            return response;
        },
        (error) => {
            console.error('[API Error]', {
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                message: error.message,
                data: error.response?.data,
            });
            return Promise.reject(error);
        }
    );
}

async function fetchWithRetry(apiCall, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (err) {
            lastError = err;
            const isRetryable = !err.response || err.response.status >= 500 || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
            if (!isRetryable || attempt === maxRetries) break;
            const backoffDelay = delay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
    }
    throw lastError;
}

export const fetchConfig = async () => {
    const res = await fetchWithRetry(() => api.get('/config'));
    return res.data;
};

export const fetchNetworks = async () => {
    const res = await fetchWithRetry(() => api.get('/bundles/networks'));
    return res.data.data;
};

export const fetchBundles = async (networkCode = null) => {
    const url = networkCode ? `/bundles?network=${networkCode}` : '/bundles';
    const res = await fetchWithRetry(() => api.get(url));
    return res.data;
};

export const createOrder = async (orderData) => {
    const res = await fetchWithRetry(() => api.post('/orders', orderData));
    return res.data;
};

export const initiatePayment = async (reference) => {
    const res = await fetchWithRetry(() => api.post(`/orders/${reference}/initiate-payment`));
    return res.data;
};

export const verifyPayment = async (reference, paystackReference) => {
    const res = await fetchWithRetry(() => api.get(`/orders/${reference}/verify/${paystackReference}`));
    return res.data;
};

export const checkOrder = async (reference) => {
    const res = await fetchWithRetry(() => api.get(`/orders/${reference}`));
    return res.data;
};

export default api;
