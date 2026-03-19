/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                midnight: '#0B061A',
                record: '#D4AF37',
                vinyl: '#CC5500',
                parchment: '#F5F5DC',
                panel: '#1A0F2E',
                'vu-green': '#34D399',
                success: '#34D399',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
                bebas: ['var(--font-bebas)', 'sans-serif'],
                space: ['var(--font-space)', 'monospace'],
            },
        },
    },
    plugins: [],
};
