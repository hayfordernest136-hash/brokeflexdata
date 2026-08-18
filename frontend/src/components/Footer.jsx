import Logo from './Logo';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-border mt-auto py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-3 mb-4 md:mb-0">
                        <Logo size="sm" showText={false} />
                        <span className="text-tertiary text-sm">
                            &copy; {year} Brokeflex Data. All rights reserved.
                        </span>
                    </div>
                    <div className="flex space-x-6">
                        <a
                            href="#"
                            className="text-tertiary hover:text-text-secondary text-sm transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="#"
                            className="text-tertiary hover:text-text-secondary text-sm transition-colors"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="#"
                            className="text-tertiary hover:text-text-secondary text-sm transition-colors"
                        >
                            Contact
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
