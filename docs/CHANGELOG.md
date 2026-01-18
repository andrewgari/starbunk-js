## [1.16.0](https://github.com/andrewgari/starbunk-js/compare/v1.15.2...v1.16.0) (2026-01-18)

### Features

* Add '/live' endpoint for health check in smoke mode ([#455](https://github.com/andrewgari/starbunk-js/issues/455)) ([723de50](https://github.com/andrewgari/starbunk-js/commit/723de500e89dd6ae7edc46adaa88dde1cbd68179))

## [1.15.2](https://github.com/andrewgari/starbunk-js/compare/v1.15.1...v1.15.2) (2026-01-18)

### Bug Fixes

* Allow dist/ folders in Docker build context for CI builds ([#454](https://github.com/andrewgari/starbunk-js/issues/454)) ([0946fe2](https://github.com/andrewgari/starbunk-js/commit/0946fe28025e46f3b87d3fc65b4d32fb794e2748))

## [1.15.0](https://github.com/andrewgari/starbunk-js/compare/v1.14.0...v1.15.0) (2026-01-18)

### Features

* Add dynamic character repetition placeholder for bot responses ([#453](https://github.com/andrewgari/starbunk-js/issues/453)) ([e95383c](https://github.com/andrewgari/starbunk-js/commit/e95383c9612206aeee2b434a8c131c900df602f0))

## [1.14.0](https://github.com/andrewgari/starbunk-js/compare/v1.13.0...v1.14.0) (2026-01-17)

### Features

* standardize config directories for all containers ([#446](https://github.com/andrewgari/starbunk-js/issues/446)) ([e69f9a8](https://github.com/andrewgari/starbunk-js/commit/e69f9a8ecd56bc20d2f2049a3c3b0c2c53e28923))

## [1.13.0](https://github.com/andrewgari/starbunk-js/compare/v1.12.0...v1.13.0) (2026-01-17)

### Features

* **logging:** integrate LogLayer with BlueBot and shared observabili… ([#445](https://github.com/andrewgari/starbunk-js/issues/445)) ([902fff1](https://github.com/andrewgari/starbunk-js/commit/902fff11f8b1821ef84ba14b444246e055870a53))

## [1.12.0](https://github.com/andrewgari/starbunk-js/compare/v1.11.0...v1.12.0) (2026-01-17)

### Features

* Refactor music command tests to use service-based architecture ([#443](https://github.com/andrewgari/starbunk-js/issues/443)) ([40721b1](https://github.com/andrewgari/starbunk-js/commit/40721b11d90588348f968ef3db43078ad45f3c31))

## [1.11.0](https://github.com/andrewgari/starbunk-js/compare/v1.10.1...v1.11.0) (2026-01-15)

### Features

* **bunkbot:** implement core bot functionality and command handling ([#440](https://github.com/andrewgari/starbunk-js/issues/440)) ([06f0b0b](https://github.com/andrewgari/starbunk-js/commit/06f0b0b0c958214bd102219f9b88cfc7ca8ea03e))

## [1.10.1](https://github.com/andrewgari/starbunk-js/compare/v1.10.0...v1.10.1) (2026-01-11)

### Bug Fixes

* disable command deployment for BunkBot and update CLIENT_ID environment variable references in Docker configurations ([6fc2fc0](https://github.com/andrewgari/starbunk-js/commit/6fc2fc02badf223fb04b3d325a79c6df867bcd78))

## [1.10.0](https://github.com/andrewgari/starbunk-js/compare/v1.9.9...v1.10.0) (2026-01-10)

### Features

* remove starbunk-dnd app and all references ([#427](https://github.com/andrewgari/starbunk-js/issues/427)) ([1d690bc](https://github.com/andrewgari/starbunk-js/commit/1d690bceedf02f2fc089a7cad224c9304beb5cb4))

## [1.9.9](https://github.com/andrewgari/starbunk-js/compare/v1.9.8...v1.9.9) (2026-01-10)

### Bug Fixes

* Docker health checks and async observability initialization ([#426](https://github.com/andrewgari/starbunk-js/issues/426)) ([e158954](https://github.com/andrewgari/starbunk-js/commit/e15895400010f48f82250cd03ae0f177d13438b6))

## [1.9.8](https://github.com/andrewgari/starbunk-js/compare/v1.9.7...v1.9.8) (2026-01-10)

### Bug Fixes

* update pre-commit script to reference correct VERSION file path and simplify djcova image reference in docker-compose.yml ([#425](https://github.com/andrewgari/starbunk-js/issues/425)) ([57fcb28](https://github.com/andrewgari/starbunk-js/commit/57fcb28cff07559ed33286b791eaf5a780f3b0ad))

## [1.9.7](https://github.com/andrewgari/starbunk-js/compare/v1.9.6...v1.9.7) (2026-01-09)

### Bug Fixes

* **ci:** convert docker-compose.yml from symlink to regular file ([e750d07](https://github.com/andrewgari/starbunk-js/commit/e750d079686070dcc0079e5d577d0299cf4a9716))
* increase memory limits and Node.js options for improved performance ([9eb606c](https://github.com/andrewgari/starbunk-js/commit/9eb606cddbe6049711718d4fc48f148661b81164))
* remove obsolete docker-compose.yml file ([f820b36](https://github.com/andrewgari/starbunk-js/commit/f820b360caca40d9da206538e6334fc1288635c4))
* replace broken symlink with physical file ([384be4e](https://github.com/andrewgari/starbunk-js/commit/384be4e29219b631dd7d70b6cfe76ebb81d081bc))

## [1.9.6](https://github.com/andrewgari/starbunk-js/compare/v1.9.5...v1.9.6) (2026-01-09)

### Bug Fixes

* **djcova:** register commands to guilds instead of globally ([#421](https://github.com/andrewgari/starbunk-js/issues/421)) ([8286e90](https://github.com/andrewgari/starbunk-js/commit/8286e905c814304123e68cf467543e135259c620))

## [1.9.5](https://github.com/andrewgari/starbunk-js/compare/v1.9.4...v1.9.5) (2026-01-07)

### Bug Fixes

* Resolve command loading path issue in Docker containers ([#420](https://github.com/andrewgari/starbunk-js/issues/420)) ([e590a1f](https://github.com/andrewgari/starbunk-js/commit/e590a1facc6e5295664f452a683716642b3d9ac7))

## [1.9.4](https://github.com/andrewgari/starbunk-js/compare/v1.9.3...v1.9.4) (2026-01-07)

### Bug Fixes

* Resolve CovaBot and DJCova container boot loops ([#419](https://github.com/andrewgari/starbunk-js/issues/419)) ([fde30bd](https://github.com/andrewgari/starbunk-js/commit/fde30bd617f9a33539a49f88919a6fefeebf933a))

## [1.9.3](https://github.com/andrewgari/starbunk-js/compare/v1.9.2...v1.9.3) (2026-01-06)

### Bug Fixes

* Add checkout step to validation jobs for local action access ([#409](https://github.com/andrewgari/starbunk-js/issues/409)) ([5adc40a](https://github.com/andrewgari/starbunk-js/commit/5adc40a6b5cc20468d59d0aa375eb390fdb24d06))

## [1.9.2](https://github.com/andrewgari/starbunk-js/compare/v1.9.1...v1.9.2) (2026-01-06)

### Bug Fixes

* Remove ANSI escape sequence from GitHub Actions workflow ([#408](https://github.com/andrewgari/starbunk-js/issues/408)) ([9c718ac](https://github.com/andrewgari/starbunk-js/commit/9c718acf393043635a8c4529f569c4945e2c8bc2))

### Reverts

* Revert "chore(release): v1.9.1 [skip ci]" ([c55d965](https://github.com/andrewgari/starbunk-js/commit/c55d9650095bcc7e713ebdaf5a7aa60706f2a04f))

## [1.9.0](https://github.com/andrewgari/starbunk-js/compare/v1.8.0...v1.9.0) (2026-01-06)

### Features

* **bluebot:** Migrate from PostgreSQL to Redis for user configuration ([#407](https://github.com/andrewgari/starbunk-js/issues/407)) ([9f5affb](https://github.com/andrewgari/starbunk-js/commit/9f5affba74e59416ca31f4bc88d2b8d2e1e2870f))

## [1.8.0](https://github.com/andrewgari/starbunk-js/compare/v1.7.0...v1.8.0) (2026-01-06)

### Features

* **covabot:** improve logging and loosen response heuristics ([#406](https://github.com/andrewgari/starbunk-js/issues/406)) ([f86f114](https://github.com/andrewgari/starbunk-js/commit/f86f11440d44db99c60abc0bb9afdc3655518ce8))

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
