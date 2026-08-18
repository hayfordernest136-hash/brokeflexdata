import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatPrice } from '../../components/BundleGrid';

function StatusBadge({ status }) {
    let config = 'bg-text-tertiary/10 text-text-tertiary';
    if (status === 'successful' || status === 'delivered') config = 'bg-green-400/10 text-green-400';
    else if (status === 'failed') config = 'bg-red-400/10 text-red-400';
    else if (status === 'processing') config = 'bg-blue-400/10 text-blue-400';
    else if (status === 'pending') config = 'bg-text-tertiary/10 text-text-tertiary';
    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config}`}>
            {status}
        </span>
    );
}

export default function Payments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 50;
    const navigate = useNavigate();

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
            if (search) params.set('search', search);
            const response = await apiRequest(`/admin/payments?${params.toString()}`);
            setPayments(response.data.payments);
            setTotal(response.data.pagination.total);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-admin-text">Payments</h1>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search by order ref, payment ref, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-sm focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    />
                    <button
                        onClick={fetchPayments}
                        className="px-3 py-1.5 text-sm border border-admin-border rounded-lg hover:bg-admin-input"
                    >
                        Search
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-admin-text-secondary">Loading payments...</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-admin-border">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Order Ref</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Payment Ref</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Email</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Network</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Bundle</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Amount</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Status</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="py-8 text-center text-admin-text-secondary">
                                            No payments found.
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="border-b border-admin-border hover:bg-admin-input/50 cursor-pointer"
                                            onClick={() => navigate(`/admin/orders/${p.orderReference}`)}
                                        >
                                            <td className="py-3 px-4 font-mono text-xs text-admin-text-secondary">{p.orderReference}</td>
                                            <td className="py-3 px-4 font-mono text-xs text-admin-text-secondary">{p.paymentReference || '—'}</td>
                                            <td className="py-3 px-4 text-admin-text">{p.customerEmail}</td>
                                            <td className="py-3 px-4">{p.network}</td>
                                            <td className="py-3 px-4">{p.bundle}</td>
                                            <td className="py-3 px-4 text-right font-medium">{formatPrice(p.amount)}</td>
                                            <td className="py-3 px-4 text-center"><StatusBadge status={p.paymentStatus} /></td>
                                            <td className="py-3 px-4 text-admin-text-secondary">{new Date(p.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-admin-border">
                            <p className="text-sm text-admin-text-secondary">
                                Page {page} of {totalPages} ({total} payments)
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
