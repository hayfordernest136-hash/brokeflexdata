import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="min-h-screen bg-bg flex flex-col">
            <main className="flex-1">
                <section className="py-16 sm:py-24">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-semibold text-text-primary mb-6">
                            Buy Data. <span className="text-brokeflex">Simple.</span> <span className="text-brokeflex">Fast.</span>
                        </h1>
                        <p className="text-lg text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
                            Get affordable mobile data delivered directly to your phone.
                        </p>

                        <p className="text-sm text-tertiary mb-10 tracking-wider">
                            MTN · Telecel · AirtelTigo
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/buy"
                                className="inline-flex items-center justify-center px-8 py-4 bg-brokeflex hover:bg-brokeflex-hover text-text-primary rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
                            >
                                Buy Data
                            </Link>
                            <Link
                                to="/check"
                                className="inline-flex items-center justify-center px-8 py-4 border border-border text-text-secondary rounded-xl font-semibold text-lg hover:bg-card-hover transition-colors"
                            >
                                Check Order
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
