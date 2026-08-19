import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../auth/AuthContext';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    CreditCard,
    Mail,
    Settings,
    LogOut,
    Menu,
    FileText,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/admin/bundles', icon: Package, label: 'Data Bundles' },
    { to: '/admin/checkers', icon: FileText, label: 'Result Checkers' },
    { to: '/admin/customers', icon: Users, label: 'Customers' },
    { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
    { to: '/admin/emails', icon: Mail, label: 'Emails' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { admin, logout } = useAdminAuth();

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-admin-bg flex">
            <div
                className={`fixed inset-0 z-40 lg:hidden ${
                    sidebarOpen ? 'block' : 'hidden'
                }`}
                onClick={() => setSidebarOpen(false)}
            >
                <div className="absolute inset-0 bg-black/40"></div>
            </div>

            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-admin-sidebar border-r border-admin-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-admin-border">
                        <h1 className="text-xl font-semibold text-admin-text">Brokeflex Data</h1>
                        <p className="text-xs text-admin-text-secondary">Admin Panel</p>
                    </div>

                    <nav className="flex-1 py-4 space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-brokeflex text-admin-bg'
                                            : 'text-admin-text-secondary hover:text-admin-text hover:bg-admin-card'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-admin-border">
                        <div className="flex items-center px-3 py-2 text-sm">
                            <div className="w-8 h-8 rounded-full bg-brokeflex flex items-center justify-center text-admin-bg font-semibold">
                                {admin?.email?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="ml-3">
                                <p className="font-medium text-admin-text">{admin?.email}</p>
                                <p className="text-xs text-admin-text-secondary">{admin?.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-3 py-2 text-sm font-medium text-admin-text-secondary hover:text-admin-text hover:bg-admin-card rounded-lg transition-all"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
                <header className="bg-admin-card border-b border-admin-border px-6 py-3 flex items-center justify-between lg:hidden">
                    <h2 className="text-lg font-semibold text-admin-text">Brokeflex Data Admin</h2>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-admin-text-secondary hover:text-admin-text"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">
                    <Outlet key={location.pathname} />
                </main>
            </div>
        </div>
    );
}
