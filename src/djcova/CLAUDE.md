# DJCova - Development Instructions

## Goals & Purpose
DJCova is the dedicated music and audio streaming service for the StarBunk Discord system.
It enabled members of a discord channel to use commands /play <youtube url>, and the bot will join voice and play music for voice chat.
The bot will also have the ability to queue up songs, and play them in order. The queue will be managed on a per-guild basis, so each discord server will have its own queue.

## Major Features
- YouTube audio playback.
- Voice channel state management.
- Audio streaming and queue management.

## Inputs & Outputs
- **Input:** Voice channel events, text commands to alter queue/music state.
- **Output:** Discord voice channel audio streaming, queue status text replies.

## Dependencies & Architecture
- **Primary Dependencies:** Discord.js Voice, ffmpeg, audio processing libraries, Redis (for tracking session/queue state).
- Extremely CPU-intensive. Avoid blocking the event loop to prevent voice stutter.

## Edge Cases to Consider
- Observability of voice connection health and audio player state.
- Handling concurrent play requests and queue races.
- Gracefully handling YouTube playback errors or restricted videos.
- Proper cleanup of ffmpeg processes upon disconnect or crash.
