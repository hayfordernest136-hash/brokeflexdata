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
                            Brokeflex Data makes it easy to buy affordable mobile data in Ghana and have it delivered directly to your phone.
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
                                to="/checkers"
                                className="inline-flex items-center justify-center px-8 py-4 border border-border text-text-secondary rounded-xl font-semibold text-lg hover:bg-card-hover transition-colors"
                            >
                                Result Checkers
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

                <section className="border-t border-border py-16">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-text-primary mb-2">Mobile Data</h2>
                                <p className="text-secondary text-sm leading-relaxed">
                                    Choose a network and bundle, pay securely, and receive your data on your phone without airtime or complicated steps.
                                </p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-text-primary mb-2">Track Your Order</h2>
                                <p className="text-secondary text-sm leading-relaxed">
                                    Use your order reference to check payment and delivery progress whenever you need an update.
                                </p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-text-primary mb-2">Result Checkers</h2>
                                <p className="text-secondary text-sm leading-relaxed">
                                    Get WAEC and BECE result checkers delivered to your email after a successful payment.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
