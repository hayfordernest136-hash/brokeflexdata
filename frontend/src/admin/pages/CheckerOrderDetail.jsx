import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatPrice } from '../../components/BundleGrid';
import { AlertTriangle } from 'lucide-react';

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
    };

    const config = configs[type]?.[status] || 'bg-text-tertiary/10 text-text-tertiary';

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config}`}>
            {status}
        </span>
    );
}

function DetailRow({ label, value, mono = false }) {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div className="flex justify-between py-2 border-b border-admin-border last:border-0">
            <span className="text-admin-text-secondary">{label}</span>
            <span className={`text-admin-text font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
        </div>
    );
}

export default function CheckerOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchOrder = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiRequest(`/admin/checkers/${id}`);
            setOrder(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const handleDatamartCheck = async () => {
        setActionLoading('datamart');
        try {
            const response = await apiRequest(`/admin/checkers/${id}/check-datamart`, {
                method: 'POST',
            });
            setOrder(response.data.order);
            await fetchOrder();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRetryFulfillment = async () => {
        if (!window.confirm('Are you sure you want to retry the DataMart fulfillment for this order?')) {
            return;
        }

        setActionLoading('retry');
        try {
            const response = await apiRequest(`/admin/checkers/${id}/retry-fulfillment`, {
                method: 'POST',
            });
            setOrder(response.data.order);
            await fetchOrder();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleVerifyPayment = async () => {
        setActionLoading('verify');
        try {
            await apiRequest(`/admin/checkers/${id}/payments/verify`, {
                method: 'GET',
            });
            await fetchOrder();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return <div className="text-admin-text-secondary">Loading checker order...</div>;
    }

    if (error) {
        return <div className="text-red-400">Error: {error}</div>;
    }

    if (!order) return null;

    const canRetry = order.paymentStatus === 'successful' &&
        (order.fulfillmentStatus === 'failed' || order.fulfillmentStatus === 'pending' || order.fulfillmentStatus === 'fulfillment_pending');
    const canCheckDatamart = order.datamartReference;
    const canVerifyPayment = order.paymentStatus === 'pending';

    const timelineItems = [
        { label: 'Order Created', status: 'completed' },
        { label: 'Payment Initiated', status: order.paymentStatus === 'successful' ? 'completed' : order.paymentStatus === 'failed' ? 'failed' : 'pending' },
        { label: 'Payment Verified', status: order.paymentStatus === 'successful' ? 'completed' : order.paymentStatus === 'failed' ? 'failed' : 'pending' },
        { label: 'Sent to DataMart', status: order.datamartReference ? 'completed' : 'pending' },
        { label: 'DataMart Processing', status: ['processing', 'delivered', 'completed'].includes(order.fulfillmentStatus) ? 'completed' : order.fulfillmentStatus === 'failed' ? 'failed' : order.fulfillmentStatus === 'fulfillment_pending' ? 'pending' : 'pending' },
        { label: 'Completed', status: order.fulfillmentStatus === 'delivered' ? 'completed' : order.fulfillmentStatus === 'failed' ? 'failed' : 'pending' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin/checkers')}
                        className="text-admin-text-secondary hover:text-admin-text"
                    >
                        ← Back to Result Checkers
                    </button>
                    <h1 className="text-xl font-semibold text-admin-text">{order.reference}</h1>
                </div>

                <div className="flex gap-2">
                    {canVerifyPayment && (
                        <button
                            onClick={handleVerifyPayment}
                            disabled={actionLoading === 'verify'}
                            className="px-3 py-1.5 text-sm border border-admin-border rounded-lg hover:bg-admin-input disabled:opacity-50"
                        >
                            {actionLoading === 'verify' ? 'Verifying...' : 'Verify Payment'}
                        </button>
                    )}
                    {canCheckDatamart && (
                        <button
                            onClick={handleDatamartCheck}
                            disabled={actionLoading === 'datamart'}
                            className="px-3 py-1.5 text-sm border border-admin-border rounded-lg hover:bg-admin-input disabled:opacity-50"
                        >
                            {actionLoading === 'datamart' ? 'Checking...' : 'Check DataMart Status'}
                        </button>
                    )}
                    {canRetry && (
                        <button
                            onClick={handleRetryFulfillment}
                            disabled={actionLoading === 'retry'}
                            className="px-3 py-1.5 text-sm bg-brokeflex text-admin-bg font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {actionLoading === 'retry' ? 'Retrying...' : 'Retry Fulfillment'}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-admin-text mb-4">Order Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow label="Reference" value={order.reference} mono />
                            <DetailRow label="Checker Type" value={order.checkerType} />
                            <DetailRow label="Phone Number" value={order.phoneNumber} />
                            <DetailRow label="Customer Email" value={order.email} />
                            <DetailRow label="Amount Paid" value={formatPrice(order.amount)} />
                            <DetailRow label="DataMart Cost" value={order.datamartCost ? formatPrice(order.datamartCost) : '—'} />
                            <DetailRow label="Selling Price" value={order.sellingPrice ? formatPrice(order.sellingPrice) : '—'} />
                            <DetailRow label="Markup %" value={order.markupPercentage ? `${order.markupPercentage}%` : '—'} />
                            <DetailRow label="Paystack Fee" value={order.paystackFee ? formatPrice(order.paystackFee) : '—'} />
                            <DetailRow label="Paystack Amount" value={order.paystackAmount ? formatPrice(order.paystackAmount) : '—'} />
                            <DetailRow label="Created" value={new Date(order.createdAt).toLocaleString()} />
                            <DetailRow label="Updated" value={new Date(order.updatedAt).toLocaleString()} />
                        </div>
                    </div>

                    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-admin-text mb-4">Payment & Fulfillment</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow label="Payment Status" value={<StatusBadge status={order.paymentStatus} type="payment" />} />
                            <DetailRow label="Fulfillment Status" value={<StatusBadge status={order.fulfillmentStatus} type="fulfillment" />} />
                            <DetailRow label="Payment Reference" value={order.paymentReference} mono />
                            <DetailRow label="DataMart Purchase ID" value={order.datamartPurchaseId} mono />
                            <DetailRow label="DataMart Reference" value={order.datamartReference} mono />
                            <DetailRow label="DataMart Transaction ID" value={order.datamartTransactionId} mono />
                        </div>
                    </div>

                    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-admin-text mb-4">Checker Credentials</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow label="Serial Number" value={order.serialNumber} mono />
                            <DetailRow label="PIN" value={order.pin} mono />
                        </div>
                        {(!order.serialNumber || !order.pin) && order.fulfillmentStatus !== 'delivered' && (
                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-300">
                                    Credentials not yet available. They will be saved once the checker is purchased from DataMart.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-admin-text mb-4">Order Timeline</h2>
                        <div className="pl-2 space-y-0">
                            {timelineItems.map((item, index) => {
                                const isActive = item.status === 'completed';
                                const isFailed = item.status === 'failed';
                                const isPending = item.status === 'pending';

                                let dotColor = 'bg-text-tertiary';
                                let lineColor = 'bg-admin-border';

                                if (isActive) {
                                    dotColor = 'bg-green-400';
                                    lineColor = 'bg-green-400/30';
                                } else if (isFailed) {
                                    dotColor = 'bg-red-400';
                                    lineColor = 'bg-red-400/30';
                                } else if (isPending) {
                                    dotColor = 'bg-brokeflex';
                                    lineColor = 'bg-brokeflex/30';
                                }

                                return (
                                    <div key={item.label} className="relative pb-4 last:pb-0">
                                        {index < timelineItems.length - 1 && (
                                            <div className={`absolute left-3 top-8 bottom-0 w-0.5 ${lineColor}`}></div>
                                        )}
                                        <div className="relative flex items-start">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${dotColor} z-1`}>
                                                {isFailed && <span className="text-admin-bg text-xs">✕</span>}
                                            </div>
                                            <div className="ml-3">
                                                <p className={`text-sm font-medium ${isActive ? 'text-admin-text' : isFailed ? 'text-red-400' : isPending ? 'text-brokeflex' : 'text-admin-text-secondary'}`}>
                                                    {item.label}
                                                </p>
                                                {isPending && (
                                                    <p className="text-xs text-admin-text-secondary">In progress</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {order.datamartResponse && (
                        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-admin-text mb-4">DataMart Response</h2>
                            <div className="bg-admin-input rounded-lg p-3 overflow-x-auto">
                                <pre className="text-xs text-admin-text-secondary overflow-x-auto">
                                    {JSON.stringify(JSON.parse(order.datamartResponse), null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                        <h3 className="font-medium text-admin-text mb-3">Audit Trail</h3>
                        {order.auditTrail && order.auditTrail.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {order.auditTrail.map((entry) => (
                                    <div key={entry.id} className="text-xs">
                                        <div className="text-admin-text-secondary">
                                            {new Date(entry.changed_at).toLocaleString()}
                                        </div>
                                        <div className="text-admin-text">
                                            <span className="font-medium">{entry.field_changed}</span>:
                                            {' '}
                                            <span className="text-admin-text-secondary">
                                                {entry.old_value || '—'}
                                            </span>
                                            {' → '}
                                            <span className="font-medium">
                                                {entry.new_value || '—'}
                                            </span>
                                        </div>
                                        <div className="text-admin-text-secondary">
                                            by {entry.changed_by}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-admin-text-secondary">No audit records.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
