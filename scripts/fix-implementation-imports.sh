#!/bin/bash

# Loop through all bot directories
for botdir in */; do
  botname="${botdir%/}"
  implfile="${botdir}${botname}.ts"

  # Skip if implementation file doesn't exist
  if [ ! -f "$implfile" ]; then
    continue
  fi

  echo "Fixing imports in $implfile..."

  # Update import paths
  # 1. Replace imports from '../../../webhooks/webhookService' with '../../../../webhooks/webhookService'
  # 2. Replace imports from '../botBuilder' with '../../botBuilder'
  # 3. Replace imports from '../replyBot' with '../../replyBot'
  # 4. Replace imports from '../responses/botName.responses' with './botNameModel'
  # 5. Replace imports from '../triggers/conditions/patternCondition' with '../../triggers/conditions/patternCondition'
  # 6. Replace imports from '../triggers/conditions/patterns' with '../../triggers/conditions/patterns'
  # 7. Replace imports from '../botTypes' with '../../botTypes'
  # 8. Replace imports from '../identity/userIdentity' with '../../identity/userIdentity'
  # 9. Replace imports from '../triggers/conditions/allConditions' with '../../triggers/conditions/allConditions'
  # 10. Replace imports from '../triggers/conditions/oneCondition' with '../../triggers/conditions/oneCondition'
  # 11. Replace imports from '../triggers/conditions/randomChanceCondition' with '../../triggers/conditions/randomChanceCondition'
  # 12. Replace imports from '../triggers/userConditions' with '../../triggers/userConditions'
  # 13. Replace imports from '../../../discord/userID' with '../../../../discord/userID'
  # 14. Replace imports from '../../../services/botStateService' with '../../../../services/botStateService'

  # Use sed to perform the replacements
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version of sed requires an empty string for -i
    sed -i '' "s|from '../../../webhooks/webhookService'|from '../../../../webhooks/webhookService'|g" "$implfile"
    sed -i '' "s|from '../botBuilder'|from '../../botBuilder'|g" "$implfile"
    sed -i '' "s|from '../replyBot'|from '../../replyBot'|g" "$implfile"
    sed -i '' "s|from '../responses/${botname}.responses'|from './${botname}Model'|g" "$implfile"
    sed -i '' "s|from '../triggers/conditions/patternCondition'|from '../../triggers/conditions/patternCondition'|g" "$implfile"
    sed -i '' "s|from '../triggers/conditions/patterns'|from '../../triggers/conditions/patterns'|g" "$implfile"
    sed -i '' "s|from '../botTypes'|from '../../botTypes'|g" "$implfile"
    sed -i '' "s|from '../identity/userIdentity'|from '../../identity/userIdentity'|g" "$implfile"
    sed -i '' "s|from '../triggers/conditions/allConditions'|from '../../triggers/conditions/allConditions'|g" "$implfile"
    sed -i '' "s|from '../triggers/conditions/oneCondition'|from '../../triggers/conditions/oneCondition'|g" "$implfile"
    sed -i '' "s|from '../triggers/conditions/randomChanceCondition'|from '../../triggers/conditions/randomChanceCondition'|g" "$implfile"
    sed -i '' "s|from '../triggers/userConditions'|from '../../triggers/userConditions'|g" "$implfile"
    sed -i '' "s|from '../../../discord/userID'|from '../../../../discord/userID'|g" "$implfile"
    sed -i '' "s|from '../../../services/botStateService'|from '../../../../services/botStateService'|g" "$implfile"
  else
    # Linux version of sed
    sed -i "s|from '../../../webhooks/webhookService'|from '../../../../webhooks/webhookService'|g" "$implfile"
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
    sed -i "s|from '../../../discord/userID'|from '../../../../discord/userID'|g" "$implfile"
    sed -i "s|from '../../../services/botStateService'|from '../../../../services/botStateService'|g" "$implfile"
  fi

  echo "Fixed imports in $implfile"
done

echo "All implementation import paths have been fixed."
