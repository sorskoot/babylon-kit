/**
 * BJS Game Engine — a Babylon.js-powered ECS game engine.
 *
 * @remarks
 * This package provides a complete Entity-Component-System framework,
 * game loop, and service layer (input, assets, audio, physics, scenes)
 * built on top of Babylon.js.
 *
 * @packageDocumentation
 */
export { GameEngine } from './core/engine.js';
export { GameLoop } from './core/loop.js';
export { Entity } from './core/entity.js';
export { Component } from './core/component.js';
export { System } from './core/system.js';
export { InputSystem } from './services/input/inputSystem.js';
export { AssetManager } from './services/assets/assetManager.js';
export { AudioManager } from './services/audio/audioManager.js';
export { PhysicsService } from './services/physics/physicsService';
export { SceneManager } from './services/scenes/sceneManager';
export { DebugOverlay } from './debug/debugOverlay';
export { createEntityListServiceDefinition } from './debug/EntityListServiceDefinition';
export { MeshComponent } from './components/meshComponent.js';
export { MaterialComponent } from './components/materialComponent.js';
export { XRControllerComponent } from './components/xrControllerComponent.js';
export { MeshLoaderSystem } from './systems/meshLoaderSystem.js';
export { MaterialLoaderSystem } from './systems/materialLoaderSystem.js';
export { XRControllerSystem } from './systems/xrControllerSystem.js';
export type {
    EngineConfig,
    PhysicsConfig,
    TimeState,
    ComponentClass,
    IComponent,
    IEntity,
    ISystem,
    IGameEngine,
    IInputAction,
    InputBinding,
    IAssetLoader,
    AssetManifest,
    AssetEntry,
    SystemUpdatePhase,
    SceneDescriptor,
} from './core/types';
export type { LoadState, MeshComponentOptions, MeshComponentUrlOptions, MeshComponentMeshOptions } from './components/meshComponent.js';
export type { MaterialMode } from './components/materialComponent.js';
export type { XRHandedness, XRTrackingSpace } from './components/xrControllerComponent.js';
