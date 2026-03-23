import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetManager } from '../../src/engine/services/assets/assetManager';
import type { IAssetLoader } from '../../src/engine/core/types';

class MockLoader implements IAssetLoader<string> {
    supportedExtensions = ['txt', 'json'];
    loadFn = vi
        .fn<(url: string) => Promise<string>>()
        .mockResolvedValue('loaded-data');

    async load(url: string): Promise<string> {
        return this.loadFn(url);
    }
}

describe('AssetManager', () => {
    let manager: AssetManager;
    let loader: MockLoader;

    beforeEach(() => {
        manager = new AssetManager();
        loader = new MockLoader();
        manager.registerLoader(loader);
    });

    describe('load', () => {
        it('loads an asset via registered loader', async () => {
            const result = await manager.load<string>(
                'myFile',
                'assets/data.txt',
            );
            expect(result).toBe('loaded-data');
            expect(loader.loadFn).toHaveBeenCalledWith('assets/data.txt');
        });

        it('returns cached asset on subsequent load', async () => {
            await manager.load('myFile', 'assets/data.txt');
            await manager.load('myFile', 'assets/data.txt');
            expect(loader.loadFn).toHaveBeenCalledTimes(1);
        });

        it('deduplicates concurrent loads for same key', async () => {
            const p1 = manager.load('myFile', 'assets/data.txt');
            const p2 = manager.load('myFile', 'assets/data.txt');
            const [r1, r2] = await Promise.all([p1, p2]);
            expect(r1).toBe(r2);
            expect(loader.loadFn).toHaveBeenCalledTimes(1);
        });

        it('throws for unknown extension', async () => {
            await expect(manager.load('x', 'file.xyz')).rejects.toThrow(
                'No loader registered for extension "xyz"',
            );
        });

        it('handles query params in url', async () => {
            await manager.load('myFile', 'assets/data.txt?v=123');
            expect(loader.loadFn).toHaveBeenCalledWith('assets/data.txt?v=123');
        });
    });

    describe('cache management', () => {
        it('retrieves cached asset with get', async () => {
            await manager.load('key1', 'data.txt');
            expect(manager.get('key1')).toBe('loaded-data');
        });

        it('returns undefined for missing cache entry', () => {
            expect(manager.get('nope')).toBeUndefined();
        });

        it('reports has correctly', async () => {
            expect(manager.has('key1')).toBe(false);
            await manager.load('key1', 'data.txt');
            expect(manager.has('key1')).toBe(true);
        });

        it('unloads an asset', async () => {
            await manager.load('key1', 'data.txt');
            manager.unload('key1');
            expect(manager.has('key1')).toBe(false);
        });

        it('clears all assets', async () => {
            await manager.load('a', 'a.txt');
            await manager.load('b', 'b.txt');
            manager.clear();
            expect(manager.getLoadedKeys()).toHaveLength(0);
        });

        it('lists loaded keys', async () => {
            await manager.load('a', 'a.txt');
            await manager.load('b', 'b.txt');
            expect(manager.getLoadedKeys()).toEqual(
                expect.arrayContaining(['a', 'b']),
            );
        });
    });

    describe('loadManifest', () => {
        it('loads all preload assets from manifest', async () => {
            const onProgress = vi.fn();
            await manager.loadManifest(
                {
                    assets: [
                        { key: 'a', url: 'a.txt', type: 'json' },
                        { key: 'b', url: 'b.txt', type: 'json' },
                        {
                            key: 'c',
                            url: 'c.txt',
                            type: 'json',
                            preload: false,
                        },
                    ],
                },
                onProgress,
            );

            expect(manager.has('a')).toBe(true);
            expect(manager.has('b')).toBe(true);
            expect(manager.has('c')).toBe(false);
            expect(onProgress).toHaveBeenCalledWith(expect.any(Number), 2);
        });
    });
});
