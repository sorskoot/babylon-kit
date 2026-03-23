import {
    Engine,
    Scene,
    FreeCamera,
    HemisphericLight,
    MeshBuilder,
    Vector3,
} from '@babylonjs/core';
import { GameEngine, Component, System } from '../../src/engine';

// --- Components ---
class RotateComponent extends Component {
    speed = 1;
}

// --- Systems ---
class RotationSystem extends System {
    readonly name = 'rotation';
    private _engine!: GameEngine;

    constructor() {
        super(0);
    }

    override onRegister(
        engine: import('../../src/engine/core/types').IGameEngine,
    ): void {
        this._engine = engine as GameEngine;
    }

    update(delta: number): void {
        for (const entity of this._engine.entities) {
            const rotate = entity.getComponent(RotateComponent);
            if (rotate) {
                // TK: Hook into Babylon mesh transform here
                console.log(
                    `Rotating ${entity.name} by ${rotate.speed * delta}`,
                );
            }
        }
    }
}

// --- Bootstrap ---
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const babylonEngine = new Engine(canvas, true);
const scene = new Scene(babylonEngine);

const camera = new FreeCamera('camera', new Vector3(0, 2, -5), scene);
camera.setTarget(Vector3.Zero());
camera.attachControl(canvas, true);

new HemisphericLight('light', new Vector3(0, 1, 0), scene);
MeshBuilder.CreateBox('box', { size: 1 }, scene);

// Game engine setup
const game = new GameEngine({ debug: true });
game.registerSystem(new RotationSystem());

const box = game.createEntity('Box');
box.addComponent(new RotateComponent());

// Start both engines
game.start();
babylonEngine.runRenderLoop(() => {
    game.tick(performance.now());
    scene.render();
});

window.addEventListener('resize', () => babylonEngine.resize());
