import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const THEME_KEY = 'brokeflex-theme';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem(THEME_KEY);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial = saved ? saved === 'dark' : prefersDark;
        setIsDark(initial);
        applyTheme(initial);
    }, []);

    const applyTheme = (dark) => {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };

    const handleToggle = () => {
        const newValue = !isDark;
        setIsDark(newValue);
        applyTheme(newValue);
        localStorage.setItem(THEME_KEY, newValue ? 'dark' : 'light');
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            className="p-2 rounded-lg bg-card-hover border border-border text-text-secondary hover:text-brokeflex hover:border-brokeflex transition-all duration-200"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? (
                <Sun className="w-4 h-4" />
            ) : (
                <Moon className="w-4 h-4" />
            )}
        </button>
    );
}

export { THEME_KEY };
