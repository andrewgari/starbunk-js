#!/bin/bash

# This script fixes all import issues in reply-bot test files

echo "Fixing all imports in reply-bot test files..."

# Loop through all bot directories
for botdir in */; do
  botname="${botdir%/}"
  testfile="${botdir}${botname}.test.ts"

  # Skip if test file doesn't exist
  if [ ! -f "$testfile" ]; then
    echo "Skipping $botname (no test file found)"
    continue
  fi

  echo "Fixing imports in $testfile..."

  # Fix imports from @/tests/helpers/replyBotTestHelper to @/tests/mocks/discordMocks
  sed -i "s|@/tests/helpers/replyBotTestHelper|@/tests/mocks/discordMocks|g" "$testfile"

  # Fix relative imports
  sed -i "s|from '../../../starbunk/bots/reply-bots/${botname}'|from './${botname}'|g" "$testfile"
  sed -i "s|from '../../../../../../../starbunk/bots/reply-bots/${botname}'|from './${botname}'|g" "$testfile"
  sed -i "s|from '../../../starbunk/bots/replyBot'|from '../../replyBot'|g" "$testfile"
  sed -i "s|from '../../../webhooks/webhookService'|from '@/webhooks/webhookService'|g" "$testfile"
  sed -i "s|from '../../mocks/discordMocks'|from '@/tests/mocks/discordMocks'|g" "$testfile"
  sed -i "s|from '../../helpers/replyBotHelper'|from '@/tests/helpers/replyBotHelper'|g" "$testfile"
  sed -i "s|from '../../../services/botStateService'|from '@/services/botStateService'|g" "$testfile"
  sed -i "s|from '../../../discord/userID'|from '@/discord/userID'|g" "$testfile"
  sed -i "s|from '../../../utils/random'|from '@/utils/random'|g" "$testfile"

  # Fix trigger conditions imports
  sed -i "s|from '../../../starbunk/bots/triggers/conditions/patternCondition'|from '../../triggers/conditions/patternCondition'|g" "$testfile"
  sed -i "s|from '../../../starbunk/bots/triggers/conditions/oneCondition'|from '../../triggers/conditions/oneCondition'|g" "$testfile"
  sed -i "s|from '../../../starbunk/bots/triggers/conditions/userCondition'|from '../../triggers/conditions/userCondition'|g" "$testfile"
  sed -i "s|from '../../../starbunk/bots/triggers/conditions/allConditions'|from '../../triggers/conditions/allConditions'|g" "$testfile"

  echo "Fixed imports in $testfile"

  # Also fix the implementation file if it exists
  implfile="${botdir}${botname}.ts"
  if [ -f "$implfile" ]; then
    echo "Fixing imports in $implfile..."

    # Fix implementation imports
    sed -i "s|from '../../../webhooks/webhookService'|from '@/webhooks/webhookService'|g" "$implfile"
    sed -i "s|from '../botBuilder'|from '../../botBuilder'|g" "$implfile"
    sed -i "s|from '../replyBot'|from '../../replyBot'|g" "$implfile"
    sed -i "s|from '../responses/${botname}.responses'|from './${botname}Model'|g" "$implfile"
    sed -i "s|from '../triggers/conditions/patternCondition'|from '../../triggers/conditions/patternCondition'|g" "$implfile"
    sed -i "s|from '../triggers/conditions/patterns'|from '../../triggers/conditions/patterns'|g" "$implfile"
    sed -i "s|from '../botTypes'|from '../../botTypes'|g" "$implfile"
    sed -i "s|from '../identity/userIdentity'|from '../../identity/userIdentity'|g" "$implfile"
    sed -i "s|from '../triggers/conditions/allConditions'|from '../../triggers/conditions/allConditions'|g" "$implfile"
    sed -i "s|from '../triggers/conditions/oneCondition'|from '../../triggers/conditions/oneCondition'|g" "$implfile"
    sed -i "s|from '../triggers/conditions/randomChanceCondition'|from '../../triggers/conditions/randomChanceCondition'|g" "$implfile"
    sed -i "s|from '../triggers/userConditions'|from '../../triggers/userConditions'|g" "$implfile"
    sed -i "s|from '../../../discord/userID'|from '@/discord/userID'|g" "$implfile"
    sed -i "s|from '../../../services/botStateService'|from '@/services/botStateService'|g" "$implfile"

    echo "Fixed imports in $implfile"
  fi

  # Check for response files that need to be renamed
  responsefile="${botdir}${botname}.responses.ts"
  modelfile="${botdir}${botname}Model.ts"

  if [ -f "$responsefile" ] && [ ! -f "$modelfile" ]; then
    echo "Renaming $responsefile to $modelfile..."
    mv "$responsefile" "$modelfile"
    echo "Renamed response file"
  fi
done

echo "All imports have been fixed."
