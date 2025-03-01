#!/bin/bash

# Loop through all bot directories
for botdir in src/starbunk/bots/reply-bots/*/; do
  botname=$(basename "${botdir%/}")
  testfile="${botdir}${botname}.test.ts"

  # Skip if test file doesn't exist
  if [ ! -f "$testfile" ]; then
    continue
  fi

  echo "Fixing imports in $testfile..."

  # Update import paths
  # 1. Replace imports from '../../../starbunk/bots/reply-bots/botName' with './botName'
  # 2. Replace imports from '../../../webhooks/webhookService' with '../../../../webhooks/webhookService'
  # 3. Replace imports from '../../mocks/discordMocks' with '../../../../tests/mocks/discordMocks'
  # 4. Replace imports from '../../helpers/replyBotHelper' with '../../../../tests/helpers/replyBotHelper'
  # 5. Replace imports from '../../../services/botStateService' with '../../../../services/botStateService'
  # 6. Replace imports from '../../../discord/userID' with '../../../../discord/userID'
  # 7. Replace imports from '../responses/botName.responses' with './botNameModel'

  # Use sed to perform the replacements
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version of sed requires an empty string for -i
    sed -i '' "s|from '../../../starbunk/bots/reply-bots/${botname}'|from './${botname}'|g" "$testfile"
    sed -i '' "s|from '../../../webhooks/webhookService'|from '../../../../webhooks/webhookService'|g" "$testfile"
    sed -i '' "s|from '../../mocks/discordMocks'|from '../../../../tests/mocks/discordMocks'|g" "$testfile"
    sed -i '' "s|from '../../helpers/replyBotHelper'|from '../../../../tests/helpers/replyBotHelper'|g" "$testfile"
    sed -i '' "s|from '../../../services/botStateService'|from '../../../../services/botStateService'|g" "$testfile"
    sed -i '' "s|from '../../../discord/userID'|from '../../../../discord/userID'|g" "$testfile"
    sed -i '' "s|from '../responses/${botname}.responses'|from './${botname}Model'|g" "$testfile"
  else
    # Linux version of sed
    sed -i "s|from '../../../starbunk/bots/reply-bots/${botname}'|from './${botname}'|g" "$testfile"
    sed -i "s|from '../../../webhooks/webhookService'|from '../../../../webhooks/webhookService'|g" "$testfile"
    sed -i "s|from '../../mocks/discordMocks'|from '../../../../tests/mocks/discordMocks'|g" "$testfile"
    sed -i "s|from '../../helpers/replyBotHelper'|from '../../../../tests/helpers/replyBotHelper'|g" "$testfile"
    sed -i "s|from '../../../services/botStateService'|from '../../../../services/botStateService'|g" "$testfile"
    sed -i "s|from '../../../discord/userID'|from '../../../../discord/userID'|g" "$testfile"
    sed -i "s|from '../responses/${botname}.responses'|from './${botname}Model'|g" "$testfile"
  fi

  echo "Fixed imports in $testfile"
done

echo "All test import paths have been fixed."
