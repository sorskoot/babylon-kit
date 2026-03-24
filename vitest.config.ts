import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({

    resolve: {
        alias: {
            '@engine': path.resolve(__dirname, 'src/engine'),
            '@game': path.resolve(__dirname, 'src/game'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/engine/**/*.ts'],
        },
    },
});
