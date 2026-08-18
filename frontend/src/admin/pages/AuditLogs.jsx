import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionFilter, setActionFilter] = useState('');
    const [adminFilter, setAdminFilter] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: '1', limit: '100' });
            if (actionFilter) params.set('action', actionFilter);
            if (adminFilter) params.set('admin', adminFilter);
            const response = await apiRequest(`/admin/audit-logs?${params.toString()}`);
            setLogs(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [actionFilter, adminFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-admin-text">Audit Log</h1>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Filter by admin email..."
                        value={adminFilter}
                        onChange={(e) => setAdminFilter(e.target.value)}
                        className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-sm focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    />
                    <input
                        type="text"
                        placeholder="Filter by action..."
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-sm focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    />
                    <button
                        onClick={fetchLogs}
                        className="px-3 py-1.5 text-sm border border-admin-border rounded-lg hover:bg-admin-input"
                    >
                        Apply
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-admin-text-secondary">Loading audit logs...</div>
            ) : logs.length === 0 ? (
                <p className="text-admin-text-secondary">No audit logs found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-admin-border">
                                <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Date</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Admin</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Action</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Order Ref</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="border-b border-admin-border">
                                    <td className="py-3 px-4 text-admin-text-secondary">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="py-3 px-4 text-admin-text">{log.adminEmail}</td>
                                    <td className="py-3 px-4 text-admin-text-secondary">{log.action}</td>
                                    <td className="py-3 px-4 font-mono text-xs text-admin-text-secondary">{log.orderReference || '—'}</td>
                                    <td className="py-3 px-4 text-admin-text-secondary">{log.details || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
