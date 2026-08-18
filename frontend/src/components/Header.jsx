import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const NAVIGATION = [
    { name: 'Home', to: '/' },
    { name: 'Buy Data', to: '/buy' },
    { name: 'Check Order', to: '/check' },
];

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('brokeflex-theme');
        const isDark = saved ? saved === 'dark' : true;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }, []);

    return (
        <header className="sticky top-0 z-50 border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex-shrink-0">
                        <Logo size="lg" showText={true} />
                    </Link>

                    <nav className="hidden md:flex space-x-8 items-center">
                        {NAVIGATION.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'text-brokeflex'
                                            : 'text-secondary hover:text-text-primary'
                                    }`
                                }
                            >
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center space-x-3">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden p-2 rounded-lg bg-card-hover border border-border text-text-secondary hover:text-brokeflex hover:border-brokeflex transition-all duration-200"
                            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        >
                            {menuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {menuOpen && (
                <div className="md:hidden bg-card border-t border-border">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {NAVIGATION.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `block px-4 py-3 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'text-brokeflex bg-brokeflex-subtle'
                                            : 'text-secondary hover:text-text-primary hover:bg-card-hover'
                                    }`
                                }
                            >
                                {item.name}
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
}
