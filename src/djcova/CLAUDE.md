# DJCova - Development Instructions

## Goals & Purpose
DJCova is the dedicated music and audio streaming service for the StarBunk Discord system. It is CPU-optimized for audio processing.

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
- Discord voice region connectivity issues.
- Handling concurrent play requests and queue races.
- Gracefully handling YouTube playback errors or restricted videos.
- Proper cleanup of ffmpeg processes upon disconnect or crash.
