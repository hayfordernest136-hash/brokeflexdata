import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatPrice } from '../../components/BundleGrid';

function StatusBadge({ status, type }) {
    const configs = {
        payment: {
            successful: 'bg-green-400/10 text-green-400',
            pending: 'bg-text-tertiary/10 text-text-tertiary',
            failed: 'bg-red-400/10 text-red-400',
        },
        fulfillment: {
            delivered: 'bg-green-400/10 text-green-400',
            processing: 'bg-blue-400/10 text-blue-400',
            pending: 'bg-text-tertiary/10 text-text-tertiary',
            failed: 'bg-red-400/10 text-red-400',
        },
    };

    const config = configs[type]?.[status] || 'bg-text-tertiary/10 text-text-tertiary';

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config}`}>
            {status}
        </span>
    );
}

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [networkFilter, setNetworkFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [fulfillmentFilter, setFulfillmentFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const limit = 50;
    const navigate = useNavigate();

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (networkFilter) params.set('network', networkFilter);
        if (paymentFilter) params.set('paymentStatus', paymentFilter);
        if (fulfillmentFilter) params.set('fulfillmentStatus', fulfillmentFilter);
        params.set('page', page);
        params.set('limit', limit);

        try {
            const response = await apiRequest(`/admin/orders?${params.toString()}`);
            setOrders(response.data.orders);
            setTotal(response.data.pagination.total);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [search, networkFilter, paymentFilter, fulfillmentFilter, page]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const applyFilters = () => {
        setPage(1);
        fetchOrders();
    };

    const clearFilters = () => {
        setSearch('');
        setNetworkFilter('');
        setPaymentFilter('');
        setFulfillmentFilter('');
        setPage(1);
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-admin-text">Orders</h1>
                <button
                    onClick={() => navigate('/admin/orders')}
                    className="text-sm text-admin-text-secondary hover:text-admin-text"
                >
                    Refresh
                </button>
            </div>

            <div className="bg-admin-card border border-admin-border rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Search by reference, phone, email, payment ref..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 px-3 py-2 bg-admin-input border border-admin-border rounded-lg text-admin-text text-sm focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    />
                    <button
                        onClick={applyFilters}
                        className="px-4 py-2 bg-brokeflex text-admin-bg font-medium rounded-lg text-sm"
                    >
                        Apply
                    </button>
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 border border-admin-border text-admin-text-secondary rounded-lg text-sm hover:bg-admin-input"
                    >
                        Clear
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={networkFilter}
                        onChange={(e) => setNetworkFilter(e.target.value)}
                        className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-xs focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    >
                        <option value="">All Networks</option>
                        <option value="MTN">MTN</option>
                        <option value="Telecel">Telecel</option>
                        <option value="AirtelTigo">AirtelTigo</option>
                    </select>

                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-xs focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    >
                        <option value="">All Payments</option>
                        <option value="pending">Pending</option>
                        <option value="successful">Successful</option>
                        <option value="failed">Failed</option>
                    </select>

                    <select
                        value={fulfillmentFilter}
                        onChange={(e) => setFulfillmentFilter(e.target.value)}
                        className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-xs focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    >
                        <option value="">All Fulfillments</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="delivered">Delivered</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-admin-text-secondary">Loading orders...</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-admin-border">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Reference</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Network</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Bundle</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Phone</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Amount</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Payment</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Fulfillment</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="py-8 text-center text-admin-text-secondary">
                                            No orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="border-b border-admin-border hover:bg-admin-input/50 cursor-pointer"
                                            onClick={() => navigate(`/admin/orders/${order.reference}`)}
                                        >
                                            <td className="py-3 px-4 font-mono text-xs text-admin-text-secondary">{order.reference}</td>
                                            <td className="py-3 px-4 text-admin-text-secondary">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="py-3 px-4">{order.network}</td>
                                            <td className="py-3 px-4">{order.bundle_capacity_string}GB</td>
                                            <td className="py-3 px-4 text-admin-text-secondary">{order.phone_number}</td>
                                            <td className="py-3 px-4 text-right font-medium">{formatPrice(order.amount)}</td>
                                            <td className="py-3 px-4 text-center"><StatusBadge status={order.paymentStatus} type="payment" /></td>
                                            <td className="py-3 px-4 text-center"><StatusBadge status={order.fulfillmentStatus} type="fulfillment" /></td>
                                            <td className="py-3 px-4"></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-admin-border">
                            <p className="text-sm text-admin-text-secondary">
                                Page {page} of {totalPages} ({total} orders)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 text-sm border border-admin-border rounded-lg disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 text-sm border border-admin-border rounded-lg disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
