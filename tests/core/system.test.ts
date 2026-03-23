import { describe, it, expect, vi } from 'vitest';
import { System } from '../../src/engine/core/system';
import type { IGameEngine } from '../../src/engine/core/types';

class GravitySystem extends System {
    readonly name = 'gravity';
    lastDelta = 0;
    registeredEngine?: IGameEngine;

    constructor() {
        super(5);
    }

    override onRegister(engine: IGameEngine): void {
        this.registeredEngine = engine;
    }

    override onUnregister(): void {
        this.registeredEngine = undefined;
    }

    update(delta: number): void {
        this.lastDelta = delta;
    }

    override fixedUpdate(delta: number): void {
        this.lastDelta = delta;
    }
}

describe('System', () => {
    it('has a name and priority', () => {
        const sys = new GravitySystem();
        expect(sys.name).toBe('gravity');
        expect(sys.priority).toBe(5);
    });

    it('starts enabled', () => {
        const sys = new GravitySystem();
        expect(sys.enabled).toBe(true);
    });

    it('can be disabled', () => {
        const sys = new GravitySystem();
        sys.enabled = false;
        expect(sys.enabled).toBe(false);
    });

    it('receives engine on register', () => {
        const sys = new GravitySystem();
        const mockEngine = {} as IGameEngine;
        sys.onRegister?.(mockEngine);
        expect(sys.registeredEngine).toBe(mockEngine);
    });

    it('clears engine on unregister', () => {
        const sys = new GravitySystem();
        sys.onRegister?.({} as IGameEngine);
        sys.onUnregister?.();
        expect(sys.registeredEngine).toBeUndefined();
    });

    it('receives delta in update', () => {
        const sys = new GravitySystem();
        sys.update(0.016);
        expect(sys.lastDelta).toBeCloseTo(0.016);
    });

    it('receives delta in fixedUpdate', () => {
        const sys = new GravitySystem();
        sys.fixedUpdate?.(0.02);
        expect(sys.lastDelta).toBeCloseTo(0.02);
    });
});
