import type { AudioEngineV2 } from '@babylonjs/core/AudioV2/abstractAudio/audioEngineV2';
import type { MainAudioBus } from '@babylonjs/core/AudioV2/abstractAudio/mainAudioBus';
import type { StaticSound } from '@babylonjs/core/AudioV2/abstractAudio/staticSound';
import type { StreamingSound } from '@babylonjs/core/AudioV2/abstractAudio/streamingSound';
import {
    CreateMainAudioBusAsync,
    CreateSoundAsync,
    CreateStreamingSoundAsync,
} from '@babylonjs/core/AudioV2/abstractAudio/audioEngineV2';
import { CreateAudioEngineAsync } from '@babylonjs/core/AudioV2/webAudio/webAudioEngine';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * Options passed to {@link AudioManager.initialize}.
 */
export interface AudioManagerInitOptions {
    /**
     * When `true`, {@link AudioManager.initialize} will call
     * `audioEngine.unlockAsync()` after creating the engine.
     *
     * BabylonJS will display a "click to start" overlay that must be
     * dismissed before audio plays. The initialize promise will not resolve
     * until the user interacts, so **the game is blocked until then**.
     *
     * Leave `false` (the default) to let the browser resume audio automatically
     * on the first user interaction without blocking startup.
     *
     * Default `false`.
     */
    requireUnlock?: boolean;
}

/**
 * Options accepted by {@link AudioManager.loadMusic}.
 */
export interface MusicLoadOptions {
    /**
     * When `true` the track starts playing as soon as it has loaded.
     * Default `false`.
     */
    autoPlay?: boolean;
}

/**
 * Options accepted by {@link AudioManager.loadSfx}.
 */
export interface SfxLoadOptions {
    /**
     * Maximum number of overlapping instances that may play concurrently for
     * this SFX key. When the limit is reached, the oldest instance is stopped
     * before the new one starts.
     *
     * Defaults to `5`. Set to `Infinity` for truly unlimited concurrency.
     */
    maxInstances?: number;
}

// ---------------------------------------------------------------------------
// Internal registry shapes
// ---------------------------------------------------------------------------

/** @internal Registry entry for a set of SFX variants under one key. */
interface SfxEntry {
    /** One {@link StaticSound} per registered URL variant. */
    sounds: StaticSound[];
}

/** @internal Registry entry for a single looping music track. */
interface MusicEntry {
    /** The looping {@link StreamingSound} instance. */
    sound: StreamingSound;
}

// ---------------------------------------------------------------------------
// AudioManager
// ---------------------------------------------------------------------------

/**
 * Manages music tracks and sound effects, built on the BabylonJS AudioV2 API.
 *
 * - **Music** uses `StreamingSound` and loops continuously; only one track is
 *   _active_ at a time.
 * - **SFX** uses `StaticSound` and is one-shot; multiple instances (and
 *   multiple overlapping instances of the same key) can play simultaneously,
 *   capped per-key by {@link SfxLoadOptions.maxInstances}.
 * - A single SFX key may be backed by **multiple URL variants** — on every
 *   {@link playSfx} call one variant is chosen at random, helping avoid
 *   repetitive audio.
 * - Music and SFX are routed through separate {@link MainAudioBus} instances,
 *   so their volumes and mute states are controlled independently.
 *
 * Typical workflow:
 * 1. Call {@link initialize} once (e.g. in `Game` constructor or early scene
 *    setup) to create the underlying audio engine and buses.
 * 2. Call {@link loadMusic} / {@link loadSfx} during scene setup to preload
 *    audio assets by key.
 * 3. Call {@link playMusic} and {@link playSfx} during gameplay.
 * 4. Adjust the mix with {@link setMusicVolume}, {@link setSfxVolume},
 *    {@link muteMusic}, {@link muteSfx}.
 * 5. Call {@link dispose} when tearing down to free all audio resources.
 *
 * ---
 *
 * > **Future additions** — the following BabylonJS AudioV2 capabilities are
 * > planned but not yet exposed by this manager:
 * > - **Spatial / positional audio** — attaching sounds to scene nodes with
 * >   distance attenuation and panning.
 * > - **Pitch & playback-rate control** — per-play pitch shifting in cents
 * >   and playback speed via the `pitch` / `playbackRate` `StaticSound` options.
 * > - **Raw Web Audio access** — hooks into the underlying `AudioContext` and
 * >   buffer graph for custom DSP, visualizers, or convolution reverb.
 *
 * @example
 * ```ts
 * // 1. Initialize once (e.g. inside Game constructor):
 * await audioManager.initialize();
 *
 * // 2. Load assets in GameScene.setup():
 * await audioManager.loadMusic('theme', '/audio/music/theme.ogg');
 * await audioManager.loadSfx('explosion', [
 *   '/audio/sfx/boom1.mp3',
 *   '/audio/sfx/boom2.mp3',
 * ]);
 *
 * audioManager.setMusicVolume(0.4);
 * audioManager.setSfxVolume(0.8);
 * audioManager.playMusic('theme');
 *
 * // 3. During gameplay — plays boom1 or boom2 at random, overlapping allowed:
 * audioManager.playSfx('explosion');
 * ```
 */
