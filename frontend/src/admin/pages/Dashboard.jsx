import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import {
    ShoppingCart, Users, DollarSign, Bell, TrendingUp, Package,
    CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, Mail,
    FileText,
} from 'lucide-react';

function StatCard({ title, value, icon, subtitle, trend }) {
    return (
        <div className="bg-admin-card border border-admin-border rounded-xl p-6 hover:border-admin-border-hover transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-admin-text-secondary">{title}</p>
                    <p className="text-2xl font-semibold text-admin-text mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-admin-text-secondary mt-1">{subtitle}</p>}
                    {trend && (
                        <div className="flex items-center gap-1 mt-1 text-xs">
                            <TrendingUp className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">{trend}</span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="p-2 rounded-lg bg-admin-input border border-admin-border">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusIndicator({ status, label }) {
    const configs = {
        success: { bg: 'bg-green-400/20', text: 'text-green-400', icon: CheckCircle },
        warning: { bg: 'bg-amber-400/20', text: 'text-amber-400', icon: AlertCircle },
        error: { bg: 'bg-red-400/20', text: 'text-red-400', icon: XCircle },
        info: { bg: 'bg-blue-400/20', text: 'text-blue-400', icon: Clock },
    };
    const cfg = configs[status] || configs.info;
    const Icon = cfg.icon;

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg} ${cfg.text}`}>
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}

function RecentOrder({ order }) {
    const statusColors = {
        successful: 'bg-green-400/20 text-green-400',
        pending: 'bg-amber-400/20 text-amber-400',
        failed: 'bg-red-400/20 text-red-400',
    };
    const fulfillmentColors = {
        delivered: 'bg-green-400/20 text-green-400',
        processing: 'bg-blue-400/20 text-blue-400',
        pending: 'bg-amber-400/20 text-amber-400',
        failed: 'bg-red-400/20 text-red-400',
    };

    return (
        <div className="border-b border-admin-border last:border-0 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Package className="w-8 h-8 text-admin-text-secondary" />
                    <div>
                        <span className="font-mono text-xs text-admin-text-secondary block">
            {order.reference}
          </span>
                        <span className="text-sm font-medium text-admin-text">{order.network}</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-lg font-semibold text-admin-text">GHC {order.amount}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${fulfillmentColors[order.fulfillment_status] || ''}`}>
                            {order.fulfillment_status}
          </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[order.payment_status] || ''}`}>
                            {order.payment_status}
          </span>
                    </div>
                </div>
            </div>
            <div className="mt-2 text-xs text-admin-text-secondary flex items-center gap-2">
                <span>{order.bundle_capacity_string}GB</span>
                <span>•</span>
                <span>{order.phone_number}</span>
                <span>•</span>
                <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [checkerStats, setCheckerStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiRequest('/admin/dashboard');
            setData(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCheckerStats = async () => {
        try {
            const response = await apiRequest('/admin/checkers/stats');
            setCheckerStats(response.data);
        } catch {
        }
    };

    useEffect(() => {
        fetchData();
        fetchCheckerStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-admin-text-secondary animate-spin mx-auto mb-4" />
                    <p className="text-admin-text-secondary">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-5 h-5 inline mr-2" />
                Error: {error}
            </div>
        );
    }

    if (!data) return null;

    const { stats, datamartStatus, emailStatus, recentOrders } = data;
    const totalOrders = stats.totalOrders || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-admin-text">Dashboard</h1>
                    <p className="text-sm text-admin-text-secondary mt-1">
                        {totalOrders > 0
                            ? `${totalOrders} total orders • Last updated ${new Date().toLocaleTimeString()}`
                            : 'No orders yet'}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 text-admin-text-secondary hover:text-admin-text bg-admin-input border border-admin-border rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Orders"
                    value={stats.totalOrders}
                    icon={<ShoppingCart className="w-5 h-5 text-brokeflex" />}
                    trend={stats.thisMonthOrders > 0
                        ? `${stats.thisMonthOrders} this month`
                        : undefined}
                />
                <StatCard
                    title="Pending"
                    value={stats.pendingOrders}
                    subtitle="Awaiting payment/fulfillment"
                    icon={<Clock className="w-5 h-5 text-amber-400" />}
                />
                <StatCard
                    title="Delivered"
                    value={stats.deliveredOrders}
                    icon={<CheckCircle className="w-5 h-5 text-green-400" />}
                />
                <StatCard
                    title="Failed"
                    value={stats.failedOrders}
                    icon={<XCircle className="w-5 h-5 text-red-400" />}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Revenue"
                    value={'GHC ' + (Number(stats.totalRevenue) || 0).toFixed(2)}
                    subtitle={stats.thisMonthOrders > 0
                        ? 'This month: GHC ' + (Number(stats.thisMonthRevenue) || 0).toFixed(2)
                        : undefined}
                    icon={<DollarSign className="w-5 h-5 text-blue-400" />}
                />
                <StatCard
                    title="Paid Orders"
                    value={stats.totalPaid}
                    icon={<CheckCircle className="w-5 h-5 text-green-400" />}
                />
                <StatCard
                    title="Failed Payments"
                    value={stats.failedPayments}
                    icon={<XCircle className="w-5 h-5 text-red-400" />}
                />
                <StatCard
                    title="DataMart"
                    value={datamartStatus.connected ? 'Connected' : 'Unavailable'}
                    subtitle={datamartStatus.balance
                        ? 'Balance: GHC ' + datamartStatus.balance
                        : undefined}
                    icon={<Package className="w-5 h-5 text-admin-text-secondary" />}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-admin-text mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-admin-text-secondary" />
                        Service Status
          </h2>
                    <div className="space-y-3">
                        <StatusIndicator
                            status={datamartStatus.connected ? 'success' : 'error'}
                            label={`DataMart API: ${datamartStatus.connected ? 'Connected' : 'Unavailable'}`}
                        />
                        <StatusIndicator
                            status={emailStatus.configured ? 'success' : 'warning'}
                            label={`Email Service: ${emailStatus.configured ? 'Configured' : 'Not Configured'}`}
                        />
                    </div>
                    {emailStatus.from && (
                        <p className="text-xs text-admin-text-secondary mt-3 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {emailStatus.from}
                        </p>
                    )}
                </div>

                <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-admin-text mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-admin-text-secondary" />
                        Quick Actions
          </h2>
                    <div className="space-y-2 text-sm">
                        <a href="/admin/orders" className="block py-2 text-admin-text-secondary hover:text-admin-text hover:bg-admin-input px-3 rounded-lg transition-colors">
                            View all orders
                        </a>
                        <a href="/admin/bundles" className="block py-2 text-admin-text-secondary hover:text-admin-text hover:bg-admin-input px-3 rounded-lg transition-colors">
                            Refresh bundles
                        </a>
                        <a href="/admin/checkers" className="block py-2 text-admin-text-secondary hover:text-admin-text hover:bg-admin-input px-3 rounded-lg transition-colors">
                            View checker orders
                        </a>
                        <a href="/admin/emails" className="block py-2 text-admin-text-secondary hover:text-admin-text hover:bg-admin-input px-3 rounded-lg transition-colors">
                            Email events
                        </a>
                        <a href="/admin/settings" className="block py-2 text-admin-text-secondary hover:text-admin-text hover:bg-admin-input px-3 rounded-lg transition-colors">
                            System settings
                        </a>
                    </div>
                </div>
            </div>

            <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-admin-text mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Recent Orders
                </h2>
                {recentOrders.length === 0 ? (
                    <div className="text-center py-8">
                        <ShoppingCart className="w-12 h-12 text-admin-text-secondary/30 mx-auto mb-3" />
                        <p className="text-admin-text-secondary">No orders yet.</p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {recentOrders.map((order) => (
                            <RecentOrder key={order.id} order={order} />
                        ))}
                    </div>
                )}
            </div>

            {checkerStats && (
                <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-admin-text mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Result Checkers Overview
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-admin-text">{checkerStats.totalOrders || 0}</p>
                            <p className="text-xs text-admin-text-secondary">Total Orders</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-admin-text">{checkerStats.completedOrders || 0}</p>
                            <p className="text-xs text-admin-text-secondary">Completed</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-admin-text">{checkerStats.waecOrders || 0}</p>
                            <p className="text-xs text-admin-text-secondary">WAEC</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-admin-text">{checkerStats.beceOrders || 0}</p>
                            <p className="text-xs text-admin-text-secondary">BECE</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-green-400">{(Number(checkerStats.totalMarkup) || 0).toFixed(2)}</p>
                            <p className="text-xs text-admin-text-secondary">Profit (GHC)</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-blue-400">{(Number(checkerStats.totalRevenue) || 0).toFixed(2)}</p>
                            <p className="text-xs text-admin-text-secondary">Sales (GHC)</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-semibold text-purple-400">{(Number(checkerStats.totalDatamartCost) || 0).toFixed(2)}</p>
                            <p className="text-xs text-admin-text-secondary">DataMart Cost (GHC)</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-admin-border">
                        <a href="/admin/checkers" className="text-sm text-brokeflex hover:underline flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            View all Result Checker orders
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
