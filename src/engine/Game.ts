import { Engine } from "@babylonjs/core";
import { SceneManager } from "./SceneManager";
import { AssetManager } from "./AssetManager";
import { UIManager } from "./UIManager.ts";
import { ParticleManager } from "./ParticleManager";
import { AnimationManager } from "./AnimationManager";

export class Game {
    private engine: Engine;
    private canvas: HTMLCanvasElement;

    public sceneManager: SceneManager;
    public assetManager: AssetManager;
    public uiManager: UIManager;
    public particleManager: ParticleManager;
    public animationManager: AnimationManager;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.engine = new Engine(this.canvas, true);
        this.sceneManager = new SceneManager(this.engine);
        this.assetManager = new AssetManager();
        this.uiManager = new UIManager();
        this.particleManager = new ParticleManager();
        this.animationManager = new AnimationManager();

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    public getEngine(): Engine {
        return this.engine;
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public start(): void {
        this.engine.runRenderLoop(() => {
            const activeScene = this.sceneManager.getActiveScene();
            if (activeScene) {
                activeScene.render();
            }
        });
    }

    public dispose(): void {
        this.sceneManager.dispose();
        this.engine.dispose();
    }
}
