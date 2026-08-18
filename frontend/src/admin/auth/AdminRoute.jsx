import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../auth/AuthContext';

export default function AdminRoute({ children }) {
    const { isAuthenticated, loading } = useAdminAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="min-h-screen bg-admin-bg flex items-center justify-center">
                <div className="text-admin-text">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        navigate('/admin/login');
        return null;
    }

    return children;
}
