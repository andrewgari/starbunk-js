/**
 * Example Bots Module
 *
 * This module exports example bots that demonstrate various patterns
 * for creating bots with the builder pattern. These bots are not used
 * in production but serve as documentation and examples.
 */

import createComplexExampleBot from './complexExampleBot';
import createConditionResponseBot from './conditionResponseBot';
import createCustomConditionBot from './customConditionBot';
import createExampleBot from './exampleBot';
import createMimicBot from './mimicBot';

// Named exports
export {
	createComplexExampleBot,
	createConditionResponseBot,
	createCustomConditionBot,
	createExampleBot,
	createMimicBot
};

// Default export
export default {
	createExampleBot,
	createMimicBot,
	createComplexExampleBot,
	createConditionResponseBot,
	createCustomConditionBot
};
