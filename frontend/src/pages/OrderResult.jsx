import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { checkOrder, checkCheckerOrder } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusCard from '../components/StatusCard';
import CheckerStatusCard from '../components/CheckerStatusCard';
import Logo from '../components/Logo';
import { NETWORK_CONFIG } from '../components/NetworkSelector';

export default function OrderResult() {
    const { reference } = useParams();
    const location = useLocation();
    const [order, setOrder] = useState(null);
    const [orderType, setOrderType] = useState(location.state?.type || 'bundle');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!reference) {
                setError('No order reference provided.');
                setLoading(false);
                return;
            }

            try {
                if (orderType === 'checker') {
                    const response = await checkCheckerOrder(reference);
                    setOrder(response.data);
                } else {
                    const response = await checkOrder(reference);
                    setOrder(response.data);
                }
            } catch (err) {
                if (orderType !== 'checker') {
                    try {
                        const checkerResponse = await checkCheckerOrder(reference);
                        setOrder(checkerResponse.data);
                        setOrderType('checker');
                    } catch {
                        setError(
                            err.message || 'Unable to fetch order details.'
                        );
                        setOrder(null);
                    }
                } else {
                    setError(
                        err.message || 'Unable to fetch order details.'
                    );
                    setOrder(null);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [reference, orderType]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center py-12">
                <LoadingSpinner text="Loading order details..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-semibold text-text-primary mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-secondary mb-6">{error}</p>
                    <Link
                        to="/check"
                        className="inline-block px-6 py-2 bg-brokeflex hover:bg-brokeflex-hover text-text-primary rounded-lg font-semibold transition-colors"
                    >
                        Check another order
                    </Link>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center py-12">
                <p className="text-secondary">No order data found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg py-12">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center space-x-3">
                    <Logo size="sm" showText={false} />
                    <Link
                        to="/"
                        className="text-sm text-tertiary hover:text-text-secondary"
                    >
                        ← Back to Home
                    </Link>
                </div>

                {orderType === 'checker' ? (
                    <CheckerStatusCard order={order} />
                ) : (
                    <StatusCard
                        order={{
                            ...order,
                            network: NETWORK_CONFIG[order.network]?.label || order.network,
                        }}
                        type="result"
                    />
                )}
            </div>
        </div>
    );
}
