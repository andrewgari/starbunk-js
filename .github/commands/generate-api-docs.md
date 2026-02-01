description = "PRD-aligned API documentation generation"
prompt = """
# API Documentation Generator

## 🎯 Strategic Purpose
**PRD Reference**: API contracts defined in active PRD initiatives
**Scope**: Document only APIs required by current PRD success criteria

Documentation must cover PRD-required endpoints, success criteria verification paths, and error scenarios.

You are creating comprehensive, developer-friendly API documentation aligned with PRD requirements.

## Documentation Protocol

### Phase 1: API Discovery
1. **Identify All Endpoints**
   ```bash
   # Find route definitions
   rg "router\.(get|post|put|patch|delete)" --type ts

   # Find controller methods
   rg "@(Get|Post|Put|Delete|Patch)\(" --type ts
   ```

2. **Extract Schemas**
   - Request/response types
   - Validation schemas (Zod)
   - Error responses
   - Authentication requirements

### Phase 2: OpenAPI Specification
```yaml
openapi: 3.0.0
info:
  title: Bunkbot API
  version: 1.0.0
  description: Social OS API for Discord bot management
  contact:
    name: API Support
    email: support@bunkbot.dev

servers:
  - url: https://api.bunkbot.dev/v1
    description: Production
  - url: https://staging-api.bunkbot.dev/v1
    description: Staging

paths:
  /messages:
    post:
      summary: Process a Discord message
      description: Processes an incoming Discord message through the bot's personality engine
      tags:
        - Messages
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProcessMessageRequest'
            examples:
              basic:
                value:
                  content: "Hello bot!"
                  userId: "123456789"
                  guildId: "987654321"
              withContext:
                value:
                  content: "What's the weather?"
                  userId: "123456789"
                  guildId: "987654321"
                  context:
                    personality: "sassy"
                    previousMessages: 5
      responses:
        '200':
          description: Message processed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProcessMessageResponse'
              examples:
                success:
                  value:
                    success: true
                    response: "It's sunny! ☀️"
                    metadata:
                      processingTime: 145
                      tokensUsed: 42
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  schemas:
    ProcessMessageRequest:
      type: object
      required:
        - content
        - userId
        - guildId
      properties:
        content:
          type: string
          minLength: 1
          maxLength: 2000
          description: The message content to process
        userId:
          type: string
          pattern: '^[0-9]{17,19}$'
          description: Discord user ID
        guildId:
          type: string
          pattern: '^[0-9]{17,19}$'
          description: Discord guild (server) ID
        context:
          type: object
          properties:
            personality:
              type: string
              enum: [default, sassy, formal, casual]
            previousMessages:
              type: integer
              minimum: 0
              maximum: 20
              description: Number of previous messages to include as context

    ProcessMessageResponse:
      type: object
      properties:
        success:
          type: boolean
        response:
          type: string
          description: The bot's response message
        metadata:
          type: object
          properties:
            processingTime:
              type: integer
              description: Processing time in milliseconds
            tokensUsed:
              type: integer
              description: Number of AI tokens consumed
            personality:
              type: string
              description: Personality used for this response

    Error:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
          description: Error code
        message:
          type: string
          description: Human-readable error message
        details:
          type: object
          description: Additional error details
        requestId:
          type: string
          format: uuid
          description: Request ID for support tracking

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: INVALID_REQUEST
            message: Content must not be empty
            requestId: 550e8400-e29b-41d4-a716-446655440000

    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: UNAUTHORIZED
            message: Valid API key required

    RateLimitExceeded:
      description: Rate limit exceeded
      headers:
"""
