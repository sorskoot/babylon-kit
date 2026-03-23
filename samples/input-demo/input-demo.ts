import { MeshBuilder } from '@babylonjs/core';
import { GameEngine, InputSystem, System } from '../../src/engine';
import type { IGameEngine } from '../../src/engine/core/types';

// --- Game engine setup ---
const game = new GameEngine({ debug: true, webXR: false });
await game.initialize();

const box = MeshBuilder.CreateBox('box', { size: 1 }, game.scene);

// --- Input setup ---
const input = new InputSystem();
input.attach(game.canvas!);

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

game.registerService('input', input);

// --- Movement system ---
const speed = 3;

class MovementSystem extends System {
    readonly name = 'movement';
    private _engine!: GameEngine;

    override onRegister(engine: IGameEngine): void {
        this._engine = engine as GameEngine;
    }

    update(delta: number): void {
        const inp = this._engine.getService<InputSystem>('input')!;
        inp.update();

        const fwd =
            inp.getActionValue('moveForward') +
            inp.getActionValue('moveBack');
        const strafe =
            inp.getActionValue('moveRight') +
            inp.getActionValue('moveLeft');

        box.position.z += fwd * speed * delta;
        box.position.x += strafe * speed * delta;

        if (inp.isActionPressed('jump')) {
            console.log('Jump!');
        }
    }
}

game.registerSystem(new MovementSystem());
game.start();
