import {
    MeshBuilder,
    Color3,
    StandardMaterial,
} from '@babylonjs/core';
import { GameEngine } from '../../src/engine';
import { SceneManager } from '../../src/engine';
import type { IGameEngine, SceneDescriptor } from '../../src/engine';

const menuScene: SceneDescriptor = {
    name: 'menu',
    async setup(engine: IGameEngine) {
        const scene = engine.scene!;
        const sphere = MeshBuilder.CreateSphere(
            'menuSphere',
            { diameter: 2 },
            scene,
        );
        const mat = new StandardMaterial('menuMat', scene);
        mat.diffuseColor = Color3.Blue();
        sphere.material = mat;
        console.log('[Scene] Menu loaded');
    },
    async teardown(engine: IGameEngine) {
        // Remove scene-specific meshes; the Babylon scene itself persists.
        const scene = engine.scene!;
        const sphere = scene.getMeshByName('menuSphere');
        sphere?.dispose();
        console.log('[Scene] Menu unloaded');
    },
};

const gameScene: SceneDescriptor = {
    name: 'game',
    async setup(engine: IGameEngine) {
        const scene = engine.scene!;
        const box = MeshBuilder.CreateBox(
            'gameBox',
            { size: 1.5 },
            scene,
        );
        const mat = new StandardMaterial('gameMat', scene);
        mat.diffuseColor = Color3.Red();
        box.material = mat;
        console.log('[Scene] Game loaded');
    },
    async teardown(engine: IGameEngine) {
        const scene = engine.scene!;
        const box = scene.getMeshByName('gameBox');
        box?.dispose();
        console.log('[Scene] Game unloaded');
    },
};

// --- Setup ---
const game = new GameEngine({ webXR: false });
await game.initialize();

const sceneManager = new SceneManager();
sceneManager.init(game);
sceneManager.register(menuScene);
sceneManager.register(gameScene);
game.registerService('scenes', sceneManager);

// Load initial scene
await sceneManager.load('menu');

// Wire up buttons
document
    .getElementById('btnMenu')!
    .addEventListener('click', () => sceneManager.load('menu'));
document
    .getElementById('btnGame')!
    .addEventListener('click', () => sceneManager.load('game'));

game.start();
