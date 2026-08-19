import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import BuyData from './pages/BuyData';
import BundleSelect from './pages/BundleSelect';
import Checkout from './pages/Checkout';
import CheckOrder from './pages/CheckOrder';
import OrderResult from './pages/OrderResult';
import ResultCheckers from './pages/ResultCheckers';

import { AdminAuthProvider } from './admin/auth/AuthContext';
import AdminRoute from './admin/auth/AdminRoute';
import AdminLayout from './admin/components/AdminLayout';
import AdminLogin from './admin/pages/AdminLogin';
import Dashboard from './admin/pages/Dashboard';
import AdminOrders from './admin/pages/Orders';
import OrderDetail from './admin/pages/OrderDetail';
import Bundles from './admin/pages/Bundles';
import Customers from './admin/pages/Customers';
import Payments from './admin/pages/Payments';
import Emails from './admin/pages/Emails';
import Settings from './admin/pages/Settings';
import AuditLogs from './admin/pages/AuditLogs';

function CustomerApp() {
    return (
        <div className="min-h-screen flex flex-col bg-bg text-text-primary">
            <Header />
            <main className="flex-1">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/buy" element={<BuyData />} />
                    <Route path="/buy/:network" element={<BundleSelect />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/check" element={<CheckOrder />} />
                    <Route path="/order/:reference" element={<OrderResult />} />
                    <Route path="/checkers" element={<ResultCheckers />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/admin/login" element={
                    <AdminAuthProvider>
                        <AdminLogin />
                    </AdminAuthProvider>
                } />
                <Route path="/admin/dashboard" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><Dashboard /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/admin/orders" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><AdminOrders /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/admin/orders/:id" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><OrderDetail /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/admin/bundles" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><Bundles /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/admin/customers" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><Customers /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/admin/payments" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><Payments /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/admin/emails" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><Emails /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/admin/settings" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><Settings /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/admin/audit-logs" element={
                    <AdminAuthProvider>
                        <AdminRoute>
                            <AdminLayout><AuditLogs /></AdminLayout>
                        </AdminRoute>
                    </AdminAuthProvider>
                } />
                <Route path="/*" element={<CustomerApp />} />
            </Routes>
        </Router>
    );
}
