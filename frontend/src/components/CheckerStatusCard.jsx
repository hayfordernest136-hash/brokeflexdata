import clsx from 'clsx';
import { CheckCircle, XCircle, Clock, AlertCircle, Copy } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { formatPrice } from './BundleGrid';

const STATUS_CONFIG = {
    pending: { label: 'Pending', icon: Clock, color: 'text-text-secondary', bg: 'bg-card-hover border-border' },
    processing: { label: 'Processing', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
    delivered: { label: 'Completed', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
    failed: { label: 'Failed', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
    fulfillment_pending: { label: 'Pending Fulfillment', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    successful: { label: 'Paid', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
};

function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
                config.color,
                config.bg
            )}
        >
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-GH', {
        timeZone: 'Africa/Accra',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function CopyButton({ text, label }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2">
            <div className="bg-admin-input border border-admin-border rounded-lg px-3 py-2 font-mono text-sm">
                {text || '—'}
            </div>
            <button
                onClick={copy}
                className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
                title={`Copy ${label}`}
            >
                <Copy className="w-4 h-4" />
            </button>
            {copied && (
                <span className="text-xs text-green-400 font-medium">Copied!</span>
            )}
        </div>
    );
}

import { useState } from 'react';

export default function CheckerStatusCard({ order }) {
    const isSuccess = order.fulfillmentStatus === 'delivered' && order.paymentStatus === 'successful';
    const isFailed = order.fulfillmentStatus === 'failed';
    const isProcessing =
        order.fulfillmentStatus === 'processing' ||
        order.fulfillmentStatus === 'pending' ||
        order.fulfillmentStatus === 'fulfillment_pending' ||
        (order.fulfillmentStatus === 'successful' && order.paymentStatus === 'successful' && order.fulfillmentStatus !== 'delivered');

    let title = '';
    let subtitle = '';
    let Icon = AlertCircle;
    let iconBg = 'bg-card-hover';

    if (order.paymentStatus === 'failed' && order.fulfillmentStatus !== 'delivered') {
        title = 'Payment Failed';
        subtitle = 'Your payment could not be completed. Please try again.';
        Icon = XCircle;
        iconBg = 'bg-red-500/10';
    } else if (isSuccess) {
        title = 'Result Checker Ready';
        subtitle = 'Your result checker has been successfully purchased.';
        Icon = CheckCircle;
        iconBg = 'bg-green-500/10';
    } else if (isFailed) {
        title = 'Purchase Failed';
        subtitle = 'Your payment was received, but we could not complete the checker purchase. Please keep your order reference for tracking.';
        Icon = XCircle;
        iconBg = 'bg-red-500/10';
    } else if (isProcessing) {
        if (order.fulfillmentStatus === 'processing' || order.fulfillmentStatus === 'fulfillment_pending') {
            title = 'Processing Your Purchase';
            subtitle = 'Your payment was received and your checker is being purchased from the provider.';
            Icon = Clock;
            iconBg = 'bg-blue-500/10';
        } else {
            title = 'Processing Your Order';
            subtitle = 'Your payment is being processed. Once confirmed, your checker will be purchased.';
            Icon = Clock;
            iconBg = 'bg-blue-500/10';
        }
    } else {
        title = 'Order Status';
        subtitle = 'Checking your order status...';
        Icon = AlertCircle;
        iconBg = 'bg-card-hover';
    }

    const detailRows = [
        { label: 'Order Reference', value: order.reference, mono: true },
        { label: 'Checker Type', value: order.checkerType },
        { label: 'Delivery Number', value: order.phoneNumber },
        { label: 'Email Address', value: order.email },
        { label: 'Amount Paid', value: formatPrice(order.paystackAmount || order.amount), bold: true },
        { label: 'Payment', value: <StatusBadge status={order.paymentStatus} /> },
        { label: 'Fulfillment', value: <StatusBadge status={order.fulfillmentStatus} /> },
        { label: 'Purchase Date', value: formatDate(order.createdAt) },
    ];

    return (
        <div className="bg-card border border-border rounded-xl shadow-xl p-6 sm:p-8">
            <div className="text-center mb-8">
                <div
                    className={clsx(
                        'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4',
                        iconBg
                    )}
                >
                    <Icon className="w-10 h-10 text-brokeflex" />
                </div>
                <h2 className="text-2xl font-semibold text-text-primary mb-2">
                    {title}
                </h2>
                <p className="text-secondary">{subtitle}</p>
            </div>

            <div className="bg-card-hover border border-border rounded-xl p-6 mb-8">
                <h3 className="text-xs font-medium text-secondary uppercase tracking-wider mb-4">
                    Order Details
                </h3>
                <div className="space-y-3">
                    {detailRows.map((row) => {
                        if (row.value === undefined || row.value === null || row.value === '') {
                            return null;
                        }
                        return (
                            <div key={row.label} className="flex justify-between">
                                <span className="text-secondary">{row.label}</span>
                                <span
                                    className={clsx(
                                        'font-medium',
                                        row.bold ? 'text-lg text-text-primary' : 'text-text-primary',
                                        row.mono ? 'font-mono text-xs' : ''
                                    )}
                                >
                                    {row.value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {isSuccess && order.serialNumber && order.pin && (
                <div className="bg-admin-input border border-admin-border rounded-xl p-6 mb-8">
                    <h3 className="text-xs font-medium text-admin-text-secondary uppercase tracking-wider mb-4">
                        Result Checker Credentials
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-secondary mb-2 block">Serial Number</label>
                            <CopyButton text={order.serialNumber} label="Serial Number" />
                        </div>
                        <div>
                            <label className="text-sm text-secondary mb-2 block">PIN</label>
                            <CopyButton text={order.pin} label="PIN" />
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-xs text-red-300">
                            Keep these credentials safe. Do not share them with anyone.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <NavLink
                    to="/check"
                    className="px-6 py-3 text-center border border-border text-text-secondary rounded-xl font-medium hover:bg-card-hover transition-colors"
                >
                    Check Another Order
                </NavLink>
                <NavLink
                    to="/checkers"
                    className="px-6 py-3 text-center bg-brokeflex hover:bg-brokeflex-hover text-text-primary rounded-xl font-semibold transition-colors"
                >
                    Buy Another Checker
                </NavLink>
            </div>
        </div>
    );
}
