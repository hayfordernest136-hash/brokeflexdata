import { useState } from 'react';
import { Search } from 'lucide-react';
import { checkOrder } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusCard from '../components/StatusCard';
import Logo from '../components/Logo';
import { NETWORK_CONFIG } from '../components/NetworkSelector';

export default function CheckOrder() {
    const [reference, setReference] = useState('');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setOrder(null);

        if (!reference.trim()) {
            setError('Please enter your order reference.');
            return;
        }

        const cleanRef = reference.trim().toUpperCase();
        if (!/^BFX-\d{10}$/.test(cleanRef)) {
            setError('Invalid order reference format. Example: BFX-1234567890');
            return;
        }

        setLoading(true);
        try {
            const response = await checkOrder(cleanRef);
            setOrder(response.data);
        } catch (err) {
            setError(
                err.message ||
                    'Order not found. Please check your reference and try again.'
            );
            setOrder(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg py-12">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Logo size="lg" showText={false} />
                    </div>
                    <h1 className="text-3xl font-semibold text-text-primary mb-2">
                        Check Your Order
                    </h1>
                    <p className="text-secondary">
                        Enter your Brokeflex order reference to view your order details.
                    </p>
                </div>

                <div className="bg-card border border-border rounded-xl shadow-xl p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary uppercase tracking-wider mb-2">
                                Order Reference
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                    <Search className="w-5 h-5 text-text-tertiary" />
                                </div>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                    placeholder="BFX-1234567890"
                    maxLength={14}
                                    style={{ textTransform: 'uppercase' }}
                                    className="w-full pl-12 pr-4 py-4 text-lg text-text-primary bg-card border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brokeflex/20 focus:border-brokeflex transition-colors placeholder-text-tertiary/50"
                                />
                            </div>
                            <p className="text-xs text-tertiary mt-1">
                                Your order reference starts with BFX-
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-brokeflex hover:bg-brokeflex-hover disabled:opacity-50 text-text-primary rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
                        >
                            {loading ? 'Searching...' : 'Check Order'}
                        </button>
                    </form>
                </div>

                {loading && (
                    <div className="mt-8">
                        <LoadingSpinner text="Searching for your order..." />
                    </div>
                )}

                {order && (
                    <div className="mt-8">
                                <StatusCard
                                    order={{
                                        ...order,
                                        network: NETWORK_CONFIG[order.network]?.label || order.network,
                                    }}
                                />
                    </div>
                )}
            </div>
        </div>
    );
}
