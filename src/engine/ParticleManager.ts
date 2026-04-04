import { AbstractMesh, ParticleSystem, Scene, Texture, Vector3 } from "@babylonjs/core";

export interface ParticleSystemOptions {
    /** World position for the emitter. Creates a Vector3 emitter automatically. */
    position?: Vector3;
    /** Override the emitter mesh or position. Takes precedence over `position`. */
    emitter?: AbstractMesh | Vector3;
    /** Override the particle texture URL. */
    textureUrl?: string;
    /** Capacity passed to ParticleSystem.Parse (default 1000). */
    capacity?: number;
    /** Whether to start the system immediately (default true). */
    autoStart?: boolean;
}

export interface SpawnEffectOptions {
    /** World position to spawn the effect at. */
    position: Vector3;
    /** Override the particle texture URL. */
    textureUrl?: string;
    /** Override capacity (default 1000). */
    capacity?: number;
    /**
     * Duration in milliseconds before the system stops emitting.
     * After stopping, it auto-disposes once all particles have died.
     * Default 1000.
     */
    duration?: number;
    /** Override emitter (mesh or position). Defaults to the given position. */
    emitter?: AbstractMesh | Vector3;
    /** Optional target-stop count (for burst effects set to the number of particles). */
    targetStopDuration?: number;
}

/**
 * Manages particle systems: persistent (looping) systems and one-shot
 * effects (explosions, impacts, etc.).
 *
 * Workflow:
 *  1. **Register a template** with `registerTemplate(key, url, scene)` — fetches
 *     the JSON once and stores it for later cloning.
 *  2. **Spawn one-shot effects** with `spawnEffect(templateKey, scene, options)` —
 *     clones the template, places it at a position, runs it for a duration, then
 *     auto-disposes.
 *  3. **Load persistent systems** with `loadFromJSON(key, url, scene, options)` —
 *     same as before, cached by key, runs continuously.
 *  4. **Move** any running system with `setEmitterPosition(key, position)`.
 */
export class ParticleManager {
    private systems: Map<string, ParticleSystem> = new Map();
    private templates: Map<string, object> = new Map();

    // ── Templates ───────────────────────────────────────────────────

    /**
     * Pre-load a particle system JSON so it can be cloned later via
     * `spawnEffect()` without fetching every time.
     */
    public async registerTemplate(key: string, url: string): Promise<void> {
        if (this.templates.has(key)) return;
        const response = await fetch(url);
        const json = await response.json();
        this.templates.set(key, json);
    }

    /** Check whether a template has been registered. */
    public hasTemplate(key: string): boolean {
        return this.templates.has(key);
    }

    // ── One-shot effects (explosions, impacts, etc.) ────────────────

    /**
     * Spawn a one-shot particle effect from a registered template.
     * The system starts immediately, stops emitting after `duration` ms,
     * and auto-disposes once all remaining particles have died.
     *
     * @returns The spawned ParticleSystem (useful if you want to tweak it
     *          further before it finishes).
     */
    public spawnEffect(
        templateKey: string,
        scene: Scene,
        options: SpawnEffectOptions,
    ): ParticleSystem {
        const json = this.templates.get(templateKey);
        if (!json) {
            throw new Error(
                `ParticleManager: template "${templateKey}" not registered. ` +
                `Call registerTemplate() first.`,
            );
        }

        const capacity = options.capacity ?? 1000;
        const system = ParticleSystem.Parse(json, scene, "", false, capacity);

        // Set emitter
        if (options.emitter) {
            system.emitter = options.emitter;
        } else {
            system.emitter = options.position.clone();
        }

        if (options.textureUrl) {
            system.particleTexture = new Texture(options.textureUrl, scene);
        }

        if (options.targetStopDuration !== undefined) {
            system.targetStopDuration = options.targetStopDuration;
        }

        system.start();

        // Stop emitting after duration, then dispose when particles die
        const duration = options.duration ?? 1000;
        setTimeout(() => {
            system.stop();
            // disposeOnStop causes the system to dispose itself once all
            // living particles have expired.
            system.disposeOnStop = true;
        }, duration);

        return system;
    }

    // ── Persistent (looping) systems ────────────────────────────────

    /**
     * Load a particle system from a JSON file URL, parse it, and optionally
     * override emitter / texture. The system is cached by key.
     */
    public async loadFromJSON(
        key: string,
        url: string,
        scene: Scene,
        options?: ParticleSystemOptions,
    ): Promise<ParticleSystem> {
        const existing = this.systems.get(key);
        if (existing) return existing;

        const response = await fetch(url);
        const json = await response.json();

        const capacity = options?.capacity ?? 1000;
        const system = ParticleSystem.Parse(json, scene, "", false, capacity);

        if (options?.emitter) {
            system.emitter = options.emitter;
        } else if (options?.position) {
            system.emitter = options.position.clone();
        }

        if (options?.textureUrl) {
            system.particleTexture = new Texture(options.textureUrl, scene);
        }

        this.systems.set(key, system);

        if (options?.autoStart !== false) {
            system.start();
        }

        return system;
    }

    /** Retrieve a loaded persistent particle system by key. */
    public getSystem(key: string): ParticleSystem | undefined {
        return this.systems.get(key);
    }

    // ── Moving / repositioning ──────────────────────────────────────

    /**
     * Move a persistent system's emitter to a new world position.
     * Works whether the emitter is a Vector3 or a mesh.
     */
    public setEmitterPosition(key: string, position: Vector3): void {
        const system = this.systems.get(key);
        if (!system) return;

        if (system.emitter instanceof Vector3) {
            system.emitter.copyFrom(position);
        } else if ((system.emitter as AbstractMesh).position) {
            (system.emitter as AbstractMesh).position.copyFrom(position);
        }
    }

    /** Convenience: attach a persistent system's emitter to a mesh. */
    public setEmitterMesh(key: string, mesh: AbstractMesh): void {
        const system = this.systems.get(key);
        if (system) {
            system.emitter = mesh;
        }
    }

    // ── Lifecycle ───────────────────────────────────────────────────

    /** Stop and dispose a persistent particle system by key. */
    public disposeSystem(key: string): void {
        const system = this.systems.get(key);
        if (system) {
            system.stop();
            system.dispose();
            this.systems.delete(key);
        }
    }

    /** Dispose all managed persistent particle systems and clear templates. */
    public dispose(): void {
        for (const system of this.systems.values()) {
            system.stop();
            system.dispose();
        }
        this.systems.clear();
        this.templates.clear();
    }
}
