export interface BotConfiguration {
  id: string;
  isEnabled: boolean;
  responseFrequency: number; // 0-100 percentage chance to respond
  corePersonality: string; // Main personality description
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConfigurationRequest {
  isEnabled?: boolean;
  responseFrequency?: number;
  corePersonality?: string;
}

export interface UpdateConfigurationRequest {
  isEnabled?: boolean;
  responseFrequency?: number;
  corePersonality?: string;
}

export interface BotConfigurationWithStats extends BotConfiguration {
  totalNotes: number;
  activeNotes: number;
  lastUpdated: Date;
}
