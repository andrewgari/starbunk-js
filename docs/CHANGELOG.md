## [1.7.0](https://github.com/andrewgari/starbunk-js/compare/v1.6.0...v1.7.0) (2026-01-05)

### Features

* add container health and smoke check action; refactor workflows to utilize it ([#405](https://github.com/andrewgari/starbunk-js/issues/405)) ([729d206](https://github.com/andrewgari/starbunk-js/commit/729d20645caee664aae9a7e7ee32646240676d71))

## [1.6.0](https://github.com/andrewgari/starbunk-js/compare/v1.5.1...v1.6.0) (2026-01-05)

### Features

* **covabot:** use heuristic shouldRespond without LLM gating ([#401](https://github.com/andrewgari/starbunk-js/issues/401)) ([96018a5](https://github.com/andrewgari/starbunk-js/commit/96018a500890a08e15713977059af8c358ac5913))

## [1.5.1](https://github.com/andrewgari/starbunk-js/compare/v1.5.0...v1.5.1) (2026-01-04)

### Bug Fixes

* enhance logging configuration for DJCova service ([#399](https://github.com/andrewgari/starbunk-js/issues/399)) ([d667d78](https://github.com/andrewgari/starbunk-js/commit/d667d78d3adec917e999aae366816c9e5c58f4e2))

## [1.5.0](https://github.com/andrewgari/starbunk-js/compare/v1.4.2...v1.5.0) (2026-01-04)

### Features

* add manual container builder workflow ([#363](https://github.com/andrewgari/starbunk-js/issues/363)) ([a052c6a](https://github.com/andrewgari/starbunk-js/commit/a052c6ad0cd0b4cefe3e9c7240bcaefd23feebe0))

### Bug Fixes

* add release.config.cjs to allowed files in root directory compliance check ([#394](https://github.com/andrewgari/starbunk-js/issues/394)) ([b19cee6](https://github.com/andrewgari/starbunk-js/commit/b19cee6bbe9bb19f9253e6ddc1a7a01c5d796931))
* Always build bunkbot, covabot, djcova on main merge ([#374](https://github.com/andrewgari/starbunk-js/issues/374)) ([248705c](https://github.com/andrewgari/starbunk-js/commit/248705c584e5a89cca1a85e8c8770dc7c9f9c6d2))
* **ci:** align main validation Node setup with PR workflow ([#372](https://github.com/andrewgari/starbunk-js/issues/372)) ([5e610be](https://github.com/andrewgari/starbunk-js/commit/5e610be75678191d0ceb70772e0720083964f710))
* **ci:** enforce PR version validation and tagging semantics ([#370](https://github.com/andrewgari/starbunk-js/issues/370)) ([111bd24](https://github.com/andrewgari/starbunk-js/commit/111bd249724b6c65239a5cde010924a08642511c))
* disable automatic releases and add prod tag to manual deployments ([#362](https://github.com/andrewgari/starbunk-js/issues/362)) ([b85203a](https://github.com/andrewgari/starbunk-js/commit/b85203abfa1b7ed31ae2c41c9dcde2ea6c7edeef))
* disable Husky during semantic-release execution ([71c36ef](https://github.com/andrewgari/starbunk-js/commit/71c36efef3d9da5cf702afebe1eab68dc39da33d))
* remove code quality checks from pre-commit hook ([#396](https://github.com/andrewgari/starbunk-js/issues/396)) ([e20bef9](https://github.com/andrewgari/starbunk-js/commit/e20bef9c34ba29ef4d69999997eaab888a68f3c7))
* update allowed files in root directory compliance check ([#389](https://github.com/andrewgari/starbunk-js/issues/389)) ([6328650](https://github.com/andrewgari/starbunk-js/commit/63286503a4ce3f60c6d253af8626a08ae4a7d3bb))
* update changelog file path and assets for semantic-release ([#393](https://github.com/andrewgari/starbunk-js/issues/393)) ([02103a9](https://github.com/andrewgari/starbunk-js/commit/02103a9f9c3981115a8b32ad4d26c1edea85930d))
* update Node version in CI workflow to meet semantic-release requirements ([#391](https://github.com/andrewgari/starbunk-js/issues/391)) ([5ecff8a](https://github.com/andrewgari/starbunk-js/commit/5ecff8a66e83298627a16af67d65bcae817e48fb))
