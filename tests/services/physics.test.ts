import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsService } from '../../src/engine/services/physics/physicsService';

describe('PhysicsService', () => {
    let physics: PhysicsService;

    beforeEach(() => {
        physics = new PhysicsService();
    });

    it('starts disabled', () => {
        expect(physics.enabled).toBe(false);
    });

    it('enables on init', () => {
        physics.init();
        expect(physics.enabled).toBe(true);
    });

    it('uses default gravity', () => {
        const g = physics.gravity;
        expect(g.y).toBe(-9.81);
    });

    it('accepts custom gravity on init', () => {
        physics.init({ x: 0, y: -20, z: 0 });
        expect(physics.gravity.y).toBe(-20);
    });

    it('allows setting gravity after init', () => {
        physics.init();
        physics.gravity = { x: 0, y: -5, z: 0 };
        expect(physics.gravity.y).toBe(-5);
    });

    describe('rigid bodies', () => {
        it('adds and retrieves a rigid body', () => {
            physics.addRigidBody(1, { type: 'dynamic', mass: 10 });
            const body = physics.getRigidBody(1);
            expect(body).toBeDefined();
            expect(body!.type).toBe('dynamic');
            expect(body!.mass).toBe(10);
        });

        it('removes a rigid body', () => {
            physics.addRigidBody(1, { type: 'static' });
            physics.removeRigidBody(1);
            expect(physics.getRigidBody(1)).toBeUndefined();
        });
    });

    describe('colliders', () => {
        it('adds and retrieves a collider', () => {
            physics.addCollider(1, { type: 'box', size: { x: 1, y: 1, z: 1 } });
            const col = physics.getCollider(1);
            expect(col).toBeDefined();
            expect(col!.type).toBe('box');
        });

        it('removes a collider', () => {
            physics.addCollider(1, { type: 'sphere', radius: 2 });
            physics.removeCollider(1);
            expect(physics.getCollider(1)).toBeUndefined();
        });
    });

    describe('raycast', () => {
        it('returns null (placeholder)', () => {
            physics.init();
            const hit = physics.raycast(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: -1, z: 0 },
            );
            expect(hit).toBeNull();
        });
    });

    describe('dispose', () => {
        it('clears all state', () => {
            physics.init();
            physics.addRigidBody(1, { type: 'dynamic' });
            physics.addCollider(1, { type: 'box' });
            physics.dispose();
            expect(physics.enabled).toBe(false);
            expect(physics.getRigidBody(1)).toBeUndefined();
            expect(physics.getCollider(1)).toBeUndefined();
        });
    });
});
