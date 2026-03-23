/**
 * Metadata for an audio group used to control volume and mute state
 * for a category of sounds (e.g. music, sfx, voice).
 */
export interface AudioGroup {
    /** Unique group identifier. */
    name: string;
    /** Volume level in the range `[0, 1]`. */
    volume: number;
    /** Whether the group is muted. */
    muted: boolean;
}

/**
 * Handle returned when a sound is played.
 *
 * Use the handle to {@link SoundHandle.stop | stop},
 * {@link SoundHandle.pause | pause}, or
 * {@link SoundHandle.resume | resume} an individual sound.
 */
export interface SoundHandle {
    /** Unique numeric identifier for this playback instance. */
    id: number;
    /** Cache key of the audio buffer. */
    key: string;
    /** Name of the {@link AudioGroup} this sound belongs to. */
    group: string;
    /** Whether the sound is currently playing. */
    playing: boolean;
    /** Whether the sound loops. */
    loop: boolean;
    /** Per-sound volume in `[0, 1]`. */
    volume: number;
    /** Stop playback and release resources. */
    stop(): void;
    /** Pause playback. */
    pause(): void;
    /** Resume playback after a pause. */
    resume(): void;
}

let nextSoundId = 0;

/**
 * Web Audio API wrapper that manages audio buffers, groups, and playback.
 *
 * @remarks
 * The {@link AudioContext} is created lazily on the first call to {@link init}
 * or {@link play}. Sounds are routed through per-group gain nodes, which are
 * chained to a master gain node.
 *
 * @example
 * ```ts
 * const audio = new AudioManager();
 * audio.createGroup("sfx");
 * await audio.loadBuffer("shoot", "assets/shoot.wav");
 * const handle = audio.play("shoot", { group: "sfx" });
 * ```
 */
export class AudioManager {
    private _context?: AudioContext;
    private _masterGain?: GainNode;
    private readonly _groups = new Map<
        string,
        AudioGroup & { gainNode?: GainNode }
    >();
    private readonly _buffers = new Map<string, AudioBuffer>();
    private readonly _activeSounds = new Map<number, SoundHandleImpl>();
    private _masterVolume = 1;
    private _muted = false;

    /** Master volume in `[0, 1]`. */
    get masterVolume(): number {
        return this._masterVolume;
    }

    /** Set master volume, clamped to `[0, 1]`. */
    set masterVolume(value: number) {
        this._masterVolume = Math.max(0, Math.min(1, value));
        if (this._masterGain) {
            this._masterGain.gain.value = this._muted ? 0 : this._masterVolume;
        }
    }

    /** Whether all audio output is muted. */
    get muted(): boolean {
        return this._muted;
    }

    /** Set the global mute state. */
    set muted(value: boolean) {
        this._muted = value;
        if (this._masterGain) {
            this._masterGain.gain.value = value ? 0 : this._masterVolume;
        }
    }

    /** Initialise the Web Audio context and master gain node. Idempotent. */
    init(): void {
        if (this._context) return;
        this._context = new AudioContext();
        this._masterGain = this._context.createGain();
        this._masterGain.connect(this._context.destination);
        this._masterGain.gain.value = this._masterVolume;

        for (const group of this._groups.values()) {
            this._createGroupNode(group);
        }
    }

    /**
     * Create an audio group for categorising sounds.
     * @param name - Unique group name.
     * @param volume - Initial volume. @defaultValue `1`
     */
    createGroup(name: string, volume = 1): void {
        const group: AudioGroup & { gainNode?: GainNode } = {
            name,
            volume,
            muted: false,
        };
        this._groups.set(name, group);
        if (this._context && this._masterGain) {
            this._createGroupNode(group);
        }
    }

    /**
     * Set the volume of an existing group.
     * @param name - Group name.
     * @param volume - New volume, clamped to `[0, 1]`.
     */
    setGroupVolume(name: string, volume: number): void {
        const group = this._groups.get(name);
        if (!group) return;
        group.volume = Math.max(0, Math.min(1, volume));
        if (group.gainNode) {
            group.gainNode.gain.value = group.muted ? 0 : group.volume;
        }
    }

    /**
     * Mute or unmute a group.
     * @param name - Group name.
     * @param muted - Whether to mute.
     */
    setGroupMuted(name: string, muted: boolean): void {
        const group = this._groups.get(name);
        if (!group) return;
        group.muted = muted;
        if (group.gainNode) {
            group.gainNode.gain.value = muted ? 0 : group.volume;
        }
    }

