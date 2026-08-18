import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
});

export const fetchConfig = async () => {
    const res = await api.get('/config');
    return res.data;
};

export const fetchNetworks = async () => {
    const res = await api.get('/bundles/networks');
    return res.data.data;
};

export const fetchBundles = async (networkCode = null) => {
    const url = networkCode ? `/bundles?network=${networkCode}` : '/bundles';
    const res = await api.get(url);
    return res.data;
};

export const createOrder = async (orderData) => {
    const res = await api.post('/orders', orderData);
    return res.data;
};

export const initiatePayment = async (reference) => {
    const res = await api.post(`/orders/${reference}/initiate-payment`);
    return res.data;
};

export const verifyPayment = async (reference, paystackReference) => {
    const res = await api.get(`/orders/${reference}/verify/${paystackReference}`);
    return res.data;
};

export const checkOrder = async (reference) => {
    const res = await api.get(`/orders/${reference}`);
    return res.data;
};

export default api;