export class AudioManager {

    // ── State ────────────────────────────────────────────────────────────────

    /** Desired music volume before mute is applied, range [0, 1]. */
    private _musicVolume: number = 1;
    /** Desired SFX volume before mute is applied, range [0, 1]. */
    private _sfxVolume: number = 1;
    /** Whether music output is suppressed. */
    private _musicMuted: boolean = false;
    /** Whether SFX output is suppressed. */
    private _sfxMuted: boolean = false;
    /** Key of the currently playing music track, or `null` if none. */
    private _activeMusicKey: string | null = null;

    /** The BabylonJS AudioV2 engine. `null` until {@link initialize} is called. */
    private _engine: AudioEngineV2 | null = null;
    /** Dedicated bus for all music tracks; volume-controlled independently. */
    private _musicBus: MainAudioBus | null = null;
    /** Dedicated bus for all SFX; volume-controlled independently. */
    private _sfxBus: MainAudioBus | null = null;

    private readonly _sfxRegistry: Map<string, SfxEntry> = new Map();
    private readonly _musicRegistry: Map<string, MusicEntry> = new Map();

    // ── Initialisation ───────────────────────────────────────────────────────

    /**
     * Creates the underlying BabylonJS AudioV2 engine and the music/SFX buses.
     *
     * This **must** be called once before any `load*` or `play*` methods.
     * Calling it more than once is a no-op.
     *
     * @param options - Optional settings (see {@link AudioManagerInitOptions}).
     *
     * @example
     * ```ts
     * // Default — browser resumes audio on first user interaction automatically:
     * await audioManager.initialize();
     *
     * // Optional unlock overlay — blocks until the user clicks "play":
     * await audioManager.initialize({ requireUnlock: true });
     * ```
     */
    public async initialize(options?: AudioManagerInitOptions): Promise<void> {
        if (this._engine !== null) return;

        this._engine = await CreateAudioEngineAsync();

        if (options?.requireUnlock) {
            await this._engine.unlockAsync();
        }

        this._musicBus = await CreateMainAudioBusAsync('music', {}, this._engine);
        this._sfxBus = await CreateMainAudioBusAsync('sfx', {}, this._engine);

        // Apply any volume/mute state that was set before initialize() was called.
        this._musicBus.volume = this._musicMuted ? 0 : this._musicVolume;
        this._sfxBus.volume = this._sfxMuted ? 0 : this._sfxVolume;
    }

    // ── Loading ──────────────────────────────────────────────────────────────

    /**
     * Pre-loads one or more sound-effect audio files under a single key.
     *
     * When the key is played via {@link playSfx} one variant is chosen at
     * random, which helps avoid repetitive sounds for common actions (footsteps,
     * impacts, etc.). Passing a single URL string works the same as passing a
     * one-element array.
     *
     * Each variant's `StaticSound` is configured with the given `maxInstances`
     * cap so overlapping playback of the same key works automatically.
     *
     * Already-loaded keys are silently ignored (returns immediately).
     *
     * @param key       Unique identifier for this SFX.
     * @param urlOrUrls A single URL string, or an array of URL strings.
     * @param options   Optional load-time settings (see {@link SfxLoadOptions}).
     * @throws {Error} If {@link initialize} has not been called.
     *
     * @example
     * ```ts
     * // Single variant
     * await audioManager.loadSfx('jump', '/audio/sfx/jump.mp3');
     *
     * // Multiple variants — random pick on each playSfx() call
     * await audioManager.loadSfx('footstep', [
     *   '/audio/sfx/step1.mp3',
     *   '/audio/sfx/step2.mp3',
     *   '/audio/sfx/step3.mp3',
     * ], { maxInstances: 3 });
     * ```
     */
    public async loadSfx(
        key: string,
        urlOrUrls: string | string[],
        options?: SfxLoadOptions,
    ): Promise<void> {
        this._assertInitialized('loadSfx');
        if (this._sfxRegistry.has(key)) return;

        const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
        const maxInstances = options?.maxInstances ?? 5;

        const sounds = await Promise.all(
            urls.map((url, i) =>
                CreateSoundAsync(
                    `${key}_${i}`,
                    url,
                    {
                        autoplay: false,
                        loop: false,
                        maxInstances,
                        outBus: this._sfxBus!,
                    },
                    this._engine,
                ),
            ),
        );

        this._sfxRegistry.set(key, { sounds });
    }

