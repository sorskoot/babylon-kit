import {Engine, Scene, WebXRDefaultExperience} from '@babylonjs/core';
import {DoorObject} from '../entities/DoorObject';
import {InspectObject} from '../entities/InspectObject';
import {Game} from './Game';
import {GameObject} from './GameObject';
import {InputManager} from './InputManager';
import {InteractionManager} from './InteractionManager';
import {MetadataRepository, metadataRepository, SorskootEntryTypes} from './MetadataRepository';
import type {XRManagerOptions} from './XRManager';
import {XRManager} from './XRManager';

/**
 * Abstract base class for every scene in the game.
 *
 * A `GameScene` owns a BabylonJS {@link Scene}, a registry of
 * {@link GameObject} instances, an {@link InteractionManager}, and an
 * {@link XRManager}.  Subclasses must implement {@link setup} to build the
 * scene content and may override {@link update} for scene-level per-frame
 * logic.
 *
 * @example
 * ```ts
 * class MainScene extends GameScene {
 *     async setup() {
 *         new ArcRotateCamera("cam", …, this.scene);
 *         new HemisphericLight("light", …, this.scene);
 *         this.addGameObject("player", new Player(this.scene));
 *     }
 * }
 * ```
 */
export abstract class GameScene {
    /** The owning {@link Game} instance; provides access to all shared managers. */
    protected game: Game;
    /** The underlying BabylonJS {@link Scene} for this game scene. */
    protected scene: Scene;
    /** The BabylonJS {@link Engine} used to create this scene. */
    protected engine: Engine;
    /** Registry of all active {@link GameObject} instances keyed by name. */
    protected gameObjects: Map<string, GameObject> = new Map();
    /** Manages pointer/click interactions between the player and registered {@link GameObject} instances. */
    protected interactionManager: InteractionManager;
    /** Centralises keyboard, mouse, gamepad and XR controller input into named actions. */
    protected inputManager: InputManager;
    /** Manages the WebXR session lifecycle and controller input for this scene. */
    protected xrManager: XRManager;

