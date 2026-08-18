import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const saved = localStorage.getItem('brokeflex-theme');
document.documentElement.setAttribute('data-theme', saved ? saved : 'dark');

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
);
