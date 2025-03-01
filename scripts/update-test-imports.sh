#!/bin/bash

# Loop through all bot directories
for bot_dir in src/starbunk/bots/reply-bots/*/; do
  # Extract bot name from directory path
  botname=$(basename "$bot_dir")
  test_file="${bot_dir}${botname}.test.ts"

  # Check if test file exists
  if [ -f "$test_file" ]; then
    echo "Updating imports in $test_file"

    # Update import for the bot implementation (handle both relative and @ alias paths)
    sed -i "s|import create${botname} from '.*';|import create${botname} from './${botname}';|" "$test_file"
    sed -i "s|import { .*, create${botname} } from '.*';|import { BLUEBOT_TIMESTAMP_KEY, BlueBot } from './${botname}Model';\nimport create${botname} from './${botname}';|" "$test_file"
    sed -i "s|import { .*, BlueBot, create${botname} } from '@/starbunk/bots/reply-bots/${botname}';|import { BLUEBOT_TIMESTAMP_KEY, BlueBot } from './${botname}Model';\nimport create${botname} from './${botname}';|" "$test_file"

    # Update import for ReplyBot
    sed -i "s|import ReplyBot from '.*starbunk/bots/replyBot';|import ReplyBot from '../../../replyBot';|" "$test_file"
    sed -i "s|import ReplyBot from '@/starbunk/bots/replyBot';|import ReplyBot from '../../../replyBot';|" "$test_file"

    # Update import for mock services
    sed -i "s|import { createMockGuildMember, createMockMessage } from '.*mocks/discordMocks';|import { createMockGuildMember, createMockMessage } from '../../../../tests/mocks/discordMocks';|" "$test_file"
    sed -i "s|import { createMockWebhookService } from '.*mocks/serviceMocks';|import { createMockWebhookService } from '../../../../tests/mocks/serviceMocks';|" "$test_file"

    # Update @ alias imports
    sed -i "s|import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';|import { createMockGuildMember, createMockMessage } from '../../../../tests/mocks/discordMocks';|" "$test_file"
    sed -i "s|import { createMockWebhookService } from '@/tests/mocks/serviceMocks';|import { createMockWebhookService } from '../../../../tests/mocks/serviceMocks';|" "$test_file"
    sed -i "s|import webhookService from '@/webhooks/webhookService';|import webhookService from '../../../../webhooks/webhookService';|" "$test_file"
    sed -i "s|import { botStateService } from '@/services/botStateService';|import { botStateService } from '../../../../services/botStateService';|" "$test_file"
  fi
done

echo "All test imports have been updated."
