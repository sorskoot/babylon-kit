# Audio

Web Audio API wrapper with groups, volume control, and spatial audio support.

## Setup

```typescript
import { AudioManager } from "./src/engine";

const audio = new AudioManager();
audio.init();  // creates AudioContext (call on user gesture)
```

## Audio Groups

Organize sounds into groups (SFX, music, UI, etc.):

```typescript
audio.createGroup("sfx", 0.8);
audio.createGroup("music", 0.5);

audio.setGroupVolume("sfx", 1.0);
audio.setGroupMuted("music", true);
```

## Loading Audio

```typescript
await audio.loadBuffer("explosion", "assets/audio/explosion.wav");
await audio.loadBuffer("bgMusic", "assets/audio/music.mp3");
```

Or register an already-decoded `AudioBuffer`:

```typescript
audio.registerBuffer("custom", myAudioBuffer);
```

## Playback

```typescript
const handle = audio.play("explosion", {
    group: "sfx",
    volume: 0.9,
    loop: false,
});

handle.stop();
handle.pause();
handle.resume();
handle.volume = 0.5;
```

## Master Volume

```typescript
audio.masterVolume = 0.7;
audio.muted = true;   // mute everything
audio.muted = false;
```

## Stop All

```typescript
audio.stopAll();
```

## Cleanup

```typescript
audio.dispose();  // stops all sounds, closes AudioContext
```
