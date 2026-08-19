import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchCheckerProducts, createCheckerOrder, initiateCheckerPayment, verifyCheckerPayment } from '../services/api';
import PhoneNumberInput, { validateGhanaPhone } from '../components/PhoneNumberInput';
import EmailInput, { validateEmail } from '../components/EmailInput';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { formatPrice } from '../components/BundleGrid';
import { CheckCircle, XCircle, Smartphone } from 'lucide-react';

const CHECKER_MARKUP = 15;

function calculateCheckerSellingPrice(datamartPrice) {
    const pesewas = Math.round(datamartPrice * 100);
    const markupPesewas = Math.round(pesewas * (CHECKER_MARKUP / 100));
    const totalPesewas = pesewas + markupPesewas;
    return totalPesewas / 100;
}

function getCheckerPrice(product) {
    return calculateCheckerSellingPrice(product.price);
}

const CHECKER_CONFIG = {
    WAEC: {
        label: 'WAEC Result Checker',
        description: 'Check your West African Examination Council (WAEC) results.',
        icon: <GraduationCapIcon />,
        borderColor: 'border-brokeflex',
        bgColor: 'bg-brokeflex-subtle',
    },
    BECE: {
        label: 'BECE Result Checker',
        description: 'Check your Basic Education Certificate Examination (BECE) results.',
        icon: <SchoolIcon />,
        borderColor: 'border-brokeflex',
        bgColor: 'bg-brokeflex-subtle',
    },
};

function GraduationCapIcon() {
    return (
        <svg className="w-7 h-7 text-brokeflex" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="square" strokeLinejoin="square" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="square" strokeLinejoin="square" strokeWidth="2" d="M12 14l6.5-3.5-6.5 4.5-6.5-4.5L12 14z" />
            <path strokeLinecap="square" strokeLinejoin="square" strokeWidth="2" d="M12 14L5.5 10.5 12 14z" />
        </svg>
    );
}

function SchoolIcon() {
    return (
        <svg className="w-7 h-7 text-brokeflex" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="square" strokeLinejoin="square" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="square" strokeLinejoin="square" strokeWidth="2" d="M12 14l6.5-3.5-6.5 4.5-6.5-4.5L12 14z" />
        </svg>
    );
}

