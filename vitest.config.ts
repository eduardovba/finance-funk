import path from 'path';

export default {
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            include: ['src/lib/**', 'src/app/api/**'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
};
