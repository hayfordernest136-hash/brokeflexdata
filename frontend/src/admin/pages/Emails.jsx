import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';

function StatusBadge({ status }) {
    let bgColor = 'bg-text-tertiary/10';
    let textColor = 'text-text-tertiary';
    if (status === 'sent') { bgColor = 'bg-green-400/10'; textColor = 'text-green-400'; }
    else if (status === 'failed') { bgColor = 'bg-red-400/10'; textColor = 'text-red-400'; }
    return <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${bgColor} ${textColor}`}>{status}</span>;
}

export default function Emails() {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [testEmail, setTestEmail] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const limit = 50;

    const fetchEmails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
            if (statusFilter) params.set('status', statusFilter);
            const response = await apiRequest(`/admin/emails?${params.toString()}`);
            setEmails(response.data.emails);
            setTotal(response.data.pagination.total);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page]);

    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    const handleTestEmail = async () => {
        if (!testEmail) {
            setTestResult({ error: 'Please enter an email address.' });
            return;
        }
        setTestLoading(true);
        setTestResult(null);
        try {
            const response = await apiRequest('/admin/emails/test', {
                method: 'POST',
                body: JSON.stringify({ email: testEmail }),
            });
            setTestResult({ success: true, message: response.data.message });
        } catch (err) {
            setTestResult({ error: err.message });
        } finally {
            setTestLoading(false);
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-admin-text">Email Activity</h1>
            </div>

            <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-admin-text mb-4">Send Test Email</h2>
                <div className="space-y-3">
                    <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-admin-input border border-admin-border rounded-lg text-admin-text text-sm focus:outline-none focus:ring-1 focus:ring-brokeflex"
                    />
                    <button
                        onClick={handleTestEmail}
                        disabled={testLoading}
                        className="px-4 py-2 bg-brokeflex text-admin-bg font-medium rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                    >
                        {testLoading ? 'Sending...' : 'Send Test Email'}
                    </button>
                    {testResult?.success && (
                        <p className="text-sm text-green-400">{testResult.message}</p>
                    )}
                    {testResult?.error && (
                        <p className="text-sm text-red-400">{testResult.error}</p>
                    )}
                </div>
            </div>

            <div className="flex gap-2">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-admin-input border border-admin-border rounded-lg text-admin-text text-sm focus:outline-none focus:ring-1 focus:ring-brokeflex"
                >
                    <option value="">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-admin-text-secondary">Loading emails...</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-admin-border">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Order Ref</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Recipient</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Type</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-admin-text-secondary uppercase">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {emails.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-8 text-center text-admin-text-secondary">
                                            No emails found.
                                        </td>
                                    </tr>
                                ) : (
                                    emails.map((e) => (
                                        <tr key={e.id} className="border-b border-admin-border">
                                            <td className="py-3 px-4 font-mono text-xs text-admin-text-secondary">{e.orderReference || '—'}</td>
                                            <td className="py-3 px-4 text-admin-text">{e.recipientEmail}</td>
                                            <td className="py-3 px-4 text-admin-text-secondary">{e.emailType}</td>
                                            <td className="py-3 px-4 text-center"><StatusBadge status={e.status} /></td>
                                            <td className="py-3 px-4 text-admin-text-secondary">{new Date(e.sentAt).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-admin-text-secondary">{e.error ? e.error.substring(0, 60) + '...' : '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-admin-border">
                            <p className="text-sm text-admin-text-secondary">
                                Page {page} of {totalPages} ({total} emails)
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
