# Plan: Add `AudioManager` with Music & SFX Support

Create a new `AudioManager` class in `src/engine/AudioManager.ts` using BabylonJS `Sound` API, exported as a singleton `audioManager`. Wire it into `Game` and `index.ts` following existing manager patterns.

## Steps

1. **Create [`src/engine/AudioManager.ts`](src/engine/AudioManager.ts)** with the `AudioManager` class and supporting interfaces/types, built on `@babylonjs/core/Audio/sound` and `@babylonjs/core/Audio/soundTrack`. Export `export const audioManager = new AudioManager()` at the bottom, mirroring `metadataRepository`.

2. **Define two internal registry interfaces** — `SfxEntry` (holds an array of `Sound` instances, one per registered URL, for random pick on play) and `MusicEntry` (holds a single looping `Sound`). Use `Map<string, SfxEntry>` and `Map<string, MusicEntry>` as the backing stores.

3. **Add key public methods on `AudioManager`**:
   - `loadSfx(key, urlOrUrls, scene): Promise<void>` — accepts `string | string[]`; creates one `Sound` per URL, opts-out of `autoplay`/`loop`; returns cached if already loaded.
   - `loadMusic(key, url, scene): Promise<void>` — creates one looping `Sound`; cached by key.
   - `playSfx(key): void` — picks a random `Sound` from the entry's array and calls `.play()`; throws if not loaded.
   - `playMusic(key): void` / `stopMusic(key?): void` — starts or stops the named music track; stops the previously active music first.
   - `setSfxVolume(volume)` / `setMusicVolume(volume)` — store the value, then call `.setVolume()` on every registered sound of that type (respecting mute state).
   - `muteSfx(muted)` / `muteMusic(muted)` — toggle mute independently; internally sets effective volume to 0 or restores it.
   - `dispose(): void` — stops and disposes all `Sound` instances, clears both maps.
   - `stopAll(): void` — stops all currently playing sounds without disposing them.'
   - `stopSfx(key)` / `stopMusic(key)` — stops the currently playing sound(s) for the given key without disposing.'
   - 
4. **Wire the singleton into [`src/engine/Game.ts`](src/engine/Game.ts)** — add a `public audioManager: AudioManager` property, instantiate it in the constructor, and call `this.audioManager.dispose()` inside `Game.dispose()`.

5. **Re-export from [`src/index.ts`](src/index.ts)** — add `export * from './engine/AudioManager'` so both the class and the `audioManager` singleton are available to consumers.

6. **Add [`docs/audio.md`](docs/audio.md)** — brief intro, API table (all public methods/properties), and a realistic code example showing `loadSfx` with an array, `playMusic`, and separate volume/mute controls.

## Further Considerations

1. **Concurrent SFX playback** — BabylonJS `Sound.play()` on a non-looping sound creates a new web-audio source node each call, so overlapping naturally works. No pooling needed unless you need hard limits. Should we add an optional `maxConcurrent` cap?
2. **`audioManager` singleton vs. `Game.audioManager`** — the singleton is exported for use anywhere (same as `metadataRepository`), but `Game.audioManager` is the same class, not the same instance. Should `Game` hold a reference to the singleton, or create its own independent instance (current plan)?
3. **Music crossfading** — the current plan stops the previous track immediately when `playMusic` is called. Would you like a `fadeOutDuration` option for smooth crossfades using BabylonJS's `Sound.setVolume` + `setInterval`/tween?

