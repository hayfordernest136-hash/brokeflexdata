import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createOrder, initiatePayment, verifyPayment } from '../services/api';
import EmailInput, { validateEmail } from '../components/EmailInput';
import PhoneNumberInput, { validateGhanaPhone } from '../components/PhoneNumberInput';
import OrderSummary from '../components/OrderSummary';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CheckoutPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state;

    const [email, setEmail] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [emailError, setEmailError] = useState('');
    const [contactError, setContactError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [callbackHandled, setCallbackHandled] = useState(false);

    const handlePaymentCallback = useCallback(
        async (brokeflexRef, paystackRef) => {
            setIsCreatingOrder(true);
            setSubmitError('');
            try {
                const response = await verifyPayment(brokeflexRef, paystackRef);
                const order = response.data.order;
                navigate(`/order/${order.reference}`, { replace: true });
            } catch (err) {
                setSubmitError(
                    err.message || 'Failed to verify payment. Please try again.'
                );
                setIsCreatingOrder(false);
            }
        },
        [navigate]
    );

    useEffect(() => {
        const callbackRef = new URLSearchParams(window.location.search).get('callback_ref');
        const paystackRef =
            new URLSearchParams(window.location.search).get('trxref') ||
            new URLSearchParams(window.location.search).get('reference');

        if (callbackRef && paystackRef && !callbackHandled) {
            setCallbackHandled(true);
            handlePaymentCallback(callbackRef, paystackRef);
        }
    }, [navigate, handlePaymentCallback, callbackHandled]);

    useEffect(() => {
        const callbackRef = new URLSearchParams(window.location.search).get('callback_ref');
        if (callbackRef || !state || !state.network || !state.bundle || !state.phoneNumber) {
            if (!callbackRef) {
                navigate('/buy', { replace: true });
            }
        }
    }, [state, navigate]);

    if (!state?.network || !state?.bundle || !state?.phoneNumber) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <LoadingSpinner text="Loading..." />
            </div>
        );
    }

    const { network, bundle, phoneNumber } = state;
    const networkKey = network;

    const handlePay = async () => {
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            setEmailError(emailValidation.message);
            return;
        }
        setEmailError('');

        if (!validateGhanaPhone(contactNumber)) {
            setContactError('Please enter a valid Ghanaian phone number.');
            return;
        }
        setContactError('');
        setSubmitError('');
        setIsCreatingOrder(true);

        try {
            const orderResponse = await createOrder({
                network: networkKey,
                bundleCapacity: bundle.capacity,
                bundleCapacityString: bundle.capacityString,
                phoneNumber: phoneNumber,
                email: email.trim().toLowerCase(),
                contactNumber: contactNumber,
            });

            const orderInfo = orderResponse.data;
            const paymentResponse = await initiatePayment(orderInfo.reference);
            const paymentInfo = paymentResponse.data;

            setTimeout(() => {
                window.location.href = paymentInfo.authorizationUrl;
            }, 2000);
        } catch (err) {
            setSubmitError(
                err.message || 'Failed to process payment. Please try again.'
            );
            setIsCreatingOrder(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-semibold text-text-primary mb-2">
                        Complete Your Order
                    </h1>
                    <p className="text-secondary">
                        Enter your details to complete your purchase.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <EmailInput
                                value={email}
                                onChange={setEmail}
                                error={emailError}
                                supportingText="Your order confirmation will be sent here."
                            />
                        </div>

                        <div>
                            <PhoneNumberInput
                                value={contactNumber}
                                onChange={setContactNumber}
                                error={contactError}
                                label="Contact Number"
                                showLabel={true}
                                supportingText="Used if we need to reach you about your order."
                            />
                        </div>

                        {submitError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                                {submitError}
                            </div>
                        )}

                        {isCreatingOrder && (
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-400">
                                <div className="font-medium">Redirecting to Paystack...</div>
                            </div>
                        )}

                        <div className="lg:hidden">
                            <OrderSummary
                                order={{
                                    network: networkKey,
                                    bundleCapacityString: bundle.capacityString,
                                    phoneNumber: phoneNumber,
                                    email: email || undefined,
                                    contactNumber: contactNumber || undefined,
                                    amount: bundle.price,
                                }}
                                onPay={handlePay}
                                loading={isCreatingOrder}
                            />
                        </div>
                    </div>

                    <div className="hidden lg:block">
                        <OrderSummary
                            order={{
                                network: networkKey,
                                bundleCapacityString: bundle.capacityString,
                                phoneNumber: phoneNumber,
                                email: email || undefined,
                                contactNumber: contactNumber || undefined,
                                amount: bundle.price,
                            }}
                            onPay={handlePay}
                            loading={isCreatingOrder}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
