import {
    MeshBuilder,
    Vector3,
    AbstractMesh,
} from '@babylonjs/core';
import { GameEngine, Component, System } from '../../src/engine';
import type { IGameEngine } from '../../src/engine/core/types';

// --- Components: pure data ---
class TransformLink extends Component {
    mesh?: AbstractMesh;
}

class Spinner extends Component {
    speed = 1;
    axis: 'x' | 'y' | 'z' = 'y';
}

class Bobber extends Component {
    amplitude = 0.5;
    frequency = 2;
    private _baseY = 0;
    private _time = 0;

    onAdd(): void {
        const link = this.entity?.getComponent(TransformLink);
        if (link?.mesh) {
            this._baseY = link.mesh.position.y;
        }
    }

    get offset(): number {
        return Math.sin(this._time * this.frequency) * this.amplitude;
    }

    advance(delta: number): void {
        this._time += delta;
    }

    get baseY(): number {
        return this._baseY;
    }
}

// --- Systems: pure logic ---
class SpinnerSystem extends System {
    readonly name = 'spinner';
    private _engine!: IGameEngine;

    constructor() {
        super(10);
    }

    override onRegister(engine: IGameEngine): void {
        this._engine = engine;
    }

    update(delta: number): void {
        for (const entity of this._engine.entities) {
            const spinner = entity.getComponent(Spinner);
            const link = entity.getComponent(TransformLink);
            if (spinner && link?.mesh) {
                link.mesh.rotation[spinner.axis] += spinner.speed * delta;
            }
        }
    }
}

class BobberSystem extends System {
    readonly name = 'bobber';
    private _engine!: IGameEngine;

    constructor() {
        super(11);
    }

    override onRegister(engine: IGameEngine): void {
        this._engine = engine;
    }

    update(delta: number): void {
        for (const entity of this._engine.entities) {
            const bobber = entity.getComponent(Bobber);
            const link = entity.getComponent(TransformLink);
            if (bobber && link?.mesh) {
                bobber.advance(delta);
                link.mesh.position.y = bobber.baseY + bobber.offset;
            }
        }
    }
}

// --- Bootstrap ---
const game = new GameEngine();
await game.initialize();

game.registerSystem(new SpinnerSystem());
game.registerSystem(new BobberSystem());

// Spawn entities
for (let i = 0; i < 5; i++) {
    const mesh = MeshBuilder.CreateBox(`box_${i}`, { size: 0.8 }, game.scene);
    mesh.position.x = (i - 2) * 1.5;
    mesh.position.y = 1;

    const entity = game.createEntity(`Box_${i}`);
    const link = entity.addComponent(new TransformLink());
    link.mesh = mesh;

    const spinner = entity.addComponent(new Spinner());
    spinner.speed = 0.5 + i * 0.3;

    const bobber = entity.addComponent(new Bobber());
    bobber.frequency = 1 + i * 0.5;
    bobber.amplitude = 0.3;
}

game.start();
