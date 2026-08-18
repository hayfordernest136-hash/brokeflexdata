import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, setToken, clearToken } from '../services/api';

const AuthContext = createContext();

export function useAdminAuth() {
    return useContext(AuthContext);
}

export function AdminAuthProvider({ children }) {
    const [token, setTokenState] = useState(null);
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = getToken();
        if (storedToken) {
            setTokenState(storedToken);
            const adminData = localStorage.getItem('admin_data');
            if (adminData) {
                try {
                    setAdmin(JSON.parse(adminData));
                } catch {
                    setAdmin(null);
                }
            }
        }
        setLoading(false);
    }, []);

    const login = (tokenValue, adminData) => {
        setToken(tokenValue);
        setTokenState(tokenValue);
        setAdmin(adminData);
        localStorage.setItem('admin_data', JSON.stringify(adminData));
    };

    const logout = () => {
        clearToken();
        setTokenState(null);
        setAdmin(null);
        localStorage.removeItem('admin_data');
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, admin, loading, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
