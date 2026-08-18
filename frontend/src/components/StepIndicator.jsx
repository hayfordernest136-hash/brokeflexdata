export default function StepIndicator({ currentStep, steps }) {
    const getStepStatus = (index) => {
        if (index < currentStep) return 'complete';
        if (index === currentStep) return 'current';
        return 'pending';
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'complete':
                return 'bg-green-500 text-white';
            case 'current':
                return 'bg-brokeflex text-text-primary';
            default:
                return 'bg-card-hover text-text-tertiary';
        }
    };

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const status = getStepStatus(index);

                    return (
                        <div key={step.id} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`
                                        w-8 h-8 rounded-full flex items-center justify-center
                                        text-sm font-medium transition-all
                                        ${getStatusStyles(status)}
                                    `}
                                >
                                    {status === 'complete' ? (
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </div>
                                <p
                                    className={`mt-2 text-xs font-medium ${
                                        status === 'current'
                                            ? 'text-brokeflex'
                                            : status === 'complete'
                                            ? 'text-green-400'
                                            : 'text-text-tertiary'
                                    }`}
                                >
                                    {step.label}
                                </p>
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`
                                        h-0.5 w-full ml-4
                                        ${status === 'complete' ? 'bg-green-500' : 'bg-border'}
                                    `}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const BUY_DATA_STEPS = [
    { id: 'network', label: 'Network' },
    { id: 'bundle', label: 'Bundle' },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'summary', label: 'Summary' },
    { id: 'payment', label: 'Pay' },
    { id: 'result', label: 'Result' },
];