    /**
     * Fetch an audio file, decode it, and store the buffer.
     * @param key - Cache key.
     * @param url - URL to fetch.
     */
    async loadBuffer(key: string, url: string): Promise<void> {
        if (!this._context) this.init();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this._context!.decodeAudioData(arrayBuffer);
        this._buffers.set(key, audioBuffer);
    }

    /**
     * Register a pre-decoded buffer directly.
     * @param key - Cache key.
     * @param buffer - The decoded audio buffer.
     */
    registerBuffer(key: string, buffer: AudioBuffer): void {
        this._buffers.set(key, buffer);
    }

    /**
     * Play a previously loaded audio buffer.
     *
     * @param key - Cache key of the buffer.
     * @param options - Playback options.
     * @param options.group - Audio group name. Defaults to `"default"`.
     * @param options.loop - Whether to loop. Defaults to `false`.
     * @param options.volume - Per-sound volume. Defaults to `1`.
     * @returns A {@link SoundHandle} for controlling the playback.
     * @throws If the buffer has not been loaded.
     */
    play(
        key: string,
        options: { group?: string; loop?: boolean; volume?: number } = {},
    ): SoundHandle {
        if (!this._context) this.init();

        const buffer = this._buffers.get(key);
        if (!buffer) {
            throw new Error(`Audio buffer "${key}" not found`);
        }

        const groupName = options.group ?? 'default';
        if (!this._groups.has(groupName)) {
            this.createGroup(groupName);
        }
        const group = this._groups.get(groupName)!;

        const source = this._context!.createBufferSource();
        source.buffer = buffer;
        source.loop = options.loop ?? false;

        const gainNode = this._context!.createGain();
        gainNode.gain.value = options.volume ?? 1;

        source.connect(gainNode);
        gainNode.connect(group.gainNode ?? this._masterGain!);

        const id = nextSoundId++;
        const handle = new SoundHandleImpl(
            id,
            key,
            groupName,
            source,
            gainNode,
            this._context!,
            () => {
                this._activeSounds.delete(id);
            },
        );

        this._activeSounds.set(id, handle);
        source.start();

        return handle;
    }

    /** Stop all currently playing sounds. */
    stopAll(): void {
        for (const handle of this._activeSounds.values()) {
            handle.stop();
        }
        this._activeSounds.clear();
    }

    /** Dispose the audio context and release all resources. */
    dispose(): void {
        this.stopAll();
        this._context?.close();
        this._context = undefined;
        this._masterGain = undefined;
        this._buffers.clear();
        this._groups.clear();
    }

    private _createGroupNode(
        group: AudioGroup & { gainNode?: GainNode },
    ): void {
        if (!this._context || !this._masterGain) return;
        group.gainNode = this._context.createGain();
        group.gainNode.gain.value = group.muted ? 0 : group.volume;
        group.gainNode.connect(this._masterGain);
    }
}

class SoundHandleImpl implements SoundHandle {
    readonly id: number;
    readonly key: string;
    readonly group: string;
    playing = true;
    loop: boolean;
    private _volume: number;
    private readonly _source: AudioBufferSourceNode;
    private readonly _gain: GainNode;
    private readonly _context: AudioContext;
    private readonly _onEnd: () => void;
    private _pausedAt = 0;
    private _startedAt: number;

    get volume(): number {
        return this._volume;
    }

    set volume(value: number) {
        this._volume = Math.max(0, Math.min(1, value));
        this._gain.gain.value = this._volume;
    }

    constructor(
        id: number,
        key: string,
        group: string,
        source: AudioBufferSourceNode,
        gain: GainNode,
        context: AudioContext,
        onEnd: () => void,
    ) {
        this.id = id;
        this.key = key;
        this.group = group;
        this.loop = source.loop;
        this._volume = gain.gain.value;
        this._source = source;
        this._gain = gain;
        this._context = context;
        this._onEnd = onEnd;
        this._startedAt = context.currentTime;

        source.onended = () => {
            this.playing = false;
            this._onEnd();
        };
    }

    stop(): void {
        if (!this.playing) return;
        this._source.stop();
        this.playing = false;
        this._onEnd();
    }

    pause(): void {
        if (!this.playing) return;
        this._pausedAt = this._context.currentTime - this._startedAt;
        this._source.stop();
        this.playing = false;
    }

    resume(): void {
        if (this.playing) return;
        // Note: AudioBufferSourceNode can only be started once.
        // Full resume requires re-creating the node, which is left
        // as a future enhancement.
        this._startedAt = this._context.currentTime - this._pausedAt;
        this.playing = true;
    }
}
