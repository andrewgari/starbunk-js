import { trace, Span, SpanStatusCode, Tracer, context } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

/**
 * Trace service for Discord bots
 * Provides distributed tracing for message processing lifecycle
 */
export class TraceService {
  private tracer: Tracer;
  private sdk: NodeSDK;
  private enabled: boolean;
  private serviceName: string;

  constructor(serviceName: string, serviceVersion: string = '1.0.0') {
    this.enabled = process.env.OTEL_ENABLED !== 'false'; // Enabled by default
    this.serviceName = serviceName;

    if (this.enabled) {
      // Always use OTLP exporter for unified observability
      const traceExporter = new OTLPTraceExporter({
        url: this.getOtlpTraceUrl(),
      });

      // Initialize the SDK with the exporter
      this.sdk = new NodeSDK({
        serviceName,
        traceExporter,
      });

      this.sdk.start();
    } else {
      // Create a minimal SDK even when disabled
      this.sdk = new NodeSDK({
        serviceName,
      });
    }

    // Get tracer instance
    this.tracer = trace.getTracer(serviceName, serviceVersion);
  }

  /**
   * Get the OTLP trace endpoint URL
   * Constructs URL from OTEL_COLLECTOR_HOST and OTEL_COLLECTOR_HTTP_PORT
   */
  private getOtlpTraceUrl(): string {
    const host = process.env.OTEL_COLLECTOR_HOST || 'localhost';
    const port = process.env.OTEL_COLLECTOR_HTTP_PORT || '4318';
    return `http://${host}:${port}/v1/traces`;
  }

  /**
   * Start a generic span with custom name and attributes
   * This is a flexible method for creating spans in any context
   */
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span | null {
    if (!this.enabled) return null;

    return this.tracer.startSpan(name, {
      attributes: attributes || {},
    });
  }

  /**
   * Start a new root span for message processing
   */
  startMessageProcessing(
    messageId: string,
    guildId: string,
    channelId: string,
    authorId: string,
  ): Span | null {
    if (!this.enabled) return null;

    return this.tracer.startSpan('message.process', {
      attributes: {
        'message.id': messageId,
        'discord.guild.id': guildId,
        'discord.channel.id': channelId,
        'discord.author.id': authorId,
        'service.name': this.serviceName,
      },
    });
  }

  /**
   * Start a span for bot evaluation
   * Can create a root span if parentSpan is null
   */
  startBotEvaluation(parentSpan: Span | null, botName: string): Span | null {
    if (!this.enabled) return null;

    const ctx = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();
    return this.tracer.startSpan(
      'bot.evaluate',
      {
        attributes: {
          'bot.name': botName,
        },
      },
      ctx,
    );
  }

  /**
   * Start a span for trigger evaluation
   */
  startTriggerEvaluation(
    parentSpan: Span | null,
    botName: string,
    triggerName: string,
    conditionType?: string,
  ): Span | null {
    if (!this.enabled || !parentSpan) return null;

    const ctx = trace.setSpan(context.active(), parentSpan);
    return this.tracer.startSpan(
      'trigger.evaluate',
      {
        attributes: {
          'bot.name': botName,
          'trigger.name': triggerName,
          'trigger.condition_type': conditionType || 'unknown',
        },
      },
      ctx,
    );
  }

  /**
   * Start a span for condition resolution
   */
  startConditionResolution(parentSpan: Span | null, conditionType: string): Span | null {
    if (!this.enabled || !parentSpan) return null;

    const ctx = trace.setSpan(context.active(), parentSpan);
    return this.tracer.startSpan(
      'condition.resolve',
      {
        attributes: {
          'condition.type': conditionType,
        },
      },
      ctx,
    );
  }

  /**
   * Start a span for identity resolution
   */
  startIdentityResolution(parentSpan: Span | null, botName: string): Span | null {
    if (!this.enabled || !parentSpan) return null;

    const ctx = trace.setSpan(context.active(), parentSpan);
    return this.tracer.startSpan(
      'identity.resolve',
      {
        attributes: {
          'bot.name': botName,
        },
      },
      ctx,
    );
  }

  /**
   * Start a span for response generation
   */
  startResponseGeneration(
    parentSpan: Span | null,
    botName: string,
    triggerName: string,
  ): Span | null {
    if (!this.enabled || !parentSpan) return null;

    const ctx = trace.setSpan(context.active(), parentSpan);
    return this.tracer.startSpan(
      'response.generate',
      {
        attributes: {
          'bot.name': botName,
          'trigger.name': triggerName,
        },
      },
      ctx,
    );
  }

  /**
   * Start a span for message sending
   */
  startMessageSend(parentSpan: Span | null, botName: string): Span | null {
    if (!this.enabled || !parentSpan) return null;

    const ctx = trace.setSpan(context.active(), parentSpan);
    return this.tracer.startSpan(
      'message.send',
      {
        attributes: {
          'bot.name': botName,
        },
      },
      ctx,
    );
  }

  /**
   * Add attributes to a span
   */
  addAttributes(span: Span | null, attributes: Record<string, string | number | boolean>): void {
    if (!this.enabled || !span) return;
    span.setAttributes(attributes);
  }

  /**
   * Add an event to a span
   */
  addEvent(
    span: Span | null,
    name: string,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.enabled || !span) return;
    span.addEvent(name, attributes);
  }

  /**
   * Mark a span as successful and end it
   */
  endSpanSuccess(span: Span | null, attributes?: Record<string, string | number | boolean>): void {
    if (!this.enabled || !span) return;
    if (attributes) {
      span.setAttributes(attributes);
    }
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }

  /**
   * Mark a span as failed and end it
   */
  endSpanError(
    span: Span | null,
    error: Error | string,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.enabled || !span) return;
    if (attributes) {
      span.setAttributes(attributes);
    }
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: typeof error === 'string' ? error : error.message,
    });
    if (typeof error !== 'string') {
      span.recordException(error);
    }
    span.end();
  }

  /**
   * End a span without setting status (for informational spans)
   */
  endSpan(span: Span | null): void {
    if (!this.enabled || !span) return;
    span.end();
  }

  /**
   * Get trace ID from a span for correlation with logs
   */
  getTraceId(span: Span | null): string | null {
    if (!this.enabled || !span) return null;
    return span.spanContext().traceId;
  }

  /**
   * Get span ID from a span for correlation with logs
   */
  getSpanId(span: Span | null): string | null {
    if (!this.enabled || !span) return null;
    return span.spanContext().spanId;
  }

  /**
   * Shutdown the tracer provider (call on application shutdown)
   */
  async shutdown(): Promise<void> {
    if (!this.enabled) return;
    await this.sdk.shutdown();
  }
}

// Singleton instance
let traceServiceInstance: TraceService | null = null;

/**
 * Get or create the trace service singleton
 */
export function getTraceService(serviceName: string, serviceVersion?: string): TraceService {
  if (!traceServiceInstance) {
    traceServiceInstance = new TraceService(serviceName, serviceVersion);
  }
  return traceServiceInstance;
}
