# Audio

The `AudioManager` handles all in-game audio — looping background music and
one-shot sound effects — built on the **BabylonJS AudioV2 API** (Web Audio).

Music tracks use `StreamingSound` so large files are decoded on the fly rather
than buffered entirely in memory. SFX use `StaticSound` with configurable
`maxInstances` so multiple overlapping plays of the same key work out of the
box. Music and SFX are routed through separate `MainAudioBus` instances, giving
you independent volume and mute control for each category.

A ready-to-use singleton — `audioManager` — is exported from the package,
mirroring the `metadataRepository` pattern, so you can import it anywhere
without going through the `Game` instance.

---

## When to Use

| Scenario | API |
|---|---|
| First-time setup (required) | `initialize()` |
| Looping background music | `loadMusic` → `playMusic` → `stopMusic` |
| One-shot sound effect | `loadSfx` → `playSfx` |
| Randomised SFX variants | `loadSfx` with an array of URLs |
| Controlled concurrent SFX | `loadSfx` with `{ maxInstances: N }` |
| Player mutes SFX in settings | `muteSfx(true)` |
| Player lowers music volume | `setMusicVolume(0.3)` |
| Pause screen silence | `stopAll()` |
| Scene teardown | `dispose()` |

---

## API Reference

### Initialisation

| Method | Signature | Description |
|---|---|---|
| `initialize` | `(options?) → Promise<void>` | Creates the AudioV2 engine and music/SFX buses. Must be called once before any load/play method. No-op on subsequent calls. |

`initialize` accepts an optional `AudioManagerInitOptions` object:

| Option | Type | Default | Description |
|---|---|---|---|
| `requireUnlock` | `boolean` | `false` | When `true`, shows a BabylonJS "click to start" overlay and blocks the promise until the user interacts. Leave `false` to let the browser resume audio automatically. |

### Loading

| Method | Signature | Description |
|---|---|---|
| `loadSfx` | `(key, urlOrUrls, options?) → Promise<void>` | Loads one or more SFX variants under a key as `StaticSound`. No-op if already loaded. |
| `loadMusic` | `(key, url, options?) → Promise<void>` | Loads a looping music track as `StreamingSound`. No-op if already loaded. |

`loadSfx` accepts an optional `SfxLoadOptions` object:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxInstances` | `number` | `5` | Maximum overlapping concurrent plays for this key. Oldest is stopped when the limit is reached. Use `Infinity` for unlimited. |

`loadMusic` accepts an optional `MusicLoadOptions` object:

| Option | Type | Default | Description |
|---|---|---|---|
| `autoPlay` | `boolean` | `false` | Start playing immediately after loading. |

### Playback

| Method | Signature | Description |
|---|---|---|
| `playSfx` | `(key) → void` | Plays a random variant of the SFX key. Overlapping handled by `maxInstances`. |
| `playMusic` | `(key) → void` | Starts a music track; stops the previously active track first. |
| `stopMusic` | `(key?) → void` | Stops the named track, or the currently active one if omitted. |
| `stopSfx` | `(key) → void` | Stops all playing instances of the given SFX key. |
| `stopAll` | `() → void` | Stops all music and SFX without disposing resources. |

### Volume & Mute

| Method / Property | Description |
|---|---|
| `setSfxVolume(volume)` | Sets SFX bus volume `[0, 1]`. Stored even if muted. |
| `setMusicVolume(volume)` | Sets music bus volume `[0, 1]`. Stored even if muted. |
| `muteSfx(muted)` | `true` silences SFX bus; `false` restores previous volume. |
| `muteMusic(muted)` | `true` silences music bus; `false` restores previous volume. |
| `sfxVolume` _(getter)_ | Returns the stored SFX volume (ignores mute state). |
| `musicVolume` _(getter)_ | Returns the stored music volume (ignores mute state). |
| `sfxMuted` _(getter)_ | `true` when SFX are currently muted. |
| `musicMuted` _(getter)_ | `true` when music is currently muted. |
| `activeMusicKey` _(getter)_ | Key of the currently playing music track, or `null`. |
| `isInitialized` _(getter)_ | `true` after `initialize()` has completed successfully. |

### Lifecycle

| Method | Description |
|---|---|
| `dispose()` | Stops and disposes all sounds, buses, and the AudioV2 engine. Resets to uninitialised state. |

---

## Code Example

```ts
import { audioManager } from '@sorskoot/babylon-kit';

class LevelScene extends GameScene {
    public async setup(): Promise<void> {
        // 1. Initialise the audio engine (once per application lifetime).
        //    Pass { requireUnlock: true } to show a "click to start" overlay
        //    instead of relying on automatic browser resume.
        await audioManager.initialize();

        // 2. Load assets (StreamingSound for music, StaticSound for SFX).
        await audioManager.loadMusic('level1_bgm', '/audio/music/level1.ogg');

        // Multiple SFX variants — random pick on each playSfx() call.
        // Up to 3 concurrent instances of each variant.
        await audioManager.loadSfx('footstep', [
            '/audio/sfx/step1.mp3',
            '/audio/sfx/step2.mp3',
            '/audio/sfx/step3.mp3',
        ], { maxInstances: 3 });

        await audioManager.loadSfx('explosion', '/audio/sfx/boom.mp3');

        // 3. Set initial mix (e.g. restored from player preferences).
        audioManager.setMusicVolume(0.5);
        audioManager.setSfxVolume(0.8);

        // 4. Start music.
        audioManager.playMusic('level1_bgm');
    }

    // Called from a settings screen toggle.
    public onSfxToggle(enabled: boolean): void {
        audioManager.muteSfx(!enabled);
    }

    public onMusicToggle(enabled: boolean): void {
        audioManager.muteMusic(!enabled);
    }

    // Called whenever the player moves.
    public onPlayerStep(): void {
        audioManager.playSfx('footstep'); // picks step1, step2, or step3 at random
    }

    // Called on enemy destroyed.
    public onEnemyDestroyed(): void {
        audioManager.playSfx('explosion');
    }

    public dispose(): void {
        audioManager.dispose();
        super.dispose();
    }
}
```

---

## Audio Engine Unlock

Modern browsers require a user gesture (click, tap, key press) before an
`AudioContext` can produce sound. BabylonJS AudioV2 handles this automatically
by resuming the context on the next interaction — your game starts normally and
audio begins on the first player action.

If you prefer an explicit "click to play" gate (e.g. a title screen overlay):

```ts
await audioManager.initialize({ requireUnlock: true });
// The promise above does not resolve until the user dismisses the overlay.
```

> **Note** — `requireUnlock: true` causes the entire initialisation (and
> therefore `GameScene.setup()`) to pause until the user interacts. Only use
> it if a blocked startup is acceptable for your game flow.

---

## Planned Features

The following BabylonJS AudioV2 capabilities are not yet exposed but are planned
for a future release:

- **Spatial / positional audio** — attaching sounds to scene nodes with
  distance attenuation and stereo panning.
- **Pitch & playback-rate control** — per-play pitch shifting in cents and
  playback speed changes via `StaticSound` options.
- **Raw Web Audio access** — direct hooks into the underlying `AudioContext`
  and buffer graph for custom DSP, visualisers, or convolution reverb.

---

## Related Subsystems

- [Assets](assets.md) — loading 3D models and textures
- [Particles](particles.md) — visual effects that often pair with SFX
- [Scenes](scenes.md) — `GameScene.setup()` is where loading calls belong