function CheckerCard({ product, isSelected, onSelect }) {
    const config = CHECKER_CONFIG[product?.name] || CHECKER_CONFIG.WAEC;
    const isAvailable = product?.inStock && product?.stockCount > 0;

    return (
        <button
            type="button"
            onClick={() => isAvailable && onSelect(product)}
            disabled={!isAvailable}
            className="w-full text-left"
        >
            <div
                className={`
                    bg-card border-2 rounded-xl p-6 transition-all duration-200
                    ${isSelected ? config.borderColor + ' ring-2 ring-brokeflex/20' : 'border-border'}
                    ${!isAvailable ? 'opacity-60 cursor-not-allowed' : 'hover:border-hover cursor-pointer'}
                `}
            >
                <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                        {config.icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-text-primary">{config.label}</h3>
                        <p className="text-sm text-secondary mt-1">{config.description}</p>
                    </div>
                    <div className="text-right">
                        <span className="font-bold text-2xl text-brokeflex">{formatPrice(getCheckerPrice(product))}</span>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {isAvailable ? (
                            <>
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-green-400 font-medium">Available</span>
                                <span className="text-xs text-tertiary">({product?.stockCount} in stock)</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-red-400 font-medium">Out of Stock</span>
                            </>
                        )}
                    </div>
                    {!isAvailable && (
                        <span className="text-xs font-medium text-red-400">Currently unavailable</span>
                    )}
                </div>
            </div>
        </button>
    );
}

export default function ResultCheckers() {
    const navigate = useNavigate();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const callbackRef = query.get('callback_ref');
    const paystackRef = query.get('trxref') || query.get('reference');

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedChecker, setSelectedChecker] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [submitError, setSubmitError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [callbackHandled, setCallbackHandled] = useState(false);

    const loadProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchCheckerProducts();
            const productList = response.data || [];
            const validProducts = productList.filter(p => p.name === 'WAEC' || p.name === 'BECE');
            setProducts(validProducts);
        } catch (err) {
            setError(err.message || 'Failed to load result checkers.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const handlePaymentCallback = useCallback(
        async (brokeflexRef, paystackReference) => {
            setIsProcessing(true);
            setSubmitError(null);
            try {
                const response = await verifyCheckerPayment(brokeflexRef, paystackReference);
                const order = response.data.order;
                navigate(`/order/${order.reference}`, { replace: true, state: { type: 'checker' } });
            } catch (err) {
                setSubmitError(err.message || 'Failed to verify payment.');
                setIsProcessing(false);
            }
        },
        [navigate]
    );

    useEffect(() => {
        if (callbackRef && paystackRef && !callbackHandled) {
            setCallbackHandled(true);
            handlePaymentCallback(callbackRef, paystackRef);
        }
    }, [callbackRef, paystackRef, callbackHandled, handlePaymentCallback]);

    if (callbackRef && paystackRef && !callbackHandled) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center py-12">
                <div className="text-center">
                    <LoadingSpinner text="Verifying your payment..." />
                    {submitError && <p className="text-red-400 mt-4">{submitError}</p>}
                </div>
            </div>
        );
    }

    const handleSelect = (product) => {
        setSelectedChecker(product);
        setSubmitError('');
    };

    const handleContinueToPayment = async () => {
        setPhoneError('');
        setEmailError('');
        setSubmitError('');

        if (!validateGhanaPhone(phoneNumber)) {
            setPhoneError('Please enter a valid Ghanaian phone number.');
            return;
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            setEmailError(emailValidation.message);
            return;
        }

        setIsProcessing(true);
        try {
            const orderResponse = await createCheckerOrder({
                checkerType: selectedChecker.name,
                phoneNumber: phoneNumber,
                email: email.trim().toLowerCase()
            });

            const orderInfo = orderResponse.data;
            const paymentResponse = await initiateCheckerPayment(orderInfo.reference);
            const paymentInfo = paymentResponse.data;

            setTimeout(() => {
                window.location.href = paymentInfo.authorizationUrl;
            }, 1000);
        } catch (err) {
            setSubmitError(err.message || 'Failed to process. Please try again.');
            setIsProcessing(false);
        }
    };

    const selectedProduct = selectedChecker;
    const selectedConfig = CHECKER_CONFIG[selectedChecker?.name] || CHECKER_CONFIG.WAEC;

    return (
        <div className="min-h-screen bg-bg py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {!selectedChecker ? (
                    <div>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-semibold text-text-primary mb-2">
                                Result Checkers
                            </h1>
                            <p className="text-secondary">
                                Get your WAEC or BECE result checker instantly. The serial number and PIN are delivered to your email after payment.
                            </p>
                        </div>

                        {loading ? (
                            <div className="text-center py-16">
                                <LoadingSpinner text="Loading checker products..." />
                            </div>
                        ) : error ? (
                            <ErrorState message={error} onRetry={loadProducts} />
                        ) : products.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-secondary">No result checkers available at the moment. Please try again later.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {products.map((product) => (
                                    <CheckerCard
                                        key={product.id}
                                        product={product}
                                        isSelected={selectedChecker?.id === product.id}
                                        onSelect={handleSelect}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center mb-6">
                            <button
                                type="button"
                                onClick={() => setSelectedChecker(null)}
                                className="text-tertiary hover:text-text-secondary mr-3"
                            >
                                ←
                            </button>
                            <h1 className="text-2xl font-semibold text-text-primary">
                                {selectedConfig.label}
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
                                        CHECKER DETAILS
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-sm text-secondary">Type</span>
                                            <span className="ml-2 font-medium text-text-primary">{selectedProduct.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-secondary">Description</span>
                                            <span className="ml-2 font-medium text-text-primary">{selectedProduct.description}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-secondary">Price</span>
                                            <span className="ml-2 font-bold text-2xl text-brokeflex">{formatPrice(selectedProduct.price)}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-secondary">Stock</span>
                                            <span className="ml-2 font-medium text-green-400">
                                                {selectedProduct.inStock && selectedProduct.stockCount > 0
                                                    ? `${selectedProduct.stockCount} available`
                                                    : 'Out of stock'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                         <div className="bg-card border border-border rounded-xl p-6">
                             <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
                                 CUSTOMER INFORMATION
                             </h2>
                             <div className="space-y-4">
                                 <div>
                                     <label className="block text-sm font-medium text-text-secondary mb-1">
                                         Delivery Number
                                     </label>
                                     <PhoneNumberInput
                                         value={phoneNumber}
                                         onChange={setPhoneNumber}
                                         error={phoneError}
                                         showLabel={false}
                                     />
                                     <p className="text-xs text-tertiary mt-1">Enter your phone number</p>
                                 </div>

                                 <div>
                                     <label className="block text-sm font-medium text-text-secondary mb-1">
                                         Email Address
                                     </label>
                                     <EmailInput
                                         value={email}
                                         onChange={setEmail}
                                         error={emailError}
                                         showLabel={false}
                                     />
                                     <p className="text-xs text-tertiary mt-1">Enter your email address</p>
                                 </div>
                             </div>
                         </div>

                                {submitError && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                                        {submitError}
                                    </div>
                                )}

                                {isProcessing && (
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-400">
                                        <div className="font-medium">Redirecting to Paystack...</div>
                                    </div>
                                )}
                            </div>

                            <div className="lg:mt-0 mt-6">
                                <div className="bg-card border border-border rounded-xl p-6 sticky top-4">
                                    <h2 className="text-lg font-semibold text-text-primary mb-4">Order Summary</h2>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-secondary">Checker Type</span>
                                            <span className="font-medium text-text-primary">{selectedProduct.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-secondary">Delivery Number</span>
                                            <span className="font-medium text-text-primary">{phoneNumber || '—'}</span>
                                        </div>
                                        <div className="border-t border-border pt-3 mt-3">
                                        <div className="flex justify-between">
                                            <span className="text-secondary">Price</span>
                                            <span className="font-bold text-xl text-brokeflex">{formatPrice(getCheckerPrice(selectedProduct))}</span>
                                        </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleContinueToPayment}
                                        disabled={isProcessing || !phoneNumber || !email || !selectedProduct.inStock}
                                        className="w-full mt-6 py-4 px-6 bg-brokeflex hover:bg-brokeflex-hover disabled:opacity-50 text-text-primary rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                                    >
                                        {isProcessing ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Smartphone className="w-5 h-5" />
                                        )}
                                        {isProcessing ? 'Processing...' : 'Continue to Payment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
