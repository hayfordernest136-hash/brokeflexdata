const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('admin_token');
}

function setToken(token) {
    localStorage.setItem('admin_token', token);
}

function clearToken() {
    localStorage.removeItem('admin_token');
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { message: response.statusText };
        }
        throw new Error(errorData.message || 'Request failed');
    }

    return response.json();
}

export { apiRequest, getToken, setToken, clearToken };

export const fetchCheckerOrders = async (params) => {
    const response = await apiRequest(`/admin/checkers?${params}`);
    return response.data;
};

export const fetchCheckerOrder = async (id) => {
    const response = await apiRequest(`/admin/checkers/${id}`);
    return response.data;
};

export const checkCheckerDatamartStatus = async (id) => {
    const response = await apiRequest(`/admin/checkers/${id}/check-datamart`, {
        method: 'POST'
    });
    return response.data;
};

export const retryCheckerFulfillment = async (id) => {
    const response = await apiRequest(`/admin/checkers/${id}/retry-fulfillment`, {
        method: 'POST'
    });
    return response.data;
};

export const fetchCheckerDashboardStats = async () => {
    const response = await apiRequest('/admin/checkers/stats');
    return response.data;
};

export const fetchCheckerProductsAdmin = async () => {
    const response = await apiRequest('/admin/checkers/products');
    return response.data;
};
