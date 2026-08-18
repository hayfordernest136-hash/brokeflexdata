import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: '1', limit: '100' });
            if (search) params.set('search', search);
            const response = await apiRequest(`/admin/customers?${params.toString()}`);
            setCustomers(response.data.customers);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-admin-text">Customers</h1>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search by email, phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-sm focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    />
                    <button
                        onClick={fetchCustomers}
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
                <div className="text-admin-text-secondary">Loading customers...</div>
            ) : customers.length === 0 ? (
                <p className="text-admin-text-secondary">No customers found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-admin-border">
                                <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Email</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Phone</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Network</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Orders</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Last Order</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c, i) => (
                                <tr key={i} className="border-b border-admin-border">
                                    <td className="py-3 px-4 text-admin-text">{c.email}</td>
                                    <td className="py-3 px-4 text-admin-text-secondary">{c.phoneNumber}</td>
                                    <td className="py-3 px-4">{c.networks?.join(', ')}</td>
                                    <td className="py-3 px-4 text-right text-admin-text">{c.orderCount}</td>
                                    <td className="py-3 px-4 text-right text-admin-text-secondary">
                                        {new Date(c.lastOrder).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
