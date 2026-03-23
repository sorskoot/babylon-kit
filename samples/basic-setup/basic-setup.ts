import { MeshBuilder } from '@babylonjs/core';
import { GameEngine, Component, System } from '../../src/engine';
import type { IGameEngine } from '../../src/engine/core/types';

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

    override onRegister(engine: IGameEngine): void {
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
const game = new GameEngine({ debug: true });
await game.initialize();

// The scene, camera, light, and WebXR are already set up.
// Just add a mesh to the auto-created Babylon.js scene:
MeshBuilder.CreateBox('box', { size: 1 }, game.scene);

game.registerSystem(new RotationSystem());

const box = game.createEntity('Box');
box.addComponent(new RotateComponent());

game.start();
