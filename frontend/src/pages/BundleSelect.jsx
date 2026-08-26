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
    const [usingCached, setUsingCached] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [callbackHandled, setCallbackHandled] = useState(false);

    const CACHE_KEY = 'brokeflex_bundles_cache';
    const CACHE_DURATION = 5 * 60 * 1000;

    const getCachedBundles = () => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > CACHE_DURATION) return null;
            return data;
        } catch {
            return null;
        }
    };

    const setCachedBundles = (data) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        } catch { }
    };

    const loadBundles = useCallback(async (isRetry = false) => {
        if (!isRetry) {
            const cached = getCachedBundles();
            if (cached && cached[networkCode] && cached[networkCode].length > 0) {
                setBundles(cached[networkCode]);
                setUsingCached(true);
            }
        }

        setBundlesLoading(true);
        setBundlesError(null);

        if (import.meta.env.DEV) {
            console.log('Loading bundles for networkCode:', networkCode);
        }

        try {
            const response = await fetchBundles(networkCode);
            const networkBundles = response.data[networkCode] || [];
            setBundles(networkBundles);
            setUsingCached(false);
            setCachedBundles(response.data);
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('Bundle load error:', err);
            }
            const hasCached = getCachedBundles();
            if (hasCached && hasCached[networkCode] && hasCached[networkCode].length > 0) {
                setBundles(hasCached[networkCode]);
                setUsingCached(true);
                return;
            }
            const status = err.response?.status;
            let message = 'We are temporarily unable to load data packages. Please try again shortly.';
            if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
                message = `Network error. Please check your connection and try again. (API: /api)`;
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

                    {usingCached && !bundlesLoading && (
                        <div className="mt-4 text-center">
                            <p className="text-xs text-tertiary">Showing cached data. Refreshing...</p>
                        </div>
                    )}

                    {bundlesError && (
                        <div className="mt-6">
                            <ErrorState
                                message={bundlesError}
                                onRetry={() => loadBundles(true)}
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
