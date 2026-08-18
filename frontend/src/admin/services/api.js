const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

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
