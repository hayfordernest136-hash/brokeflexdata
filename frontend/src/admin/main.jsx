import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp';
import { AdminAuthProvider } from './auth/AuthContext';
import '../index.css';

const saved = localStorage.getItem('brokeflex-theme');
document.documentElement.setAttribute('data-theme', saved ? saved : 'dark');

ReactDOM.createRoot(document.getElementById('admin-root')).render(
    <React.StrictMode>
        <AdminAuthProvider>
            <AdminApp />
        </AdminAuthProvider>
    </React.StrictMode>
);
