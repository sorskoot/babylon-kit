import {
    Engine,
    Scene,
    FreeCamera,
    HemisphericLight,
    MeshBuilder,
    Vector3,
    Color3,
    StandardMaterial,
} from '@babylonjs/core';
import { GameEngine } from '../../src/engine';
import { SceneManager } from '../../src/engine/services/scenes/sceneManager';
import type { IGameEngine, SceneDescriptor } from '../../src/engine/core/types';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const babylonEngine = new Engine(canvas, true);
let activeScene: Scene;

function createBabylonScene(): Scene {
    const scene = new Scene(babylonEngine);
    new FreeCamera('camera', new Vector3(0, 2, -5), scene).setTarget(
        Vector3.Zero(),
    );
    new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    return scene;
}

const menuScene: SceneDescriptor = {
    name: 'menu',
    async setup(_engine: IGameEngine) {
        activeScene = createBabylonScene();
        const sphere = MeshBuilder.CreateSphere(
            'menuSphere',
            { diameter: 2 },
            activeScene,
        );
        const mat = new StandardMaterial('menuMat', activeScene);
        mat.diffuseColor = Color3.Blue();
        sphere.material = mat;
        console.log('[Scene] Menu loaded');
    },
    async teardown(_engine: IGameEngine) {
        activeScene.dispose();
        console.log('[Scene] Menu unloaded');
    },
};

const gameScene: SceneDescriptor = {
    name: 'game',
    async setup(_engine: IGameEngine) {
        activeScene = createBabylonScene();
        const box = MeshBuilder.CreateBox(
            'gameBox',
            { size: 1.5 },
            activeScene,
        );
        const mat = new StandardMaterial('gameMat', activeScene);
        mat.diffuseColor = Color3.Red();
        box.material = mat;
        console.log('[Scene] Game loaded');
    },
    async teardown(_engine: IGameEngine) {
        activeScene.dispose();
        console.log('[Scene] Game unloaded');
    },
};

// --- Setup ---
const game = new GameEngine();
const sceneManager = new SceneManager();
sceneManager.init(game);
sceneManager.register(menuScene);
sceneManager.register(gameScene);
game.registerService('scenes', sceneManager);

// Load initial scene
sceneManager.load('menu');

// Wire up buttons
document
    .getElementById('btnMenu')!
    .addEventListener('click', () => sceneManager.load('menu'));
document
    .getElementById('btnGame')!
    .addEventListener('click', () => sceneManager.load('game'));

babylonEngine.runRenderLoop(() => {
    if (activeScene) activeScene.render();
});
window.addEventListener('resize', () => babylonEngine.resize());
