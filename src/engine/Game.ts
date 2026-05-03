import { Engine } from "@babylonjs/core";
import { SceneManager } from "./SceneManager";
import { AssetManager } from "./AssetManager";
import { UIManager } from "./UIManager";
import { ParticleManager } from "./ParticleManager";
import { AnimationManager } from "./AnimationManager";
import { AudioManager } from "./AudioManager";

/**
 * Root entry point for the game engine.
 *
 * `Game` owns the BabylonJS {@link Engine} and all top-level managers:
 * {@link SceneManager}, {@link AssetManager}, {@link UIManager},
 * {@link ParticleManager}, {@link AnimationManager}, and {@link AudioManager}.
 *
 * @example
 * ```ts
 * const game = new Game("renderCanvas");
 * await game.sceneManager.addScene("main", new MainScene(game.sceneManager.getEngine()));
 * await game.sceneManager.switchTo("main");
 * game.start();
 * ```
 */
export class Game {
    private engine: Engine;
    private canvas: HTMLCanvasElement;

    /** Manages registration and switching of {@link GameScene} instances. */
    public sceneManager: SceneManager;
    /** Loads, caches, and instantiates 3D model assets and textures. */
    public assetManager: AssetManager;
    /** Creates and manages fullscreen 2D and in-world 3D UI panels. */
    public uiManager: UIManager;
    /** Creates and manages persistent and one-shot particle systems. */
    public particleManager: ParticleManager;
    /** Manages GLB animations, property tweens, and shader transitions. */
    public animationManager: AnimationManager;
    /** Manages music tracks and sound effects with independent volume/mute controls. */
    public audioManager: AudioManager;

    /**
     * Creates a new Game instance bound to a canvas element.
     *
     * @param canvasId - The `id` attribute of the `<canvas>` element in the DOM.
     */
    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.engine = new Engine(this.canvas, true);
        this.sceneManager = new SceneManager(this.engine);
        this.assetManager = new AssetManager();
        this.uiManager = new UIManager();
        this.particleManager = new ParticleManager();
        this.animationManager = new AnimationManager();
        this.audioManager = new AudioManager();

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    /** Returns the underlying BabylonJS {@link Engine}. */
    public getEngine(): Engine {
        return this.engine;
    }

    /** Returns the HTML canvas element the engine renders into. */
    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Starts the engine render loop.
     * The active scene (if any) is rendered every frame.
     */
    public start(): void {
        this.engine.runRenderLoop(() => {
            const activeScene = this.sceneManager.getActiveScene();
            if (activeScene) {
                activeScene.render();
            }
        });
    }

    /** Disposes all scenes, the audio manager, and the BabylonJS engine, freeing all GPU resources. */
    public dispose(): void {
        this.audioManager.dispose();
        this.sceneManager.dispose();
        this.engine.dispose();
    }
}
