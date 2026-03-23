import type { AssetEntry, AssetManifest, IAssetLoader } from '../../core/types';

/**
 * Asynchronous asset loading pipeline with caching, request deduplication,
 * and manifest-based batch loading.
 *
 * Register one or more {@link IAssetLoader | loaders} for specific file
 * extensions, then load assets individually or via an {@link AssetManifest}.
 *
 * @example
 * ```ts
 * const assets = new AssetManager();
 * assets.registerLoader(new JsonLoader());
 * const data = await assets.load<Config>("config", "assets/config.json");
 * ```
 */
export class AssetManager {
    private readonly _cache = new Map<string, unknown>();
    private readonly _loaders = new Map<string, IAssetLoader<unknown>>();
    private readonly _loading = new Map<string, Promise<unknown>>();

    /**
     * Register a loader for one or more file extensions.
     * @param loader - The asset loader instance.
     */
    registerLoader(loader: IAssetLoader<unknown>): void {
        for (const ext of loader.supportedExtensions) {
            this._loaders.set(ext.toLowerCase(), loader);
        }
    }

    /**
     * Load an asset by key and URL.
     *
     * Subsequent calls with the same key return the cached value. Concurrent
     * calls for the same key share the same in-flight promise (deduplication).
     *
     * @typeParam T - Expected asset type.
     * @param key - Unique cache key.
     * @param url - The URL to load from.
     * @returns The loaded asset.
     * @throws If no loader is registered for the file extension.
     */
    async load<T>(key: string, url: string): Promise<T> {
        if (this._cache.has(key)) {
            return this._cache.get(key) as T;
        }

        if (this._loading.has(key)) {
            return this._loading.get(key) as Promise<T>;
        }

        const ext = this._getExtension(url);
        const loader = this._loaders.get(ext);
        if (!loader) {
            throw new Error(`No loader registered for extension "${ext}"`);
        }

        const promise = loader.load(url).then((asset) => {
            this._cache.set(key, asset);
            this._loading.delete(key);
            return asset;
        });

        this._loading.set(key, promise);
        return promise as Promise<T>;
    }

    /**
     * Load all assets in a manifest that have `preload !== false`.
     *
     * @param manifest - The asset manifest.
     * @param onProgress - Optional callback invoked after each asset finishes.
     */
    async loadManifest(
        manifest: AssetManifest,
        onProgress?: (loaded: number, total: number) => void,
    ): Promise<void> {
        const entries = manifest.assets.filter((a) => a.preload !== false);
        let loaded = 0;
        const total = entries.length;

        const promises = entries.map(async (entry) => {
            await this.load(entry.key, entry.url);
            loaded++;
            onProgress?.(loaded, total);
        });

        await Promise.all(promises);
    }

    /**
     * Retrieve a previously loaded asset from the cache.
     * @typeParam T - Expected asset type.
     * @param key - The cache key.
     */
    get<T>(key: string): T | undefined {
        return this._cache.get(key) as T | undefined;
    }

    /** Check whether an asset with the given key exists in the cache. */
    has(key: string): boolean {
        return this._cache.has(key);
    }

    /**
     * Remove a single asset from the cache.
     * @param key - The cache key to evict.
     */
    unload(key: string): void {
        this._cache.delete(key);
    }

    /** Clear the entire asset cache. */
    clear(): void {
        this._cache.clear();
    }

    /** Return a snapshot of all currently cached asset keys. */
    getLoadedKeys(): string[] {
        return [...this._cache.keys()];
    }

    /**
     * Load an array of asset entries in parallel.
     * @param entries - The entries to load.
     */
    async preloadAll(entries: AssetEntry[]): Promise<void> {
        await Promise.all(entries.map((e) => this.load(e.key, e.url)));
    }

    private _getExtension(url: string): string {
        const cleanUrl = url.split('?')[0];
        const parts = cleanUrl.split('.');
        return (parts[parts.length - 1] ?? '').toLowerCase();
    }
}