    /**
     * Pre-loads a streaming looping music track under the given key.
     *
     * Music is loaded as a `StreamingSound`, meaning audio data is decoded on
     * the fly rather than buffered entirely in memory — suitable for long
     * background tracks.
     *
     * Already-loaded keys are silently ignored (returns immediately).
     *
     * @param key     Unique identifier for this music track.
     * @param url     URL of the audio file.
     * @param options Optional load-time settings (see {@link MusicLoadOptions}).
     * @throws {Error} If {@link initialize} has not been called.
     *
     * @example
     * ```ts
     * await audioManager.loadMusic('bgm', '/audio/music/theme.ogg', {
     *   autoPlay: true,
     * });
     * ```
     */
    public async loadMusic(
        key: string,
        url: string,
        options?: MusicLoadOptions,
    ): Promise<void> {
        this._assertInitialized('loadMusic');
        if (this._musicRegistry.has(key)) return;

        const sound = await CreateStreamingSoundAsync(
            key,
            url,
            {
                loop: true,
                autoplay: false,
                outBus: this._musicBus!,
            },
            this._engine,
        );

        this._musicRegistry.set(key, { sound });

        if (options?.autoPlay) {
            this.playMusic(key);
        }
    }

    // ── Playback ─────────────────────────────────────────────────────────────

    /**
     * Plays a sound effect by key.
     *
     * If the key was registered with multiple URL variants, one is selected at
     * random. Overlapping instances are handled automatically by the
     * `maxInstances` setting configured in {@link loadSfx}.
     *
     * @param key - The key used when the SFX was loaded via {@link loadSfx}.
     * @throws {Error} If `key` has not been loaded.
     *
     * @example
     * ```ts
     * audioManager.playSfx('explosion');
     * ```
     */
    public playSfx(key: string): void {
        const entry = this._sfxRegistry.get(key);
        if (!entry) {
            throw new Error(`AudioManager: SFX '${key}' not loaded. Call loadSfx() first.`);
        }
        const index = Math.floor(Math.random() * entry.sounds.length);
        entry.sounds[index].play();
    }

    /**
     * Starts playing a music track by key.
     *
     * If another track is currently playing it is stopped automatically
     * before the new track begins.
     *
     * @param key - The key used when the track was loaded via {@link loadMusic}.
     * @throws {Error} If `key` has not been loaded.
     *
     * @example
     * ```ts
     * audioManager.playMusic('bgm');
     * ```
     */
    public playMusic(key: string): void {
        const entry = this._musicRegistry.get(key);
        if (!entry) {
            throw new Error(`AudioManager: Music '${key}' not loaded. Call loadMusic() first.`);
        }

        if (this._activeMusicKey !== null && this._activeMusicKey !== key) {
            this._musicRegistry.get(this._activeMusicKey)?.sound.stop();
        }

        this._activeMusicKey = key;
        entry.sound.play();
    }

    /**
     * Stops a music track.
     *
     * If `key` is omitted the currently active track (if any) is stopped.
     *
     * @param key - Optional key of the track to stop. When omitted stops the
     *              currently active track.
     *
     * @example
     * ```ts
     * audioManager.stopMusic();          // stop whatever is playing
     * audioManager.stopMusic('ambient'); // stop a specific track
     * ```
     */
    public stopMusic(key?: string): void {
        const target = key ?? this._activeMusicKey;
        if (target === null || target === undefined) return;
        this._musicRegistry.get(target)?.sound.stop();
        if (this._activeMusicKey === target) {
            this._activeMusicKey = null;
        }
    }

    /**
     * Stops all currently playing instances of a sound-effect key.
     *
     * @param key - The key used when the SFX was loaded via {@link loadSfx}.
     *
     * @example
     * ```ts
     * audioManager.stopSfx('alarm');
     * ```
     */
    public stopSfx(key: string): void {
        const entry = this._sfxRegistry.get(key);
        if (!entry) return;
        for (const sound of entry.sounds) {
            sound.stop();
        }
    }

    /**
     * Stops all currently playing music tracks and sound effects without
     * disposing any resources. Everything can be restarted afterward.
     *
     * @example
     * ```ts
     * audioManager.stopAll(); // silence everything on pause screen
     * ```
     */
    public stopAll(): void {
        for (const entry of this._sfxRegistry.values()) {
            for (const sound of entry.sounds) {
                sound.stop();
            }
        }
        for (const entry of this._musicRegistry.values()) {
            entry.sound.stop();
        }
        this._activeMusicKey = null;
    }

    // ── Volume & Mute ────────────────────────────────────────────────────────

