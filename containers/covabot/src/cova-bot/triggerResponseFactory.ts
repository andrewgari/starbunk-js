import { TriggerResponse, TriggerCondition, ResponseGenerator, IdentityProvider } from '../types/triggerResponse';

/**
 * Configuration for creating a new TriggerResponse
 */
export interface TriggerResponseConfig {
	name: string;
	condition: TriggerCondition;
	response: ResponseGenerator;
	identity?: IdentityProvider;
	priority?: number;
}

/**
 * Factory function to create a trigger-response pair with validation
 */
export function createTriggerResponse(config: TriggerResponseConfig): TriggerResponse {
	if (!config.name || config.name.trim().length === 0) {
		throw new Error('Trigger name cannot be empty');
	}

	if (!config.condition) {
		throw new Error('Trigger condition is required');
	}

	if (!config.response) {
		throw new Error('Trigger response is required');
	}

	return {
		name: config.name.trim(),
		condition: config.condition,
		response: config.response,
		identity: config.identity,
		priority: config.priority || 0,
	};
}
