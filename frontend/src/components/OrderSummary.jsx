import { NETWORK_CONFIG } from './NetworkSelector';
import { formatPrice } from './BundleGrid';
import { Info } from 'lucide-react';

export default function OrderSummary({ order, onBack, onPay, loading }) {
    const network = NETWORK_CONFIG[order.network] || NETWORK_CONFIG.MTN;

    const displayAmount = order.amount;

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-text-primary">
                    Order Summary
                </h2>

                <div className="flex items-center">
                    <div
                        className={`w-8 h-8 rounded-full ${network.bgClass} flex items-center justify-center flex-shrink-0`}
                    >
                        <span className={`font-bold text-xs ${network.colorClass}`}>
                            {network.label.charAt(0)}
                        </span>
                    </div>
                    <div className="ml-3">
                        <span className="font-medium text-text-primary">
                            {network.label}
                        </span>
                        <p className="text-sm text-secondary">
                            {network.description}
                        </p>
                    </div>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex justify-between">
                        <span className="text-secondary">Data Bundle</span>
                        <span className="font-medium text-text-primary">
                            {order.bundleCapacityString} GB
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-secondary">Recipient Number</span>
                        <span className="font-medium text-text-primary">
                            {order.phoneNumber}
                        </span>
                    </div>
                    {order.email && (
                        <div className="flex justify-between">
                            <span className="text-secondary">Email</span>
                            <span className="font-medium text-text-primary truncate max-w-[200px]">
                                {order.email}
                            </span>
                        </div>
                    )}
                    {order.contactNumber && (
                        <div className="flex justify-between">
                            <span className="text-secondary">Contact Number</span>
                            <span className="font-medium text-text-primary">
                                {order.contactNumber}
                            </span>
                        </div>
                    )}
                    <div className="border-t border-border pt-3 mt-3">
                        <div className="flex justify-between">
                            <span className="font-medium text-secondary">Total</span>
                            <span className="font-bold text-xl text-text-primary">
                                {formatPrice(displayAmount)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-text-secondary">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                        <strong className="font-medium text-text-primary">Delivery Notice:</strong> Data is usually delivered within a few moments after a successful payment. However, occasional network or provider delays may cause delivery to take longer than expected. Please do not make another purchase if your data has not arrived immediately. Your order will continue to be processed.
                    </p>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 py-3 px-4 border border-border text-text-secondary rounded-xl font-medium hover:bg-card-hover transition-colors"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={onPay}
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-brokeflex hover:bg-brokeflex-hover disabled:opacity-50 text-text-primary rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        'Pay'
                    )}
                </button>
            </div>
        </div>
    );
}
