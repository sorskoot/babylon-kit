# Asset Pipeline

Async asset loading with caching, custom loaders, and manifest-based preloading.

## Setup

```typescript
import { AssetManager } from "./src/engine";Loader

const assets = new AssetManager();
```

## Custom Loaders

Register loaders for each file type:

```typescript
import type { IAssetLoader } from "./src/engine";

class JsonLoader implements IAssetLoader<unknown> {
    supportedExtensions = ["json"];

    async load(url: string): Promise<unknown> {
        const response = await fetch(url);
        return response.json();
    }
}

class TextureLoader implements IAssetLoader<HTMLImageElement> {
    supportedExtensions = ["png", "jpg", "jpeg", "webp"];

    load(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }
}

assets.registerLoader(new JsonLoader());
assets.registerLoader(new TextureLoader());
```

## Loading Assets

```typescript
const config = await assets.load<GameConfig>("config", "assets/config.json");
const texture = await assets.load<HTMLImageElement>("hero", "assets/hero.png");
```

Concurrent loads for the same key are deduplicated automatically.

## Cache

```typescript
assets.has("config");           // true
assets.get<GameConfig>("config"); // cached value
assets.unload("config");        // remove from cache
assets.clear();                  // remove all
assets.getLoadedKeys();          // ["hero", ...]
```

## Manifest Loading

Define a manifest for batch preloading:

```typescript
const manifest = {
    assets: [
        { key: "level1", url: "assets/level1.json", type: "json" },
        { key: "hero",   url: "assets/hero.png",    type: "texture" },
        { key: "music",  url: "assets/bg.mp3",      type: "audio", preload: false },
    ],
};

await assets.loadManifest(manifest, (loaded, total) => {
    console.log(`Loading: ${loaded}/${total}`);
});
```

Assets with `preload: false` are skipped during manifest loading.
