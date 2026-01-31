// Simple dependency injection container for DJCova

const containerRegistry = new Map<symbol, unknown>();

export const container = {
  register: (key: symbol, value: unknown) => {
    containerRegistry.set(key, value);
  },
  resolve: (key: symbol) => {
    return containerRegistry.get(key) || null;
  },
  get: <T = unknown>(key: symbol): T | undefined => {
    return containerRegistry.get(key) as T | undefined;
  },
  has: (key: symbol) => {
    return containerRegistry.has(key);
  },
};

export const ServiceId = {
  DiscordClient: Symbol('DiscordClient'),
  MusicPlayer: Symbol('MusicPlayer'),
  DJCovaService: Symbol('DJCovaService'),
};
