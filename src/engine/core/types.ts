import type {Engine as BabylonEngine} from '@babylonjs/core/Engines/engine';
import type {Scene} from '@babylonjs/core/scene';
import type {WebXRDefaultExperience} from '@babylonjs/core/XR/webXRDefaultExperience';
import {InputSystem} from "../services/input/inputSystem";
import {Observable} from "@babylonjs/core/Misc/observable";
import {WebXRCamera, WebXRState} from "@babylonjs/core";

/**
 * Configuration options for the {@link IGameEngine}.
 *
 * @example
 * ```ts
 * const config: EngineConfig = {
 *     canvasId: "renderCanvas",
 *     antialias: true,
 *     targetFps: 60,
 *     debug: true,
 * };
 * ```
 */
export interface EngineConfig {
    /** ID of the `<canvas>` element to render into. @defaultValue `"renderCanvas"` */
    canvasId?: string;
    /** Direct reference to a canvas element (takes precedence over {@link canvasId}). */
    canvas?: HTMLCanvasElement;
    /** Enable antialiasing. @defaultValue `true` */
    antialias?: boolean;
    /** Scale rendering to match the device pixel ratio. @defaultValue `true` */
    adaptToDeviceRatio?: boolean;
    /** Target frames per second. @defaultValue `60` */
    targetFps?: number;
    /** Fixed-update timestep in seconds. @defaultValue `1/60` */
    fixedTimeStep?: number;
    /** Enable debug mode and diagnostics. @defaultValue `false` */
    debug?: boolean;
    /** Physics subsystem configuration. */
    physics?: PhysicsConfig;
    /** Automatically create a WebXR experience on {@link IGameEngine.initialize | initialize()}. @defaultValue `true` */
    webXR?: boolean;
    /** Create a default camera during initialization. @defaultValue `true` */
    createDefaultCamera?: boolean;
    /** Create a default hemispheric light during initialization. @defaultValue `true` */
    createDefaultLight?: boolean;
}

/**
 * Configuration for the physics subsystem.
 */
export interface PhysicsConfig {
    /** Whether the physics engine is active. */
    enabled: boolean;
    /** World gravity vector. @defaultValue `{ x: 0, y: -9.81, z: 0 }` */
    gravity?: { x: number; y: number; z: number };
}

/**
 * Snapshot of the current timing state exposed by the game loop.
 *
 * All time values are in **seconds** and already scaled by {@link TimeState.timeScale}.
 */
export interface TimeState {
    /** Seconds elapsed since the previous frame (scaled). */
    delta: number;
    /** Total elapsed game time (scaled). */
    elapsed: number;
    /** Interval between fixed-update ticks. */
    fixedDelta: number;
    /** Time multiplier. `1` = normal, `0.5` = half-speed, `2` = double-speed. */
    timeScale: number;
    /** Number of frames processed so far. */
    frame: number;
    /** Whether the loop is currently paused. */
    paused: boolean;
}

/**
 * A constructor type that produces an {@link IComponent} instance.
 *
 * Used by entity methods that accept a component class for type-safe lookups.
 *
 * @typeParam T - The concrete component type.
 */
export interface ComponentClass<T extends IComponent = IComponent> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (...args: any[]): T;
}

/**
 * Contract for a component that can be attached to an {@link IEntity}.
 *
 * Components should hold **data only**; logic belongs in {@link ISystem} implementations.
 */
export interface IComponent {
    /** Back-reference to the owning entity (set automatically on attach). */
    entity?: IEntity;
    /** Called immediately after the component is added to an entity. */
    onAdd?(): void;
    /** Called immediately before the component is removed from an entity. */
    onRemove?(): void;
    /** Called once per frame with the current delta time in seconds. */
    onUpdate?(delta: number): void;
    /** Called when the component is enabled. */
    onEnable?(): void;
    /** Called when the component is disabled. */
    onDisable?(): void;
}

/**
 * Contract for a uniquely identifiable game entity that holds components.
 */
