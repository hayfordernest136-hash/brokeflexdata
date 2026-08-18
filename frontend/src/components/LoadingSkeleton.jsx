export default function LoadingSkeleton({ lines = 4 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-16 bg-card-hover border border-border rounded-xl animate-pulse"
                    style={{
                        width: `${100 - (i * 5)}%`,
                        marginLeft: `${i * 3}%`,
                    }}
                />
            ))}
        </div>
    );
}