    /**
     * Creates a new GameScene and wires up the per-frame update loop.
     *
     * @param engine - The BabylonJS engine used to create the underlying Scene.
     * @param game - The game instance that owns this scene.
     */
    protected constructor(engine: Engine, game: Game) {
        this.engine = engine;
        this.game = game;
        this.scene = new Scene(engine);
        this.inputManager = new InputManager(this.scene);
        this.interactionManager = new InteractionManager(this.scene, this.gameObjects);
        this.xrManager = new XRManager(this.scene);

        this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.engine.getDeltaTime() / 1000;
            this.internalUpdate(dt);
            this.inputManager.update();
        });
    }

    /** Returns the owning {@link Game} instance. */
    public getGame(): Game {
        return this.game;
    }

    /** Returns the underlying BabylonJS {@link Scene}. */
    public getScene(): Scene {
        return this.scene;
    }

    /** Returns the {@link InteractionManager} for this scene. */
    public getInteractionManager(): InteractionManager {
        return this.interactionManager;
    }

    /** Returns the {@link InputManager} for this scene. */
    public getInputManager(): InputManager {
        return this.inputManager;
    }

    /** Returns the {@link XRManager} for this scene. */
    public getXRManager(): XRManager {
        return this.xrManager;
    }

    /**
     * Initialise WebXR for this scene. Call after setup() when camera and
     * environment are ready.
     *
     * @example Teleportation
     * ```ts
     * await this.initializeXR({
     *     movement: {
     *         mode: "teleportation",
     *         floorMeshes: [ground],
     *         timeToTeleport: 3000,
     *     },
     * });
     * ```
     *
     * @example Smooth locomotion
     * ```ts
     * await this.initializeXR({
     *     movement: {
     *         mode: "locomotion",
     *         movementSpeed: 0.1,
     *     },
     * });
     * ```
     */
    public async initializeXR(options?: XRManagerOptions): Promise<WebXRDefaultExperience> {
        return this.xrManager.initialize(options);
    }

    /**
     * Register a {@link GameObject} in this scene.
     * Calls {@link GameObject.onStart} automatically after registration.
     *
     * @param key - Unique identifier for the object within this scene.
     * @param obj - The {@link GameObject} instance to register.
     */
    public addGameObject(key: string, obj: GameObject): void {
        this.gameObjects.set(key, obj);
        obj.onStart();
    }

    /**
     * Retrieve a registered {@link GameObject} by key.
     *
     * @param key - The key used when the object was registered.
     * @returns The {@link GameObject}, or `undefined` if not found.
     */
    public getGameObject(key: string): GameObject | undefined {
        return this.gameObjects.get(key);
    }

    /**
     * Get all {@link GameObject} instances that carry the given tag.
     *
     * @param tag - The tag to filter by.
     * @returns An array of matching {@link GameObject} instances.
     */
    public getGameObjectsByTag(tag: string): GameObject[] {
        const result: GameObject[] = [];
        for (const obj of this.gameObjects.values()) {
            if (obj.hasTag(tag)) {
                result.push(obj);
            }
        }
        return result;
    }

    /**
     * Remove and dispose a {@link GameObject} by key.
     * Calls {@link GameObject.dispose} before removing it from the registry.
     *
     * @param key - The key used when the object was registered.
     */
    public removeGameObject(key: string): void {
        const obj = this.gameObjects.get(key);
        if (obj) {
            obj.dispose();
            this.gameObjects.delete(key);
        }
    }

    /** Renders the underlying BabylonJS {@link Scene} for this frame. */
    public render(): void {
        this.scene.render();
    }

    /**
     * Engine-only initializer that runs library-level setup then calls
     * the subclass hook {@link setup}.
     *
     * @internal
     */
    public async _internalSetup(): Promise<void> {

        await this.setup();
        if (metadataRepository.isDirty) {
            await this.internalProcessMetadata();
        }
    }

    /**
     * Builds the scene content (cameras, lights, meshes, GameObjects, etc.).
     * Called automatically by {@link SceneManager.addScene}.
     *
     * Override this in every concrete scene subclass.
     *
     * @example
     * ```ts
     * public async setup(): Promise<void> {
     *     new FreeCamera("cam", new Vector3(0, 5, -10), this.scene);
     *     new HemisphericLight("light", Vector3.Up(), this.scene);
     *     await this.game.assetManager.loadModel("level", "/assets/models/", "level.glb", this.scene);
     * }
     * ```
     */
    public abstract setup(): Promise<void>;

    /**
     * Disposes all registered {@link GameObject} instances, the
     * {@link InputManager}, {@link XRManager}, and the underlying
     * BabylonJS {@link Scene}, freeing all associated GPU resources.
     */
    public dispose(): void {
        for (const obj of this.gameObjects.values()) {
            obj.dispose();
        }
        this.gameObjects.clear();
        this.inputManager.dispose();
        this.xrManager.dispose();
        this.scene.dispose();
    }

    /**
     * Called every frame before render with the elapsed time in seconds.
     * Override to add scene-level per-frame logic that runs after all
     * {@link GameObject.onUpdate} calls.
     *
     * @param _deltaTime - Time since the last frame in seconds.
     */
    protected update(_deltaTime: number): void {
    }

    /**
     * Called after metadata processing is complete. Override to handle
     * custom {@link MetadataRepository} entries that are not processed
     * automatically by the engine.
     *
     * @param _metadataRepository - The shared {@link MetadataRepository} singleton.
     */
    protected processMetadata(_metadataRepository: MetadataRepository) {
    }

    /** @internal */
    private internalUpdate(deltaTime: number): void {
        this.game.systems.update(deltaTime);

        for (const obj of this.gameObjects.values()) {
            if (obj.enabled) {
                obj.onUpdate(deltaTime);
            }
        }

        this.update(deltaTime);
    }

    /** @internal */
    private async internalProcessMetadata(): Promise<void> {
        for (const node of metadataRepository) {
            // enable collisions
            if (
                node.data.generic?.collision &&
                node.mesh &&
                'checkCollisions' in node.mesh
            ) {
                (node.mesh as any).checkCollisions = true;
                console.log(`collision for ${node.name}`);
            }
        }

        const doors = metadataRepository.getByType(SorskootEntryTypes.Door);
        let doorIndex = 0;
        for (const door of doors) {
            if (!door.mesh) {
                continue;
            }

            const doorObj = new DoorObject(
                `door_${doorIndex}`,
                this,
                door.mesh,
                {
                    reversed: door.data.door?.reversed,
                    locked:   true, // all doors are locked at the start
                },
            );
            this.addGameObject(`door_${doorIndex}`, doorObj);
            this.interactionManager.enableInteraction(doorObj);
            doorIndex++;
        }

        const inspectables = metadataRepository.getByType(SorskootEntryTypes.Inspectable);
        for (const inspectable of inspectables) {
            if (!inspectable.mesh) {
                continue;
            }
            const inspectableObj = new InspectObject(inspectable.name, this, this.xrManager, inspectable.mesh);

            this.addGameObject(`inspectable_${inspectable.id}`, inspectableObj);
            this.interactionManager.enableInteraction(inspectableObj);
        }

        this.processMetadata(metadataRepository);
    }
}