export interface IEntity {
    /** Unique numeric identifier assigned at creation. */
    readonly id: number;
    /** Human-readable label. */
    name: string;
    /** When `false`, the entity's components will not receive updates. */
    enabled: boolean;
    /** Read-only view of attached components keyed by class name. */
    readonly components: ReadonlyMap<string, IComponent>;
    /**
     * Attach a component instance to this entity.
     * @typeParam T - The component type.
     * @param component - The component to attach.
     * @returns The same component instance for chaining.
     * @throws If a component of the same type is already attached.
     */
    addComponent<T extends IComponent>(component: T): T;
    /**
     * Remove a component by its class.
     * @typeParam T - The component type.
     * @param componentClass - The class of the component to remove.
     */
    removeComponent<T extends IComponent>(
        componentClass: ComponentClass<T>,
    ): void;
    /**
     * Retrieve a component by its class.
     * @typeParam T - The component type.
     * @param componentClass - The class to look up.
     * @returns The component instance, or `undefined` if not found.
     */
    getComponent<T extends IComponent>(
        componentClass: ComponentClass<T>,
    ): T | undefined;
    /**
     * Check whether a component of the given class is attached.
     * @typeParam T - The component type.
     * @param componentClass - The class to check.
     */
    hasComponent<T extends IComponent>(
        componentClass: ComponentClass<T>,
    ): boolean;
    /** Destroy this entity, removing all components and notifying the engine. */
    destroy(): void;
}

/**
 * Contract for a system that processes entities each frame.
 *
 * Systems are executed in ascending {@link ISystem.priority} order.
 */
export interface ISystem {
    /** Unique name used for lookup via {@link IGameEngine.getSystem}. */
    readonly name: string;
    /** Execution order — lower values run first. */
    readonly priority: number;
    /** When `false`, {@link update} and {@link fixedUpdate} are skipped. */
    enabled: boolean;
    /** Called once when the system is added to the engine. */
    onRegister?(engine: IGameEngine): void;
    /** Called once when the system is removed from the engine. */
    onUnregister?(): void;
    /**
     * Called once per frame with the variable delta time.
     * @param delta - Seconds since the last frame (scaled).
     */
    update(delta: number): void;
    /**
     * Called at a fixed interval for deterministic simulation.
     * @param delta - The fixed timestep in seconds.
     */
    fixedUpdate?(delta: number): void;
}

/**
 * Top-level engine facade that ties together entities, systems, services,
 * and the game loop.
 *
 * Call {@link initialize} before {@link start} to set up the Babylon.js
 * engine, scene, and (optionally) a WebXR experience.
 */
export interface IGameEngine {
    /** The Babylon.js rendering engine. Available after {@link initialize}. */
    readonly babylonEngine?: BabylonEngine;
    /** The active Babylon.js scene. Available after {@link initialize}. */
    readonly scene?: Scene;
    /** The canvas element used for rendering. Available after {@link initialize}. */
    readonly canvas?: HTMLCanvasElement;
    /** The WebXR experience helper. Available after {@link initialize} when WebXR is enabled. */
    readonly xr?: WebXRDefaultExperience;
    /** Current timing state. */
    readonly time: TimeState;
    /** All living entities. */
    readonly entities: ReadonlyArray<IEntity>;
    /** All registered systems. */
    readonly systems: ReadonlyArray<ISystem>;
    /** All registered services. */
    readonly services: ReadonlyMap<string, unknown>;
    /** The input system, if enabled. */
    readonly input: InputSystem | undefined;
    /** Whether the engine has been initialized with Babylon.js. */
    readonly initialized: boolean;

    /** Observable that fires when the WebXR state changes.*/
    onXRStateChanged: Observable<WebXRState>;
    /** Current WebXR state. */
    readonly webXRState: WebXRState;

    onXRInitialPose: Observable<WebXRCamera>;

    /**
     * Return the set of all entities that currently carry a component of the
     * given type. Backed by an internal {@link ComponentIndex} that is updated
     * in O(1) whenever components are added or removed — iterating this result
     * is always cheaper than scanning {@link entities}.
     *
     * @typeParam T - The component type.
     * @param componentClass - The component class to query.
     * @returns A read-only set of matching entities. Never `undefined`; returns
     *   an empty set when no entities match.
     *
     * @example
     * ```ts
     * for (const entity of engine.getEntitiesWithComponent(MeshComponent)) {
     *     const mc = entity.getComponent(MeshComponent)!;
     *     // process mc …
     * }
     * ```
     */
    getEntitiesWithComponent<T extends IComponent>(
        componentClass: ComponentClass<T>,
    ): ReadonlySet<IEntity>;
    /**
     * Spawn a new entity.
     * @param name - Optional human-readable name.
     */
    createEntity(name?: string): IEntity;
    /**
     * Destroy an entity and remove it from the engine.
     * @param entity - The entity to destroy.
     */
    destroyEntity(entity: IEntity): void;
    /**
     * Register a system for processing.
     * @param system - The system to add.
     * @throws If a system with the same name is already registered.
     */
    registerSystem(system: ISystem): void;
    /**
     * Remove a previously registered system.
     * @param system - The system to remove.
     */
    unregisterSystem(system: ISystem): void;
    /**
     * Retrieve a registered system by name.
     * @typeParam T - The system subtype.
     * @param name - The system's unique name.
     */
    getSystem<T extends ISystem>(name: string): T | undefined;
    /**
     * Retrieve a registered service by key.
     * @typeParam T - Expected service type.
     * @param key - The service key.
     */
    getService<T>(key: string): T | undefined;
    /**
     * Register an arbitrary service for dependency injection.
     * @param key - Unique key for this service.
     * @param service - The service instance.
     * @throws If a service with the same key is already registered.
     */
    registerService(key: string, service: unknown): void;
    /** Start the game loop. */
    start(): void;
    /** Stop the game loop. */
    stop(): void;
    /** Pause the game loop (rendering continues, updates are skipped). */
    pause(): void;
    /** Resume the game loop after a pause. */
    resume(): void;
    /**
     * Initialize the Babylon.js engine, scene, default camera/light, and
     * (optionally) a WebXR experience.
     *
     * Must be called **once** before {@link start}. Safe to call multiple
     * times — subsequent calls are no-ops.
     */
    initialize(): Promise<void>;
    /**
     * Dispose of the Babylon.js engine, scene, and all associated resources.
     */
    dispose(): void;
    /**
     * Advance the engine by one frame.
     *
     * @remarks
     * When the engine has been {@link initialize | initialized}, the render
     * loop calls this automatically. You only need to call it manually when
     * running without Babylon.js (e.g. in tests).
     *
     * @param timestamp - A `performance.now()`-style timestamp in milliseconds.
     */
    tick(timestamp: number): void;
}

