/** Result of a physics raycast query. */
export interface RaycastHit {
    /** Entity ID of the hit body, if any. */
    entityId?: number;
    /** World-space point of contact. */
    point: { x: number; y: number; z: number };
    /** Surface normal at the point of contact. */
    normal: { x: number; y: number; z: number };
    /** Distance from the ray origin to the hit point. */
    distance: number;
}

/** Describes the shape of a physics collider. */
export interface ColliderDescriptor {
    /** Collider primitive type. */
    type: 'box' | 'sphere' | 'capsule' | 'mesh';
    /** Half-extents for a box collider. */
    size?: { x: number; y: number; z: number };
    /** Radius for sphere/capsule colliders. */
    radius?: number;
    /** Height for a capsule collider. */
    height?: number;
    /** When `true`, the collider is a trigger (no physical response). */
    isTrigger?: boolean;
}

/** Describes the physical properties of a rigid body. */
export interface RigidBodyDescriptor {
    /** Body simulation type. */
    type: 'dynamic' | 'kinematic' | 'static';
    /** Mass in kilograms. */
    mass?: number;
    /** Surface friction coefficient. */
    friction?: number;
    /** Bounciness (coefficient of restitution). */
    restitution?: number;
}

/**
 * Physics service managing rigid bodies, colliders, and raycasting.
 *
 * @remarks
 * This service provides a data-management layer for physics objects. The
 * actual simulation step and raycasting are stubbed with TK comments
 * for future Havok integration.
 */
export class PhysicsService {
    private _enabled = false;
    private _gravity = { x: 0, y: -9.81, z: 0 };
    private readonly _bodies = new Map<number, RigidBodyDescriptor>();
    private readonly _colliders = new Map<number, ColliderDescriptor>();

    /** Whether the physics engine is active. */
    get enabled(): boolean {
        return this._enabled;
    }

    /** Current world gravity vector (copy). */
    get gravity(): { x: number; y: number; z: number } {
        return { ...this._gravity };
    }

    /** Set the world gravity vector. */
    set gravity(value: { x: number; y: number; z: number }) {
        this._gravity = { ...value };
    }

    /**
     * Initialise the physics subsystem.
     * @param gravity - Optional gravity override.
     */
    init(gravity?: { x: number; y: number; z: number }): void {
        if (gravity) {
            this._gravity = { ...gravity };
        }
        this._enabled = true;
    }

    /**
     * Register a rigid body for the given entity.
     * @param entityId - The entity ID.
     * @param descriptor - Body parameters.
     */
    addRigidBody(entityId: number, descriptor: RigidBodyDescriptor): void {
        this._bodies.set(entityId, { ...descriptor });
    }

    /**
     * Remove a rigid body.
     * @param entityId - The entity ID.
     */
    removeRigidBody(entityId: number): void {
        this._bodies.delete(entityId);
    }

    /**
     * Retrieve a rigid body descriptor.
     * @param entityId - The entity ID.
     */
    getRigidBody(entityId: number): RigidBodyDescriptor | undefined {
        return this._bodies.get(entityId);
    }

    /**
     * Register a collider for the given entity.
     * @param entityId - The entity ID.
     * @param descriptor - Collider shape parameters.
     */
    addCollider(entityId: number, descriptor: ColliderDescriptor): void {
        this._colliders.set(entityId, { ...descriptor });
    }

    /**
     * Remove a collider.
     * @param entityId - The entity ID.
     */
    removeCollider(entityId: number): void {
        this._colliders.delete(entityId);
    }

    /**
     * Retrieve a collider descriptor.
     * @param entityId - The entity ID.
     */
    getCollider(entityId: number): ColliderDescriptor | undefined {
        return this._colliders.get(entityId);
    }

    /**
     * Cast a ray and return the first hit.
     *
     * @param _origin - Ray origin in world space.
     * @param _direction - Normalised ray direction.
     * @param _maxDistance - Maximum ray length.
     * @returns The hit result, or `null` if nothing was hit.
     */
    raycast(
        _origin: { x: number; y: number; z: number },
        _direction: { x: number; y: number; z: number },
        _maxDistance = Infinity,
    ): RaycastHit | null {
        // TK: Implement with Havok integration
        return null;
    }

    /**
     * Step the physics simulation.
     * @param _delta - Time step in seconds.
     */
    update(_delta: number): void {
        if (!this._enabled) return;
        // TK: Step the physics world (Havok) and sync transforms
    }

    /** Dispose all bodies, colliders, and disable the service. */
    dispose(): void {
        this._bodies.clear();
        this._colliders.clear();
        this._enabled = false;
    }
}