    /**
     * Sets the master volume for all sound effects via the SFX audio bus.
     *
     * The value is clamped to `[0, 1]`. When SFX are currently muted the new
     * volume is stored but not applied to the bus until {@link muteSfx} is
     * called with `false`.
     *
     * @param volume - Desired volume in the range `[0, 1]`.
     *
     * @example
     * ```ts
     * audioManager.setSfxVolume(0.7);
     * ```
     */
    public setSfxVolume(volume: number): void {
        this._sfxVolume = Math.max(0, Math.min(1, volume));
        if (!this._sfxMuted && this._sfxBus) {
            this._sfxBus.volume = this._sfxVolume;
        }
    }

    /**
     * Sets the master volume for all music tracks via the music audio bus.
     *
     * The value is clamped to `[0, 1]`. When music is currently muted the new
     * volume is stored but not applied to the bus until {@link muteMusic} is
     * called with `false`.
     *
     * @param volume - Desired volume in the range `[0, 1]`.
     *
     * @example
     * ```ts
     * audioManager.setMusicVolume(0.4);
     * ```
     */
    public setMusicVolume(volume: number): void {
        this._musicVolume = Math.max(0, Math.min(1, volume));
        if (!this._musicMuted && this._musicBus) {
            this._musicBus.volume = this._musicVolume;
        }
    }

    /**
     * Mutes or unmutes all sound effects.
     *
     * Unmuting restores the volume last set by {@link setSfxVolume}.
     *
     * @param muted - `true` to mute, `false` to unmute.
     *
     * @example
     * ```ts
     * audioManager.muteSfx(true);  // silence
     * audioManager.muteSfx(false); // restore
     * ```
     */
    public muteSfx(muted: boolean): void {
        this._sfxMuted = muted;
        if (this._sfxBus) {
            this._sfxBus.volume = muted ? 0 : this._sfxVolume;
        }
    }

    /**
     * Mutes or unmutes all music tracks.
     *
     * Unmuting restores the volume last set by {@link setMusicVolume}.
     *
     * @param muted - `true` to mute, `false` to unmute.
     *
     * @example
     * ```ts
     * audioManager.muteMusic(true);  // silence
     * audioManager.muteMusic(false); // restore
     * ```
     */
    public muteMusic(muted: boolean): void {
        this._musicMuted = muted;
        if (this._musicBus) {
            this._musicBus.volume = muted ? 0 : this._musicVolume;
        }
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    /** Current SFX master volume (does not reflect mute state), range [0, 1]. */
    public get sfxVolume(): number {
        return this._sfxVolume;
    }

    /** Current music master volume (does not reflect mute state), range [0, 1]. */
    public get musicVolume(): number {
        return this._musicVolume;
    }

    /** `true` when SFX output is currently muted. */
    public get sfxMuted(): boolean {
        return this._sfxMuted;
    }

    /** `true` when music output is currently muted. */
    public get musicMuted(): boolean {
        return this._musicMuted;
    }

    /**
     * The key of the currently active music track, or `null` if no track is
     * playing.
     */
    public get activeMusicKey(): string | null {
        return this._activeMusicKey;
    }

    /**
     * Whether {@link initialize} has been called successfully.
     * Load and playback methods require this to be `true`.
     */
    public get isInitialized(): boolean {
        return this._engine !== null;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    /**
     * Stops and disposes all loaded music and SFX, the audio buses, and the
     * underlying BabylonJS AudioV2 engine, freeing all associated Web Audio
     * resources and resetting the manager to its initial (uninitialised) state.
     *
     * After calling `dispose`, call {@link initialize} again before loading
     * any new sounds.
     *
     * @example
     * ```ts
     * // In game teardown:
     * audioManager.dispose();
     * ```
     */
    public dispose(): void {
        this.stopAll();

        for (const entry of this._sfxRegistry.values()) {
            for (const sound of entry.sounds) {
                sound.dispose();
            }
        }
        this._sfxRegistry.clear();

        for (const entry of this._musicRegistry.values()) {
            entry.sound.dispose();
        }
        this._musicRegistry.clear();

        this._musicBus?.dispose();
        this._musicBus = null;

        this._sfxBus?.dispose();
        this._sfxBus = null;

        this._engine?.dispose();
        this._engine = null;

        this._activeMusicKey = null;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * Throws if the engine has not been initialized yet.
     * @param method - Name of the calling method, used in the error message.
     * @internal
     */
    private _assertInitialized(method: string): void {
        if (this._engine === null) {
            throw new Error(
                `AudioManager.${method}(): call initialize() before loading sounds.`,
            );
        }
    }
}

/** Singleton instance of {@link AudioManager} shared across the engine. */
export const audioManager = new AudioManager();

