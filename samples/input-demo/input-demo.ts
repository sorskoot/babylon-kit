import {
    Engine,
    Scene,
    FreeCamera,
    HemisphericLight,
    MeshBuilder,
    Vector3,
} from '@babylonjs/core';
import { GameEngine, InputSystem } from '../../src/engine';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const babylonEngine = new Engine(canvas, true);
const scene = new Scene(babylonEngine);

const camera = new FreeCamera('camera', new Vector3(0, 2, -5), scene);
camera.setTarget(Vector3.Zero());
const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);

// --- Input setup ---
const input = new InputSystem();
input.attach(canvas);

input.registerAction({
    name: 'moveForward',
    bindings: [{ type: 'keyboard', code: 'KeyW', scale: 1 }],
});
input.registerAction({
    name: 'moveBack',
    bindings: [{ type: 'keyboard', code: 'KeyS', scale: -1 }],
});
input.registerAction({
    name: 'moveLeft',
    bindings: [{ type: 'keyboard', code: 'KeyA', scale: -1 }],
});
input.registerAction({
    name: 'moveRight',
    bindings: [{ type: 'keyboard', code: 'KeyD', scale: 1 }],
});
input.registerAction({
    name: 'jump',
    bindings: [{ type: 'keyboard', code: 'Space' }],
});

// --- Game engine ---
const game = new GameEngine({ debug: true });
game.registerService('input', input);

const speed = 3;

babylonEngine.runRenderLoop(() => {
    input.update();

    const fwd =
        input.getActionValue('moveForward') + input.getActionValue('moveBack');
    const strafe =
        input.getActionValue('moveRight') + input.getActionValue('moveLeft');

    const dt = babylonEngine.getDeltaTime() / 1000;
    box.position.z += fwd * speed * dt;
    box.position.x += strafe * speed * dt;

    if (input.isActionPressed('jump')) {
        console.log('Jump!');
    }

    scene.render();
});

window.addEventListener('resize', () => babylonEngine.resize());