/**
 * Describes a named input action with one or more physical bindings.
 *
 * @example
 * ```ts
 * const jump: IInputAction = {
 *     name: "jump",
 *     bindings: [
 *         { type: "keyboard", code: "Space" },
 *         { type: "gamepad", code: "0:0" },
 *     ],
 * };
 * ```
 */
export interface IInputAction {
    /** Unique action identifier used for queries. */
    name: string;
    /** Physical input bindings that trigger this action. */
    bindings: InputBinding[];
}

/**
 * Maps a physical input to an action.
 *
 * @remarks
 * - **keyboard** — uses {@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code | KeyboardEvent.code} values.
 * - **mouse** — button number as string, or `"MouseMove"` for axis movement.
 * - **gamepad** — `"gpIndex:buttonOrAxis"`, e.g. `"0:axis0"` or `"0:0"`.
 */
export interface InputBinding {
    /** Input device type. */
    type: 'keyboard' | 'mouse' | 'gamepad';
    /** Device-specific code identifying the button or axis. */
    code: string;
    /** Axis selector for mouse movement bindings. */
    axis?: 'x' | 'y';
    /** Multiplier applied to the raw value. Defaults to `1`. */
    scale?: number;
}

/**
 * Contract for a type-specific asset loader used by the asset pipeline.
 *
 * @typeParam T - The type of asset this loader produces.
 *
 * @example
 * ```ts
 * class JsonLoader implements IAssetLoader<unknown> {
 *     supportedExtensions = ["json"];
 *     async load(url: string) {
 *         return (await fetch(url)).json();
 *     }
 * }
 * ```
 */
export interface IAssetLoader<T> {
    /** File extensions this loader handles (without the leading dot). */
    readonly supportedExtensions: string[];
    /**
     * Load an asset from the given URL.
     * @param url - The asset URL.
     * @returns The loaded asset.
     */
    load(url: string): Promise<T>;
}

/**
 * Declarative list of assets to be batch-loaded.
 */
export interface AssetManifest {
    /** The asset entries in this manifest. */
    assets: AssetEntry[];
}

/**
 * A single entry in an {@link AssetManifest}.
 */
export interface AssetEntry {
    /** Unique cache key for this asset. */
    key: string;
    /** URL to load the asset from. */
    url: string;
    /** Asset category hint. */
    type: 'mesh' | 'texture' | 'audio' | 'json';
    /** When `false`, this asset is skipped during manifest preloading. @defaultValue `true` */
    preload?: boolean;
}

/**
 * Named phase within the update pipeline, used for ordering systems.
 */
export type SystemUpdatePhase =
    | 'input'
    | 'physics'
    | 'gameplay'
    | 'animation'
    | 'render';

/**
 * Describes a loadable game scene with async lifecycle hooks.
 */
export interface SceneDescriptor {
    /** Unique scene name used for lookup. */
    name: string;
    /**
     * Called when the scene is entered.
     * @param engine - The game engine instance.
     */
    setup: (engine: IGameEngine) => Promise<void>;
    /**
     * Called when the scene is exited. Optional.
     * @param engine - The game engine instance.
     */
    teardown?: (engine: IGameEngine) => Promise<void>;
}
