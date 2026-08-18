import Logo from './Logo';

export default function LoadingSpinner({ text = 'Loading...' }) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 mb-4">
                <Logo size="lg" showText={false} />
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brokeflex"></div>
            <p className="mt-4 text-gray-600">{text}</p>
        </div>
    );
}
