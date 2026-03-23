import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/engine/core/engine';
import { System } from '../../src/engine/core/system';
import { Component } from '../../src/engine/core/component';
import { resetEntityIdCounter } from '../../src/engine/core/entity';

class CounterSystem extends System {
    readonly name = 'counter';
    updateCount = 0;
    fixedUpdateCount = 0;

    update(_delta: number): void {
        this.updateCount++;
    }

    override fixedUpdate(_delta: number): void {
        this.fixedUpdateCount++;
    }
}

class LowPrioritySystem extends System {
    readonly name = 'low';
    order: string[] = [];

    constructor(order: string[]) {
        super(10);
        this.order = order;
    }

    update(): void {
        this.order.push('low');
    }
}

class HighPrioritySystem extends System {
    readonly name = 'high';
    order: string[] = [];

    constructor(order: string[]) {
        super(1);
        this.order = order;
    }

    update(): void {
        this.order.push('high');
    }
}

class TestComponent extends Component {
    updateCount = 0;

    onUpdate(_delta: number): void {
        this.updateCount++;
    }
}

describe('GameEngine', () => {
    beforeEach(() => {
        resetEntityIdCounter();
    });

    describe('entity management', () => {
        it('creates entities', () => {
            const engine = new GameEngine();
            const entity = engine.createEntity('Player');
            expect(entity.name).toBe('Player');
            expect(engine.entities).toHaveLength(1);
        });

        it('destroys entities and removes from list', () => {
            const engine = new GameEngine();
            const entity = engine.createEntity('Player');
            engine.destroyEntity(entity);
            expect(engine.entities).toHaveLength(0);
        });
    });

    describe('system management', () => {
        it('registers and retrieves systems', () => {
            const engine = new GameEngine();
            const system = new CounterSystem();
            engine.registerSystem(system);
            expect(engine.getSystem('counter')).toBe(system);
        });

        it('throws on duplicate system registration', () => {
            const engine = new GameEngine();
            engine.registerSystem(new CounterSystem());
            expect(() => engine.registerSystem(new CounterSystem())).toThrow(
                'already registered',
            );
        });

        it('unregisters systems', () => {
            const engine = new GameEngine();
            const system = new CounterSystem();
            engine.registerSystem(system);
            engine.unregisterSystem(system);
            expect(engine.getSystem('counter')).toBeUndefined();
        });

        it('sorts systems by priority on update', () => {
            const engine = new GameEngine();
            const order: string[] = [];
            engine.registerSystem(new LowPrioritySystem(order));
            engine.registerSystem(new HighPrioritySystem(order));

            engine.start();
            engine.tick(0);
            engine.tick(16.67);
            engine.stop();

            expect(order[0]).toBe('high');
            expect(order[1]).toBe('low');
        });

        it('skips disabled systems', () => {
            const engine = new GameEngine();
            const system = new CounterSystem();
            system.enabled = false;
            engine.registerSystem(system);

            engine.start();
            engine.tick(0);
            engine.tick(16.67);
            engine.stop();

            expect(system.updateCount).toBe(0);
        });
    });

    describe('service management', () => {
        it('registers and retrieves services', () => {
            const engine = new GameEngine();
            const svc = { hello: 'world' };
            engine.registerService('test', svc);
            expect(engine.getService('test')).toBe(svc);
        });

        it('throws on duplicate service registration', () => {
            const engine = new GameEngine();
            engine.registerService('test', {});
            expect(() => engine.registerService('test', {})).toThrow(
                'already registered',
            );
        });

        it('returns undefined for missing service', () => {
            const engine = new GameEngine();
            expect(engine.getService('nope')).toBeUndefined();
        });
    });

    describe('lifecycle', () => {
        it('starts and stops', () => {
            const engine = new GameEngine();
            engine.start();
            engine.stop();
        });

        it('pauses and resumes', () => {
            const engine = new GameEngine();
            engine.start();
            engine.pause();
            expect(engine.time.paused).toBe(true);
            engine.resume();
            expect(engine.time.paused).toBe(false);
            engine.stop();
        });
    });

    describe('component updates', () => {
        it('calls component onUpdate during engine update', () => {
            const engine = new GameEngine();
            const entity = engine.createEntity();
            const comp = entity.addComponent(new TestComponent());

            engine.start();
            engine.tick(0);
            engine.tick(16.67);
            engine.stop();

            expect(comp.updateCount).toBe(2);
        });
    });
});
