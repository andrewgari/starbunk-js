## [1.24.0](https://github.com/andrewgari/starbunk-js/compare/v1.23.5...v1.24.0) (2026-01-26)

### Features

* add bot override and reset command subcommands ([02ed3d1](https://github.com/andrewgari/starbunk-js/commit/02ed3d1e5ae8c37ace45a8a7801fc1b1bad9db75))
* add comments management commands and config server for BunkBot ([61a46b2](https://github.com/andrewgari/starbunk-js/commit/61a46b2b7af538decb955deb945012d583e25d70))
* add comments management commands and config server for BunkBot ([#505](https://github.com/andrewgari/starbunk-js/issues/505)) ([a982cdc](https://github.com/andrewgari/starbunk-js/commit/a982cdc018488adc5e1c3a4ebd3947f163aac8b6))
* add frequency override storage and trigger evaluation integration ([87df3b9](https://github.com/andrewgari/starbunk-js/commit/87df3b9ae9a1ed22c5140bb8a0e95c957c199d5e))
* add observability spans to frequency override operations ([1b90509](https://github.com/andrewgari/starbunk-js/commit/1b9050980878eda6796db99c96622fe27ca832c9))
* implement BunkBot admin frequency control system (closes [#506](https://github.com/andrewgari/starbunk-js/issues/506)) ([#507](https://github.com/andrewgari/starbunk-js/issues/507)) ([fa7f1a9](https://github.com/andrewgari/starbunk-js/commit/fa7f1a9e77f0668febd90f3f70c08a3b879c1768))
* implement UserFact, SocialBattery & Interest repositories ([ef0ea6a](https://github.com/andrewgari/starbunk-js/commit/ef0ea6a666916ca951e0bb56f6d2b4539c0a6858)), closes [#524](https://github.com/andrewgari/starbunk-js/issues/524)
* Implement UserFact, SocialBattery & Interest repositories ([#531](https://github.com/andrewgari/starbunk-js/issues/531)) ([0d5439b](https://github.com/andrewgari/starbunk-js/commit/0d5439bdb45634c04e4c5e567ba8eb8d7070ba1b))
* migrate vitest configuration to ESM format and remove old config file ([4c3385e](https://github.com/andrewgari/starbunk-js/commit/4c3385e5d139d4a6613be4f08d77cc81db9fde46))
* Refactor repositories and services to use profileId instead of userId ([f8c726c](https://github.com/andrewgari/starbunk-js/commit/f8c726c8eaad9b01b06c4bccfdc3e3983280149e))
* update sync-versions script to modify package.json version with… ([#538](https://github.com/andrewgari/starbunk-js/issues/538)) ([811d966](https://github.com/andrewgari/starbunk-js/commit/811d96676c32cc607ad7e680d014237289ac0b61))
* update sync-versions script to modify package.json version without affecting lockfiles ([d7e6ee1](https://github.com/andrewgari/starbunk-js/commit/d7e6ee1bc1d86e9bb39dfce4254c71f85855c5e4))

### Bug Fixes

* Remove artifacts & fix TypeScript/CircleCI config deprecations ([1063016](https://github.com/andrewgari/starbunk-js/commit/106301628053a24f6208b7376a53afad8f062b56))
* Remove artifacts & fix TypeScript/CircleCI config deprecations ([#539](https://github.com/andrewgari/starbunk-js/issues/539)) ([16ecc5c](https://github.com/andrewgari/starbunk-js/commit/16ecc5c64fb368a9e0c294107af83cf8119dcee4))
* replace broken symlinks with actual config files ([2fad575](https://github.com/andrewgari/starbunk-js/commit/2fad575997c9a23ac3d9584011204617431636ce))
* replace broken symlinks with actual config files ([#542](https://github.com/andrewgari/starbunk-js/issues/542)) ([79c6600](https://github.com/andrewgari/starbunk-js/commit/79c660080a2f14dd945a5dfa9a3caf6290f1b45b))
* update covabot LLM test imports to use shared package ([8f97a11](https://github.com/andrewgari/starbunk-js/commit/8f97a11a7c8fe86dab702607e186756181c43140))
* update covabot LLM test imports to use shared package ([#508](https://github.com/andrewgari/starbunk-js/issues/508)) ([811d72e](https://github.com/andrewgari/starbunk-js/commit/811d72ef8491543628053a35c508c5d0ff4c1d75))
* Update module to Node16 (required for node16 moduleResolution) ([ba3b793](https://github.com/andrewgari/starbunk-js/commit/ba3b7937d74cab6627cf031da235500ccee50c04))
* Update moduleResolution to node16 (compatible with commonjs module) ([e238b75](https://github.com/andrewgari/starbunk-js/commit/e238b757a3cf112acd28724365e575ae0d3ddaa8))
* update paths in tsconfig and vitest config to use dist directory ([8f04725](https://github.com/andrewgari/starbunk-js/commit/8f047250f42c92cb2f250c85e4d701be21aa9b80))
* use shared/dist paths for container runtime ([a550aa8](https://github.com/andrewgari/starbunk-js/commit/a550aa83eb20cc3f8f3a9a4b8f77e9a05985289b))

## [1.22.0](https://github.com/andrewgari/starbunk-js/compare/v1.21.1...v1.22.0) (2026-01-22)

### Features

* Organize and expand docker-compose environment variables ([#483](https://github.com/andrewgari/starbunk-js/issues/483)) ([1af8a99](https://github.com/andrewgari/starbunk-js/commit/1af8a9949593d16362f34d59f828fd14512a304d))

## [1.21.1](https://github.com/andrewgari/starbunk-js/compare/v1.21.0...v1.21.1) (2026-01-22)

### Bug Fixes

* ensure logs reach OTEL collector and flush on shutdown ([#480](https://github.com/andrewgari/starbunk-js/issues/480)) ([a7c8ca7](https://github.com/andrewgari/starbunk-js/commit/a7c8ca77018a8b23ef10bd9f5faeecd8c9472612))

## [1.21.0](https://github.com/andrewgari/starbunk-js/compare/v1.20.0...v1.21.0) (2026-01-22)

### Features

* Add IP-based environment configuration for OTLP trace server ([#469](https://github.com/andrewgari/starbunk-js/issues/469)) ([5bffc30](https://github.com/andrewgari/starbunk-js/commit/5bffc3000ddeee0dd8501558ddd1bf6daf057311))

## [1.20.0](https://github.com/andrewgari/starbunk-js/compare/v1.19.2...v1.20.0) (2026-01-22)

### Features

* **bluebot:** Add comprehensive logging and metrics matching BunkBot ([#468](https://github.com/andrewgari/starbunk-js/issues/468)) ([9a71965](https://github.com/andrewgari/starbunk-js/commit/9a71965ad7a3fe03cf37beae6fcc7244e0bd7ad1))

## [1.19.0](https://github.com/andrewgari/starbunk-js/compare/v1.18.3...v1.19.0) (2026-01-21)

### Features

* add force-all mode for manual workflow triggers ([#462](https://github.com/andrewgari/starbunk-js/issues/462)) ([e43f3e9](https://github.com/andrewgari/starbunk-js/commit/e43f3e9171a20e74007a86d63181f41a5d759fde))

## [1.18.0](https://github.com/andrewgari/starbunk-js/compare/v1.17.0...v1.18.0) (2026-01-19)

### Features

* **covabot:** implement Cognitive Simulacrum architecture ([#457](https://github.com/andrewgari/starbunk-js/issues/457)) ([5b7fe5c](https://github.com/andrewgari/starbunk-js/commit/5b7fe5caddfca2a7ef6d3e035b9ee199c09b423a))

## [1.17.0](https://github.com/andrewgari/starbunk-js/compare/v1.16.0...v1.17.0) (2026-01-18)

### Features

* **bunkbot:** add {swap_message} placeholder for word swapping ([#456](https://github.com/andrewgari/starbunk-js/issues/456)) ([b8e2bd2](https://github.com/andrewgari/starbunk-js/commit/b8e2bd2aa85e4e439a1d828aeac9a457734022d0))

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
