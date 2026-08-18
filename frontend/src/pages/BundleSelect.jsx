import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { NETWORK_CONFIG } from '../components/NetworkSelector';
import BundleGrid, { formatPrice } from '../components/BundleGrid';
import PhoneNumberInput, { validateGhanaPhone } from '../components/PhoneNumberInput';
import BuyButton from '../components/BuyButton';
import TrustInfo from '../components/TrustInfo';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { fetchBundles, verifyPayment } from '../services/api';

const NETWORK_CODES = {
    mtn: 'YELLO',
    telecel: 'TELECEL',
    airteltigo: 'AT_PREMIUM',
};

const NETWORK_KEYS = {
    mtn: 'MTN',
    telecel: 'Telecel',
    airteltigo: 'AirtelTigo',
};

export default function BundleSelect() {
    const { network: networkParam } = useParams();
    const navigate = useNavigate();
    const query = new URLSearchParams(useLocation().search);

    const networkKey = NETWORK_KEYS[networkParam] || 'MTN';
    const networkCode = NETWORK_CODES[networkParam] || 'YELLO';

    const [selectedBundle, setSelectedBundle] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [bundles, setBundles] = useState([]);
    const [bundlesLoading, setBundlesLoading] = useState(false);
    const [bundlesError, setBundlesError] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [callbackHandled, setCallbackHandled] = useState(false);

    const handlePaymentCallback = useCallback(
        async (brokeflexRef, paystackRef) => {
            setProcessingPayment(true);
            setSubmitError(null);
            try {
                const response = await verifyPayment(brokeflexRef, paystackRef);
                const order = response.data.order;
                navigate(`/order/${order.reference}`, { replace: true });
            } catch (err) {
                setSubmitError(err.message || 'Failed to verify payment.');
                setProcessingPayment(false);
            }
        },
        [navigate]
    );

    useEffect(() => {
        const callbackRef = query.get('callback_ref');
        const paystackRef = query.get('trxref') || query.get('reference');

        if (callbackRef && paystackRef && !callbackHandled) {
            setCallbackHandled(true);
            handlePaymentCallback(callbackRef, paystackRef);
        }
    }, [query, handlePaymentCallback, callbackHandled]);

    const loadBundles = useCallback(async () => {
        setBundlesLoading(true);
        setBundlesError(null);

        if (import.meta.env.DEV) {
            console.log('Loading bundles for networkCode:', networkCode, 'API base:', import.meta.env.VITE_API_BASE_URL);
        }

        try {
            const response = await fetchBundles(networkCode);
            const networkBundles = response.data[networkCode] || [];
            setBundles(networkBundles);
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('Bundle load error:', err);
            }
            const status = err.response?.status;
            const apiUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost') ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');
            let message = 'We are temporarily unable to load data packages. Please try again shortly.';
            if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
                message = `Network error. Please check your connection and try again. (API: ${apiUrl})`;
            } else if (status === 401) {
                message = 'Authentication error. Please contact support.';
            } else if (status === 503) {
                message = 'Service temporarily unavailable. Please try again in a few minutes.';
            }
            setBundlesError(message);
            setBundles([]);
        } finally {
            setBundlesLoading(false);
        }
    }, [networkCode]);

    useEffect(() => {
        loadBundles();
    }, [loadBundles]);

    const handleBundleSelect = (bundle) => {
        setSelectedBundle(bundle);
    };

    const handleBuyData = () => {
        if (!validateGhanaPhone(phoneNumber)) {
            return;
        }

        navigate('/checkout', {
            state: {
                network: networkKey,
                bundle: selectedBundle,
                phoneNumber: phoneNumber,
            },
        });
    };

    const isReadyToBuy = selectedBundle && validateGhanaPhone(phoneNumber);

    if (processingPayment || (query.get('callback_ref') && query.get('trxref'))) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center py-12">
                <div className="text-center">
                    <LoadingSpinner text="Verifying your payment..." />
                    {submitError && <p className="text-red-400 mt-4">{submitError}</p>}
                </div>
            </div>
        );
    }

    if (!networkParam || !NETWORK_CODES[networkParam]) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center py-12">
                <div className="text-center">
                    <p className="text-secondary">Invalid network selection.</p>
                    <button
                        onClick={() => navigate('/buy')}
                        className="mt-4 px-4 py-2 bg-brokeflex text-text-primary rounded-lg"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg py-12">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-card border border-border rounded-xl shadow-xl p-6 sm:p-8">
                    <div className="mb-8">
                        <div className="flex items-center mb-2">
                            <button
                                type="button"
                                onClick={() => navigate('/buy')}
                                className="text-tertiary hover:text-text-secondary mr-2"
                            >
                                ←
                            </button>
                            <h2 className="text-sm font-medium text-secondary uppercase tracking-wider">
                                SELECT DATA SIZE
                            </h2>
                        </div>
                        <p className="text-sm text-secondary flex items-center gap-2">
                            <img
                                src={NETWORK_CONFIG[networkKey]?.image}
                                alt={NETWORK_CONFIG[networkKey]?.label}
                                className="w-6 h-6 object-contain"
                            />
                            Select the amount of data you want to purchase for {NETWORK_CONFIG[networkKey]?.label}.
                        </p>
                    </div>

                    {selectedBundle && (
                        <div className="flex justify-end mb-4">
                            <span className="font-bold text-2xl text-brokeflex">
                                {formatPrice(selectedBundle.price)}
                            </span>
                        </div>
                    )}

                    <BundleGrid
                        bundles={bundles}
                        selectedBundle={selectedBundle}
                        onSelect={handleBundleSelect}
                        loading={bundlesLoading}
                        error={bundlesError}
                    />

                    {bundlesError && (
                        <div className="mt-6">
                            <ErrorState
                                message={bundlesError}
                                onRetry={loadBundles}
                            />
                        </div>
                    )}

                    {submitError && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                            {submitError}
                        </div>
                    )}

                    <div className="mt-8 mb-6">
                        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-2">
                            ENTER DELIVERY NUMBER
                        </h2>
                        <p className="text-sm text-secondary mb-4">
                            Enter the phone number that should receive the data.
                        </p>
                        <PhoneNumberInput
                            value={phoneNumber}
                            onChange={setPhoneNumber}
                            error={null}
                            showLabel={false}
                        />
                    </div>

                        <BuyButton
                            onClick={handleBuyData}
                            disabled={!isReadyToBuy}
                        >
                            Buy Data
                        </BuyButton>

                    <div className="mt-6">
                        <TrustInfo />
                    </div>
                </div>
            </div>
        </div>
    );
}
