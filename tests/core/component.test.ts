import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '../../src/engine/core/component';

class HealthComponent extends Component {
    hp = 100;
    addCalled = false;
    removeCalled = false;
    enableCalled = false;
    disableCalled = false;
    lastDelta = 0;

    onAdd(): void {
        this.addCalled = true;
    }

    onRemove(): void {
        this.removeCalled = true;
    }

    onEnable(): void {
        this.enableCalled = true;
    }

    onDisable(): void {
        this.disableCalled = true;
    }

    onUpdate(delta: number): void {
        this.lastDelta = delta;
    }
}

describe('Component', () => {
    let comp: HealthComponent;

    beforeEach(() => {
        comp = new HealthComponent();
    });

    it('starts without an entity reference', () => {
        expect(comp.entity).toBeUndefined();
    });

    it('holds data fields', () => {
        expect(comp.hp).toBe(100);
        comp.hp -= 25;
        expect(comp.hp).toBe(75);
    });

    it('defines lifecycle hooks', () => {
        comp.onAdd?.();
        expect(comp.addCalled).toBe(true);

        comp.onRemove?.();
        expect(comp.removeCalled).toBe(true);

        comp.onEnable?.();
        expect(comp.enableCalled).toBe(true);

        comp.onDisable?.();
        expect(comp.disableCalled).toBe(true);
    });

    it('receives delta in onUpdate', () => {
        comp.onUpdate?.(0.016);
        expect(comp.lastDelta).toBeCloseTo(0.016);
    });
});
