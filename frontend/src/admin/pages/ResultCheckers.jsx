import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatPrice } from '../../components/BundleGrid';
import { Eye, RefreshCw, Search } from 'lucide-react';

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
            fulfillment_pending: 'bg-amber-400/10 text-amber-400',
        },
        checker: {
            WAEC: 'bg-brokeflex-subtle text-brokeflex',
            BECE: 'bg-purple-400/10 text-purple-400',
        },
    };

    const config = configs[type]?.[status] || 'bg-text-tertiary/10 text-text-tertiary';

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config}`}>
            {status}
        </span>
    );
}

export default function ResultCheckers() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [checkerTypeFilter, setCheckerTypeFilter] = useState('');
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
        if (checkerTypeFilter) params.set('checkerType', checkerTypeFilter);
        if (paymentFilter) params.set('paymentStatus', paymentFilter);
        if (fulfillmentFilter) params.set('fulfillmentStatus', fulfillmentFilter);
        params.set('page', page);
        params.set('limit', limit);

        try {
            const response = await apiRequest(`/admin/checkers?${params.toString()}`);
            setOrders(response.data.orders);
            setTotal(response.data.pagination.total);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [search, checkerTypeFilter, paymentFilter, fulfillmentFilter, page]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const applyFilters = () => {
        setPage(1);
        fetchOrders();
    };

    const clearFilters = () => {
        setSearch('');
        setCheckerTypeFilter('');
        setPaymentFilter('');
        setFulfillmentFilter('');
        setPage(1);
    };

    const totalPages = Math.ceil(total / limit);

    const formatPriceFn = (price) => {
        if (!price && price !== 0) return '—';
        return formatPrice(price);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-admin-text">Result Checkers</h1>
                <button
                    onClick={fetchOrders}
                    className="p-2 text-admin-text-secondary hover:text-admin-text bg-admin-input border border-admin-border rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="bg-admin-card border border-admin-border rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search by reference, phone, email, serial..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-admin-input border border-admin-border rounded-lg text-admin-text text-sm focus:outline-none focus:ring-1 focus:ring-brokeflex"
                        />
                    </div>
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
                        value={checkerTypeFilter}
                        onChange={(e) => setCheckerTypeFilter(e.target.value)}
                        className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-xs focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    >
                        <option value="">All Types</option>
                        <option value="WAEC">WAEC</option>
                        <option value="BECE">BECE</option>
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
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="delivered">Delivered</option>
                        <option value="failed">Failed</option>
                        <option value="fulfillment_pending">Pending Fulfillment</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-admin-text-secondary">Loading checker orders...</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-admin-border">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Reference</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Type</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Phone</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Price</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Cost</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Payment</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Status</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="py-8 text-center text-admin-text-secondary">
                                            No checker orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="border-b border-admin-border hover:bg-admin-input/50 cursor-pointer"
                                            onClick={() => navigate(`/admin/checkers/${order.reference}`)}
                                        >
                                            <td className="py-3 px-4 font-mono text-xs text-admin-text-secondary">{order.reference}</td>
                                            <td className="py-3 px-4"><StatusBadge status={order.checkerType} type="checker" /></td>
                                            <td className="py-3 px-4 text-admin-text-secondary">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="py-3 px-4 text-admin-text-secondary">{order.phoneNumber}</td>
                                            <td className="py-3 px-4 text-right font-medium text-admin-text">{formatPriceFn(order.sellingPrice || order.amount)}</td>
                                            <td className="py-3 px-4 text-right text-admin-text-secondary">{formatPriceFn(order.datamartCost)}</td>
                                            <td className="py-3 px-4 text-center"><StatusBadge status={order.paymentStatus} type="payment" /></td>
                                            <td className="py-3 px-4 text-center"><StatusBadge status={order.fulfillmentStatus} type="fulfillment" /></td>
                                            <td className="py-3 px-4">
                                                <Eye className="w-4 h-4 text-admin-text-secondary" />
                                            </td>
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
