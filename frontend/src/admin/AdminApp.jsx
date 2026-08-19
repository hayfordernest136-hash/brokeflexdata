import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminRoute from './auth/AdminRoute';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Bundles from './pages/Bundles';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Emails from './pages/Emails';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import ResultCheckers from './pages/ResultCheckers';
import CheckerOrderDetail from './pages/CheckerOrderDetail';

function AdminApp() {
    return (
        <Router>
            <Routes>
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                    path="/admin/*"
                    element={
                        <AdminRoute>
                            <AdminLayout />
                        </AdminRoute>
                    }
                >
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="bundles" element={<Bundles />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="emails" element={<Emails />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="audit-logs" element={<AuditLogs />} />
                    <Route path="checkers" element={<ResultCheckers />} />
                    <Route path="checkers/:id" element={<CheckerOrderDetail />} />
                </Route>
                <Route path="*" element={<Navigate to="/admin/login" replace />} />
            </Routes>
        </Router>
    );
}

export default AdminApp;
