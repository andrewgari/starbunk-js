export { 
    MetricsService, 
    initializeMetrics, 
    getMetrics,
    type MessageFlowMetrics,
    type ChannelActivity
} from './MetricsService';

export { 
    StructuredLogger, 
    initializeStructuredLogger, 
    getStructuredLogger,
    type LogContext,
    type MessageFlowLog,
    type ChannelActivityLog,
    type SystemLog
} from './StructuredLogger';

export {
    ChannelActivityTracker,
    initializeChannelActivityTracker,
    getChannelActivityTracker
} from './ChannelActivityTracker';

// Import for internal use
import { initializeMetrics } from './MetricsService';
import { initializeStructuredLogger } from './StructuredLogger';
import { initializeChannelActivityTracker } from './ChannelActivityTracker';

// Combined initialization helper
export function initializeObservability(service: string) {
    const metrics = initializeMetrics(service);
    const structuredLogger = initializeStructuredLogger(service);
    const channelTracker = initializeChannelActivityTracker();
    
    return { metrics, logger: structuredLogger, channelTracker };
}