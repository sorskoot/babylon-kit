import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, resetEntityIdCounter } from '../../src/engine/core/entity';
import { Component } from '../../src/engine/core/component';

class TestComponent extends Component {
    value = 42;
    addCalled = false;
    removeCalled = false;
    updateCount = 0;

    onAdd(): void {
        this.addCalled = true;
    }

    onRemove(): void {
        this.removeCalled = true;
    }

    onUpdate(_delta: number): void {
        this.updateCount++;
    }
}

class AnotherComponent extends Component {
    label = 'test';
}

describe('Entity', () => {
    beforeEach(() => {
        resetEntityIdCounter();
    });

    it('assigns incrementing ids', () => {
        const a = new Entity();
        const b = new Entity();
        expect(a.id).toBe(0);
        expect(b.id).toBe(1);
    });

    it('uses provided name or generates default', () => {
        const named = new Entity('Player');
        const unnamed = new Entity();
        expect(named.name).toBe('Player');
        expect(unnamed.name).toBe('Entity_1');
    });

    it('starts enabled', () => {
        const entity = new Entity();
        expect(entity.enabled).toBe(true);
    });

    describe('addComponent', () => {
        it('adds a component and calls onAdd', () => {
            const entity = new Entity();
            const comp = entity.addComponent(new TestComponent());
            expect(comp.addCalled).toBe(true);
            expect(comp.entity).toBe(entity);
        });

        it('throws if duplicate component type added', () => {
            const entity = new Entity();
            entity.addComponent(new TestComponent());
            expect(() => entity.addComponent(new TestComponent())).toThrow(
                'already has component',
            );
        });

        it('throws on destroyed entity', () => {
            const entity = new Entity();
            entity.destroy();
            expect(() => entity.addComponent(new TestComponent())).toThrow(
                'destroyed',
            );
        });
    });

    describe('getComponent', () => {
        it('returns the component by class', () => {
            const entity = new Entity();
            const comp = entity.addComponent(new TestComponent());
            expect(entity.getComponent(TestComponent)).toBe(comp);
        });

        it('returns undefined for missing component', () => {
            const entity = new Entity();
            expect(entity.getComponent(TestComponent)).toBeUndefined();
        });
    });

    describe('hasComponent', () => {
        it('returns true when component exists', () => {
            const entity = new Entity();
            entity.addComponent(new TestComponent());
            expect(entity.hasComponent(TestComponent)).toBe(true);
        });

        it('returns false when component missing', () => {
            const entity = new Entity();
            expect(entity.hasComponent(TestComponent)).toBe(false);
        });
    });

    describe('removeComponent', () => {
        it('removes a component and calls onRemove', () => {
            const entity = new Entity();
            const comp = entity.addComponent(new TestComponent());
            entity.removeComponent(TestComponent);
            expect(comp.removeCalled).toBe(true);
            expect(comp.entity).toBeUndefined();
            expect(entity.hasComponent(TestComponent)).toBe(false);
        });

        it('silently does nothing for missing component', () => {
            const entity = new Entity();
            expect(() => entity.removeComponent(TestComponent)).not.toThrow();
        });
    });

    describe('destroy', () => {
        it('removes all components and marks as destroyed', () => {
            const entity = new Entity();
            const comp = entity.addComponent(new TestComponent());
            entity.addComponent(new AnotherComponent());
            entity.destroy();
            expect(entity.destroyed).toBe(true);
            expect(comp.removeCalled).toBe(true);
            expect(entity.components.size).toBe(0);
        });

        it('calls onDestroy callback', () => {
            let called = false;
            const entity = new Entity('test', () => {
                called = true;
            });
            entity.destroy();
            expect(called).toBe(true);
        });

        it('is idempotent', () => {
            let count = 0;
            const entity = new Entity('test', () => count++);
            entity.destroy();
            entity.destroy();
            expect(count).toBe(1);
        });
    });
});
