export default function Logo({ size = 'md', showText = true }) {
    const iconSize = {
        sm: 24,
        md: 32,
        lg: 40,
        xl: 56,
    };

    const width = iconSize[size];

    return (
        <div className="flex items-center space-x-2">
            <div className="relative flex-shrink-0 bg-card rounded">
                <img
                    src="/logo.png"
                    alt="Brokflex Data"
                    width={width}
                    height={width}
                    className="object-contain"
                />
            </div>
            {showText && (
                <span className="text-xl font-bold text-text-primary">
                    Brokeflex Data
                </span>
            )}
        </div>
    );
}
