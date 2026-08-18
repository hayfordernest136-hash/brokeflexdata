import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

function DetailRow({ label, value }) {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div className="flex justify-between py-2 border-b border-admin-border last:border-0">
            <span className="text-admin-text-secondary">{label}</span>
            <span className="text-admin-text font-medium">{value}</span>
        </div>
    );
}

function TimelineItem({ label, status, isLast }) {
    const isActive = status === 'active' || status === 'completed';
    const isFailed = status === 'failed';
    const isPending = status === 'pending';

    let dotColor = 'bg-text-tertiary';
    let textColor = 'text-admin-text-secondary';
    let lineColor = 'bg-admin-border';

    if (isActive) {
        dotColor = 'bg-green-400';
        textColor = 'text-admin-text';
        lineColor = 'bg-green-400/30';
    } else if (isFailed) {
        dotColor = 'bg-red-400';
        textColor = 'text-red-400';
        lineColor = 'bg-red-400/30';
    } else if (isPending) {
        dotColor = 'bg-brokeflex';
        textColor = 'text-brokeflex';
        lineColor = 'bg-brokeflex/30';
    }

    return (
        <div className="relative pb-4 last:pb-0">
            {!isLast && (
                <div className={`absolute left-3 top-8 bottom-0 w-0.5 ${lineColor}`}></div>
            )}
            <div className="relative flex items-start">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${dotColor} z-1`}>
                    {isFailed && (
                        <span className="text-admin-bg">✕</span>
                    )}
                </div>
                <div className="ml-3">
                    <p className={`text-sm font-medium ${textColor}`}>{label}</p>
                    {isPending && (
                        <p className="text-xs text-admin-text-secondary">In progress</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function OrderDetail() {
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
            const response = await apiRequest(`/admin/orders/${id}`);
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
            const response = await apiRequest(`/admin/orders/${id}/check-datamart`, {
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
            const response = await apiRequest(`/admin/orders/${id}/retry-fulfillment`, {
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
            await apiRequest(`/admin/orders/${id}/payments/verify`, {
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
        return <div className="text-admin-text-secondary">Loading order...</div>;
    }

    if (error) {
        return <div className="text-red-400">Error: {error}</div>;
    }

    if (!order) return null;

    const canRetry = order.paymentStatus === 'successful' &&
        (order.fulfillmentStatus === 'failed' || order.fulfillmentStatus === 'pending');
    const canCheckDatamart = order.datamartOrderReference || order.datamartTransactionReference;
    const canVerifyPayment = order.paymentStatus === 'pending';

    const timelineItems = [
        { label: 'Order Created', status: 'completed' },
        { label: 'Payment Initiated', status: order.paymentStatus === 'successful' ? 'completed' : order.paymentStatus === 'failed' ? 'failed' : 'pending' },
        { label: 'Payment Verified', status: order.paymentStatus === 'successful' ? 'completed' : order.paymentStatus === 'failed' ? 'failed' : 'pending' },
        { label: 'Sent to DataMart', status: order.datamartPurchaseId ? 'completed' : 'pending' },
        { label: 'DataMart Processing', status: ['processing', 'delivered'].includes(order.fulfillmentStatus) ? 'completed' : order.fulfillmentStatus === 'failed' ? 'failed' : 'pending' },
        { label: 'Delivered', status: order.fulfillmentStatus === 'delivered' ? 'completed' : order.fulfillmentStatus === 'failed' ? 'failed' : 'pending' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin/orders')}
                        className="text-admin-text-secondary hover:text-admin-text"
                    >
                        ← Back to Orders
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
                            <DetailRow label="Reference" value={order.reference} />
                            <DetailRow label="Network" value={order.network} />
                            <DetailRow label="Bundle" value={`${order.bundleCapacityString} GB`} />
                            <DetailRow label="Amount" value={formatPrice(order.amount)} />
                            <DetailRow label="Phone Number" value={order.phoneNumber} />
                            <DetailRow label="Contact Number" value={order.contactNumber} />
                            <DetailRow label="Email" value={order.email} />
                            <DetailRow label="Created" value={new Date(order.createdAt).toLocaleString()} />
                        </div>
                    </div>

                    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-admin-text mb-4">Payment Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow label="Status" value={<StatusBadge status={order.paymentStatus} type="payment" />} />
                            <DetailRow label="Payment Reference" value={order.paymentReference} />
                            <DetailRow label="Selling Price" value={order.sellingPrice ? formatPrice(order.sellingPrice) : '—'} />
                            <DetailRow label="DataMart Cost" value={order.datamartCost ? formatPrice(order.datamartCost) : '—'} />
                            <DetailRow label="Paystack Fee" value={order.paystackFee ? formatPrice(order.paystackFee) : '—'} />
                            <DetailRow label="Paystack Amount" value={order.paystackAmount ? formatPrice(order.paystackAmount) : '—'} />
                        </div>
                    </div>

                    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-admin-text mb-4">DataMart Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow label="Purchase ID" value={order.datamartPurchaseId} />
                            <DetailRow label="Order Reference" value={order.datamartOrderReference} />
                            <DetailRow label="Transaction Reference" value={order.datamartTransactionReference} />
                            <DetailRow
                                label="Fulfillment Status"
                                value={<StatusBadge status={order.fulfillmentStatus} type="fulfillment" />}
                            />
                        </div>
                        {order.datamartResponse && (
                            <div className="mt-4 p-3 bg-admin-input rounded-lg">
                                <pre className="text-xs text-admin-text-secondary overflow-x-auto">
                                    {JSON.stringify(JSON.parse(order.datamartResponse), null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>

                    {order.auditTrail && order.auditTrail.length > 0 && (
                        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-admin-text mb-4">Order Timeline</h2>
                            <div className="pl-2">
                                {timelineItems.map((item, index) => (
                                    <TimelineItem
                                        key={item.label}
                                        label={item.label}
                                        status={item.status}
                                        isLast={index === timelineItems.length - 1}
                                    />
                                ))}
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
