# Changelog

## [v1.0.1] - 2025-07-17

### ✨ Features

#### bots

- add InterruptBot implementation and fix tests ([c2823a3](https://github.com/andrewgari/starbunk-js/commit/c2823a3e40a1929b804147879675ba53380bdf62)) by @andrewgari

#### ci

- implement core Claude AI code review integration (#242) ([0d9156a](https://github.com/andrewgari/starbunk-js/commit/0d9156aadef52d4c30685364f4fb0ac728203dbb)) by @Andrew Gari
- add advanced file-type specific prompts to Claude review (#243) ([8ed6773](https://github.com/andrewgari/starbunk-js/commit/8ed67735f3c37b2073f021bbbe87d8343ad7fe4d)) by @Andrew Gari
- add CI/CD tool integration to Claude review (#245) ([b26a51a](https://github.com/andrewgari/starbunk-js/commit/b26a51a0ed0ff81da7eb14533394a128e6c3d2ad)) by @Andrew Gari

- Complete transition from monolithic to 4-container architecture ([582e382](https://github.com/andrewgari/starbunk-js/commit/582e38290711841d12feb394ae7628c11ee1a7e4)) by @Andrew Gari
- enhance path-based conditional builds with improved precision and validation (#235) ([5bf279a](https://github.com/andrewgari/starbunk-js/commit/5bf279ad2e2eae0083db19493c380a7542beb954)) by @Andrew Gari
- add comprehensive Docker deployment infrastructure and CI/CD improvements (#252) ([80d3ca7](https://github.com/andrewgari/starbunk-js/commit/80d3ca78caa34a7eb4268f00ba2459abf9e88eae)) by @Andrew Gari
- comprehensive CI/CD pipeline optimizations with tag-based workflows (#257) ([83fcd66](https://github.com/andrewgari/starbunk-js/commit/83fcd6614b8625201b92a42d52833184a2676401)) by @Andrew Gari
#### spider-bot

- add positive response for correct hyphen usage ([a9bf3f8](https://github.com/andrewgari/starbunk-js/commit/a9bf3f8144ee47c6d12bff30fb2c968ef03af645)) by @andrewgari
- Add positive response for correct hyphen usage (#154) ([47850c1](https://github.com/andrewgari/starbunk-js/commit/47850c1e7610bff24f621dfc97cf4514848faceb)) by @Andrew Gari


### 🐛 Bug Fixes

#### discord

- update Logger import in discordGuildMemberHelper ([04f73e9](https://github.com/andrewgari/starbunk-js/commit/04f73e905b36a0dfc078bba08e2a944357d4f17d)) by @andrewgari

- removed yarn (#135) ([4b7ea80](https://github.com/andrewgari/starbunk-js/commit/4b7ea80e80edd90473910ab2d1c326009f6b8bff)) by @Andrew Gari
- service registration and test improvements ([f56eba5](https://github.com/andrewgari/starbunk-js/commit/f56eba54ecd7164bcedef34f002bd214cbd5848f)) by @andrewgari
- shell script issues ([d8db072](https://github.com/andrewgari/starbunk-js/commit/d8db072a3b95f7793b9ff8f2a9282a62790f5abf)) by @andrewgari
- remaining shell script issues ([8c0281e](https://github.com/andrewgari/starbunk-js/commit/8c0281eb5c17c47a25d3173d95234cc0e18ca120)) by @andrewgari
- final shell script cleanup ([093e71f](https://github.com/andrewgari/starbunk-js/commit/093e71f6b592c2ec93c87402b09c1ed2fec649dd)) by @andrewgari
- service registration and test improvements (#153) ([0a31eaa](https://github.com/andrewgari/starbunk-js/commit/0a31eaa8eec71eb1b074a88b3fd6b6fbf95a16f2)) by @Andrew Gari
- seemingly working ([6b84cca](https://github.com/andrewgari/starbunk-js/commit/6b84cca8cfee148b65d899ea93b41f72bf1d0166)) by @andrewgari
- openai ([343da05](https://github.com/andrewgari/starbunk-js/commit/343da0528a751712f8591140e7791812c8abe1e5)) by @andrewgari
- linted and testd ([27f23ef](https://github.com/andrewgari/starbunk-js/commit/27f23efe32200110b2c40232976d02b739c5bf74)) by @andrewgari
- lint ([a9eaa7a](https://github.com/andrewgari/starbunk-js/commit/a9eaa7a9db4541b03ac637fe6a0b978c5e1631fc)) by @andrewgari
- old scripts ([d503c83](https://github.com/andrewgari/starbunk-js/commit/d503c83d5e90e7050caa822cfa36882df01ac397)) by @andrewgari
- openai ([8fcb266](https://github.com/andrewgari/starbunk-js/commit/8fcb2661d62d49520f867f44a07bcba60bc2d769)) by @andrewgari
- openai (#158) ([bf51f49](https://github.com/andrewgari/starbunk-js/commit/bf51f49cdff735ec216c55c83f0e6dee9d0df978)) by @Andrew Gari
- openai api works now ([15c7e72](https://github.com/andrewgari/starbunk-js/commit/15c7e728f92f46ca8ba2a331c674bbe0fb37c118)) by @andrewgari
- openai api works now (#159) ([f2dead4](https://github.com/andrewgari/starbunk-js/commit/f2dead4c79c6b8e4109402c3a23c8f47813cad25)) by @Andrew Gari
- update InterruptBot logic and fix guild IDs ([4ae8fcf](https://github.com/andrewgari/starbunk-js/commit/4ae8fcfd0bc4f79663c36b7e9caa25adda087ff7)) by @andrewgari
- bluebot was searching for a shoddy list of blue words ([3af393b](https://github.com/andrewgari/starbunk-js/commit/3af393b06074a6e43e2de69e88810eeaf209da62)) by @andrewgari
- bluebot was searching for a shoddy list of blue words (#161) ([c3c922c](https://github.com/andrewgari/starbunk-js/commit/c3c922cd828e53b49d3a18a946498d6fed91757a)) by @Andrew Gari
- doesn't trigger on guy all the time. ([f5a5c1a](https://github.com/andrewgari/starbunk-js/commit/f5a5c1af6579126dee4cc2cddac2b8612a5e8bb3)) by @andrewgari
- whitespace ([835c84e](https://github.com/andrewgari/starbunk-js/commit/835c84ebbf4b9e118dc13659f35e64cb2749758d)) by @andrewgari
- commands (#175) ([b7da23a](https://github.com/andrewgari/starbunk-js/commit/b7da23a345990f7033bb29a0411d08b70980f5d6)) by @Andrew Gari
- optimize non-LLM bot performance by reducing unnecessary processing (#191) ([2e75a97](https://github.com/andrewgari/starbunk-js/commit/2e75a97178e8d9753ef093fd56bbb1cbdb30c53d)) by @Andrew Gari
- llm should skip empty messages / emotes / embedds / etc (#199) ([3cd33f4](https://github.com/andrewgari/starbunk-js/commit/3cd33f45733c7462477607ca76056d25192a808e)) by @Andrew Gari
- Personality bot empty message handling (#200) ([3a6c471](https://github.com/andrewgari/starbunk-js/commit/3a6c471726f93ca07d7042377810286e661aa250)) by @Andrew Gari
- Bots do not properly shun Ian (#211) ([19031ec](https://github.com/andrewgari/starbunk-js/commit/19031ecafe508c865a319749a93fb032c072053a)) by @Ian Murray
- Replace any types with unknown for better type safety ([e988f43](https://github.com/andrewgari/starbunk-js/commit/e988f43736af2070d947af2c8fec45108bd81fdd)) by @Andrew Gari
- github images for pr ([09fc98d](https://github.com/andrewgari/starbunk-js/commit/09fc98db75bbdf96badf23cb4275ea83bc2d3251)) by @Andrew Gari
- github images for pr ([739ef89](https://github.com/andrewgari/starbunk-js/commit/739ef89d09fa94b1a9fcb14d6347beb92c93f3d7)) by @Andrew Gari
- github images for pr ([24d693b](https://github.com/andrewgari/starbunk-js/commit/24d693bf00ed69fff3b7c89eef0a4f7ce3f866e2)) by @Andrew Gari
- github images for pr ([023cb91](https://github.com/andrewgari/starbunk-js/commit/023cb91344319296fef76ab66cd6f732b1dfd037)) by @Andrew Gari
- github images for pr ([18d55f6](https://github.com/andrewgari/starbunk-js/commit/18d55f6f17e9d6700980da5220f9db8fe30b2182)) by @Andrew Gari
- github images for pr ([69a340c](https://github.com/andrewgari/starbunk-js/commit/69a340ce124e5990c5c6b3bba8e89fddd073f718)) by @Andrew Gari
- github images for pr ([11251ff](https://github.com/andrewgari/starbunk-js/commit/11251ff9b055379d3495c84e4423d05e15ee9e81)) by @Andrew Gari
- github images for pr ([5823beb](https://github.com/andrewgari/starbunk-js/commit/5823beb31432f0e517305fd1ed34bd0d975ec070)) by @Andrew Gari
- github images for pr ([131a0c9](https://github.com/andrewgari/starbunk-js/commit/131a0c9a61f4dc297733ff1152b2149a202d232e)) by @Andrew Gari
#### tests

- fix TypeScript errors in test files ([74e2ba6](https://github.com/andrewgari/starbunk-js/commit/74e2ba675549bb9cc68050eb1896942244af2fd3)) by @andrewgari
- fix TypeScript errors in test files ([bfdf8d8](https://github.com/andrewgari/starbunk-js/commit/bfdf8d8279d944af50eff9faa4ff7e0f8612d8e1)) by @andrewgari
- i fixed the rest of the tests ([b206399](https://github.com/andrewgari/starbunk-js/commit/b206399ab638e6d8b53c7ff97240a7af7ba131a6)) by @andrewgari


### 📚 Documentation

- cursor rules and old scripts ([76691a3](https://github.com/andrewgari/starbunk-js/commit/76691a3fbe9350af538729088882c9d4c0a69302)) by @andrewgari

### 🔧 Maintenance

- replybot ([4b04f45](https://github.com/andrewgari/starbunk-js/commit/4b04f45f926964021e3669820417f11cf565722f)) by @andrewgari

### 📦 Other Changes

- fixed type checl ([2398b97](https://github.com/andrewgari/starbunk-js/commit/2398b9758c95f690e9527f2b471324c69b304cde)) by @andrewgari
- Add dependency injection system (#136) ([bc18751](https://github.com/andrewgari/starbunk-js/commit/bc187518340fd6eb68e6b7714b2f2cb457e5ffd1)) by @Andrew Gari
- Refactor/response objects (#137) ([e5cb6df](https://github.com/andrewgari/starbunk-js/commit/e5cb6df6cff61296eeced8be3680e1dd2edf8fcb)) by @Andrew Gari
- Fix/start (#138) ([3deabae](https://github.com/andrewgari/starbunk-js/commit/3deabae1ea8b551c818ddd4d3014f78877abac8a)) by @Andrew Gari
- fixed it (#139) ([50412e4](https://github.com/andrewgari/starbunk-js/commit/50412e4283ec32d6463f0239b8c21f6226c11737)) by @Andrew Gari
- Fix/gha (#140) ([65092a5](https://github.com/andrewgari/starbunk-js/commit/65092a5866a0c2940dc0e7ab176a3278ab3e7f3a)) by @Andrew Gari
- Fix/gha (#141) ([fea2939](https://github.com/andrewgari/starbunk-js/commit/fea2939e499647a5fda3857615b25ceb7e9d7e21)) by @Andrew Gari
- Fix/housekeeping (#147) ([fbd2a5c](https://github.com/andrewgari/starbunk-js/commit/fbd2a5cc68f06323f9c8a9a92c276961052763f0)) by @Andrew Gari
- Add ffmpeg to Docker container for music bot (#148) ([f113b98](https://github.com/andrewgari/starbunk-js/commit/f113b98f914849a00ae4bbcd2d9d9ec52a257508)) by @Andrew Gari
- fixed ([5e76c27](https://github.com/andrewgari/starbunk-js/commit/5e76c27785af6deb2386a9232b3e26121ad50812)) by @andrewgari
- Reduce logging noise and implement granular log levels ([7468b75](https://github.com/andrewgari/starbunk-js/commit/7468b75fc747f6472112dd2641f72b7a4ab7d892)) by @andrewgari
- Feature/debug (#152) ([e5390af](https://github.com/andrewgari/starbunk-js/commit/e5390af79813940172e158da7359119c260c5d43)) by @Andrew Gari
- reply-bots updated ([363c333](https://github.com/andrewgari/starbunk-js/commit/363c3338c17a98e7bed7cd9f18a9ce912df2d5b5)) by @andrewgari
- refactor/replybot (#155) ([cfd4284](https://github.com/andrewgari/starbunk-js/commit/cfd4284dc912bd4d78635a09a2a4d801dd65e6f5)) by @Andrew Gari
- Merge branch 'main' into feature/spider-bot-positive-response ([0733cfe](https://github.com/andrewgari/starbunk-js/commit/0733cfec088caa330d1f4e428a0f47bdf938af06)) by @andrewgari
- Fix/spiderbot broken (#157) ([3402d20](https://github.com/andrewgari/starbunk-js/commit/3402d206ba9b9ca27a37c26a7b54d2b76256594e)) by @Andrew Gari
- Merge branch 'main' into fix/bluebot-openai ([9b4a1ad](https://github.com/andrewgari/starbunk-js/commit/9b4a1ad3b40015ae85cd4dc663c64f8da091148c)) by @Andrew Gari
- Add InterruptBot implementation (#160) ([b9c0340](https://github.com/andrewgari/starbunk-js/commit/b9c03404a118970a7470f2d7c582066ed3661093)) by @Andrew Gari
- Fix/guy bot (#162) ([2a74e28](https://github.com/andrewgari/starbunk-js/commit/2a74e2815f4b396a7312695feab44d34292e7955)) by @Andrew Gari
- Add HomonymBot with optimized implementation and common homonym pairs ([adbbae9](https://github.com/andrewgari/starbunk-js/commit/adbbae98c790ae09149a6bbd2da22e66d1c7be85)) by @andrewgari
- Add HomonymBot with optimized implementation (#164) ([a630b6c](https://github.com/andrewgari/starbunk-js/commit/a630b6c2680d41ae2a80c9f417733078a48c7cce)) by @Andrew Gari
- Consolidate LLM prompt system and fix linter errors (#163) ([3c6c50c](https://github.com/andrewgari/starbunk-js/commit/3c6c50c5e346e9a6d85be77a69b5d3f1c8d8f72b)) by @Andrew Gari
- fixed the url ([b23679e](https://github.com/andrewgari/starbunk-js/commit/b23679e1a0ac1d948556d2254256ee33846b540f)) by @andrewgari
- gave homonymbot a name ([e646e6a](https://github.com/andrewgari/starbunk-js/commit/e646e6a3f3e1ac3f24b7fe80b10536a454787e5a)) by @andrewgari
- Discord service improvements (#169) ([dd6ce1a](https://github.com/andrewgari/starbunk-js/commit/dd6ce1a448e64356d54b04780231c5605673c95d)) by @Andrew Gari
- fix/bot loading issues (#170) ([e31ee1b](https://github.com/andrewgari/starbunk-js/commit/e31ee1b95971f1b88c581857fb41cc5a4ac6dc0e)) by @Andrew Gari
- Feature/covabot personality update (#171) ([e6e50ed](https://github.com/andrewgari/starbunk-js/commit/e6e50ed9b3ab487942288737537dc990c5daac45)) by @Andrew Gari
- Enhances bot response logic and debugging ([a8916d0](https://github.com/andrewgari/starbunk-js/commit/a8916d09ffed96123957a995da1ae88da988fb06)) by @andrewgari
- Enhances bot response logic and debugging (#172) ([af35734](https://github.com/andrewgari/starbunk-js/commit/af35734cf5cdc1c843766372749ef0fd12e6dc9c)) by @Andrew Gari
- Merge branch 'main' of github.com:andrewgari/starbunk-js ([be47926](https://github.com/andrewgari/starbunk-js/commit/be479262ea7bdaa565b4ca20da08727f6ff4b5de)) by @andrewgari
- Refactors environment handling and removes unused scripts (#173) ([5fa30c4](https://github.com/andrewgari/starbunk-js/commit/5fa30c4fb305428843de08a4ab42d7ace288e468)) by @Andrew Gari
- Fix covabot2 (#174) ([75e2859](https://github.com/andrewgari/starbunk-js/commit/75e28590baf3274056f26808d739868caee72e52)) by @Andrew Gari
- Enhances bot performance and logging (#176) ([ef0d92b](https://github.com/andrewgari/starbunk-js/commit/ef0d92b5c9b4a0f8745bde22af46223127e70838)) by @Andrew Gari
- Simplifies message handling logic (#177) ([3fb4269](https://github.com/andrewgari/starbunk-js/commit/3fb42697e3772b1d0708e3f4caa314052b1e251e)) by @Andrew Gari
- Adds probability checks to HomonymBot responses (#179) ([72a43df](https://github.com/andrewgari/starbunk-js/commit/72a43dfd9b01fac36ea62cca09b3fb2722963716)) by @Andrew Gari
- Enhancement/tuning new bots (#180) ([b7719d4](https://github.com/andrewgari/starbunk-js/commit/b7719d42524a3973fee75727e18681e707fa697a)) by @Andrew Gari
- Feature/bot manager tests (#181) ([07fc72d](https://github.com/andrewgari/starbunk-js/commit/07fc72dd849621e9decd4bf40fad0a2eba4c84ad)) by @Andrew Gari
- Fix/bot identity issues (#182) ([24cc143](https://github.com/andrewgari/starbunk-js/commit/24cc1437d61b8ea19087e77cd9bbb98bf9f59451)) by @Andrew Gari
- Refactor/strategy pattern (#184) ([7241516](https://github.com/andrewgari/starbunk-js/commit/7241516133181d42c03809231f23743565498b9c)) by @Andrew Gari
- Fixed Docker Build ([a5115f8](https://github.com/andrewgari/starbunk-js/commit/a5115f83a6f45f6a60fcc88af0d9c4c3b19febc0)) by @andrewgari
- Fix missing WebhookService registration (#186) ([5648913](https://github.com/andrewgari/starbunk-js/commit/56489130eb735031ed7c6c267bbac579fcc65de8)) by @Andrew Gari
- Fix duplicate mock warning by removing empty globalMocks.ts file ([9cad8b7](https://github.com/andrewgari/starbunk-js/commit/9cad8b728c52678956de7b771a97e49741e58e19)) by @andrewgari
- Fix duplicate mock warning by removing empty globalMocks.ts file (#188) ([c80c4e4](https://github.com/andrewgari/starbunk-js/commit/c80c4e4b52b823185206fdfb274ba00568674f21)) by @Andrew Gari
- Merge branch 'main' of github.com:andrewgari/starbunk-js ([a082604](https://github.com/andrewgari/starbunk-js/commit/a08260478ac8f0e117dbef6c09848a345cb91e0a)) by @andrewgari
- Add TTRPG bot requirements document (#187) ([29d4bf8](https://github.com/andrewgari/starbunk-js/commit/29d4bf8a5b8ea44c8cdb146e5d482a895f696d9c)) by @Andrew Gari
- Fix/bots broke (#192) ([8664e40](https://github.com/andrewgari/starbunk-js/commit/8664e402de7b4c0b85e8b80c9e4008495e6edf41)) by @Andrew Gari
- Refactor/some more cache issues (#193) ([f86598a](https://github.com/andrewgari/starbunk-js/commit/f86598a4f9c627e9ff307c463c337cddd6c2438d)) by @Andrew Gari
- Enhance logger functionality by adding dynamic log level control and optimizing log methods for conditional logging. Remove unnecessary GatewayIntentBits from SnowbunkClient and StarbunkClient for improved performance. ([ebf7457](https://github.com/andrewgari/starbunk-js/commit/ebf74571425535e0be53b881c8215f0606fe1ad4)) by @andrewgari
- Enhance logging in client initialization by adding debug statements for token presence in Starbunk and Snowbunk clients. Update StarbunkClient to extend from DiscordClient for improved structure. ([93a96fe](https://github.com/andrewgari/starbunk-js/commit/93a96feec0ac22afe5c93938c00722aa4d2fc51e)) by @andrewgari
- Refactor client initialization in SnowbunkClient and StarbunkClient to use IntentsBitField for better intent management. Add GuildWebhooks intent for enhanced functionality. ([122b6fc](https://github.com/andrewgari/starbunk-js/commit/122b6fc5e050f9607c3eb7f93ad6c7ac135bc48a)) by @andrewgari
- Enhance README with detailed project overview, key features, and comm… (#195) ([965cee2](https://github.com/andrewgari/starbunk-js/commit/965cee201a420ef61d1b87e6d4b0a8e1b7e08532)) by @Andrew Gari
- Refactor/some bb stuff (#196) ([c2d0945](https://github.com/andrewgari/starbunk-js/commit/c2d0945f2970cb11e8c49f61c3ee6b10e75b73c4)) by @Andrew Gari
- Fix  docker (#197) ([e5f1bc7](https://github.com/andrewgari/starbunk-js/commit/e5f1bc7cdf5bae02a8981fc42ce6f30a639d702b)) by @Andrew Gari
- Update Docker configuration and refactor CovaBot initialization (#198) ([cc0ff07](https://github.com/andrewgari/starbunk-js/commit/cc0ff07b152e879e948a5c8c7a13087d850b2341)) by @Andrew Gari
- Fix  frequency is broken (#202) ([d991af6](https://github.com/andrewgari/starbunk-js/commit/d991af6e42f42f1b0bfe779734a4d9878ce4dc01)) by @Andrew Gari
- Refactor/di services (#203) ([e5f2a13](https://github.com/andrewgari/starbunk-js/commit/e5f2a13a3782b45928202f9a8b500f8876519c30)) by @Andrew Gari
- Refactor services and update configurations for enhanced testability (#204) ([24a47ee](https://github.com/andrewgari/starbunk-js/commit/24a47ee2c3ff83db079ba56b8e8525429cd1df49)) by @Andrew Gari
- [Snyk] Upgrade openai from 4.87.3 to 4.89.0 (#207) ([78f25e3](https://github.com/andrewgari/starbunk-js/commit/78f25e3069be500b1697f93cb5fdfbd218a98e8c)) by @Andrew Gari
- [Snyk] Upgrade @distube/ytdl-core from 4.16.4 to 4.16.5 (#208) ([6bfb57c](https://github.com/andrewgari/starbunk-js/commit/6bfb57c614afef1bb6f303cf2d097d9eaaffae12)) by @Andrew Gari
- [Snyk] Upgrade @distube/ytdl-core from 4.16.5 to 4.16.6 (#210) ([1c0cebb](https://github.com/andrewgari/starbunk-js/commit/1c0cebbd9e1abdd2dcf6f75f9ad9053b33ffa14b)) by @Andrew Gari
- [Snyk] Upgrade openai from 4.89.0 to 4.90.0 (#209) ([7bae028](https://github.com/andrewgari/starbunk-js/commit/7bae02894c49b42a14e4a61375d7c34c9785a8c0)) by @Andrew Gari
- [Snyk] Upgrade dotenv from 16.4.7 to 16.5.0 (#218) ([282976c](https://github.com/andrewgari/starbunk-js/commit/282976ccc1c2a5fde0109924f8da12ecfdc0b593)) by @Andrew Gari
- [Snyk] Upgrade openai from 4.90.0 to 4.93.0 (#216) ([eccd1e0](https://github.com/andrewgari/starbunk-js/commit/eccd1e0bc76250f191ddfb000055d37e93374a82)) by @Andrew Gari
- [Snyk] Upgrade @distube/ytdl-core from 4.16.6 to 4.16.8 (#217) ([9b6be7f](https://github.com/andrewgari/starbunk-js/commit/9b6be7fcc716b533d22ef5626bfb6b023deb8660)) by @Andrew Gari
- [Snyk] Upgrade discord-api-types from 0.37.119 to 0.37.120 (#215) ([6777fe5](https://github.com/andrewgari/starbunk-js/commit/6777fe50184ddd815ea7e9955a69471ca65ed3c1)) by @Andrew Gari
- Migrate static IDs to DB, add per-guild blacklist, update reply-bots,… (#213) ([5b54fc4](https://github.com/andrewgari/starbunk-js/commit/5b54fc40dae360dc55759f2d26a2932a72c53588)) by @Andrew Gari
- Refactor bot message handling to skip by default (#221) ([a1aa06d](https://github.com/andrewgari/starbunk-js/commit/a1aa06de3aa8931d4ba05ab78e2d8802c6c22a3a)) by @Andrew Gari
- [Snyk] Upgrade discord-api-types from 0.37.120 to 0.38.1 (#222) ([212a858](https://github.com/andrewgari/starbunk-js/commit/212a85848215299a2a2adf42badff9e648d4791b)) by @Andrew Gari
- [Snyk] Upgrade zod from 3.24.2 to 3.24.3 (#220) ([f2f2581](https://github.com/andrewgari/starbunk-js/commit/f2f258161a8e064a3af7614cc42e6dfe98849843)) by @Andrew Gari
- [Snyk] Upgrade openai from 4.93.0 to 4.95.1 (#219) ([23fd5a7](https://github.com/andrewgari/starbunk-js/commit/23fd5a7d407b4c01e882fb2f52c3efe500ce34ab)) by @Andrew Gari
- [Snyk] Security upgrade @distube/ytdl-core from 4.16.8 to 4.16.10 (#223) ([c3386e3](https://github.com/andrewgari/starbunk-js/commit/c3386e32dcebd816fc852c045d192781f47a56bf)) by @Andrew Gari
- [Snyk] Upgrade @discordjs/rest from 2.4.3 to 2.5.0 (#228) ([06e7bc9](https://github.com/andrewgari/starbunk-js/commit/06e7bc996390ec7a791cf278ca689716bbe057df)) by @Andrew Gari
- [Snyk] Upgrade discord-api-types from 0.38.1 to 0.38.2 (#227) ([924cb7e](https://github.com/andrewgari/starbunk-js/commit/924cb7edefbec0a1b8f562d4ac19bdbf49ccd995)) by @Andrew Gari
- Fix CI/CD: Update ESLint config and fix unused variable warnings ([d6221fa](https://github.com/andrewgari/starbunk-js/commit/d6221fa18090e1a646f46c8deb6225d5c1f17b5d)) by @Andrew Gari
- Fix Docker commands: Update from docker-compose to docker compose ([dfa6657](https://github.com/andrewgari/starbunk-js/commit/dfa66577262ed946c3e53e809cb14983aad07b7f)) by @Andrew Gari
- Add CI-friendly check script without Docker requirement ([a92cb6b](https://github.com/andrewgari/starbunk-js/commit/a92cb6b93df93a70bf9ed9f37074c138d74a94f6)) by @Andrew Gari
- Fix CI/CD: Install container dependencies before type checking ([c23bf0b](https://github.com/andrewgari/starbunk-js/commit/c23bf0beba325987d9aeac051bc7336e6e2dea3e)) by @Andrew Gari
- Clean up CI/CD workflows and update .gitignore ([d9286cc](https://github.com/andrewgari/starbunk-js/commit/d9286cc21502bb50b40a37007d48614d57bf80db)) by @Andrew Gari
- Implement path-based conditional CI/CD execution ([2cd72bd](https://github.com/andrewgari/starbunk-js/commit/2cd72bd7eed2ac72402f02ad917b06c83e4d1251)) by @Andrew Gari
- Fix path-based CI/CD issues ([31ea8eb](https://github.com/andrewgari/starbunk-js/commit/31ea8eb7c4f6a0df016624bb1959c8d7f847e670)) by @Andrew Gari
- Fix JSON formatting in GitHub Actions matrix generation ([aa24b23](https://github.com/andrewgari/starbunk-js/commit/aa24b238a80327a20b78a789605dedae74459014)) by @Andrew Gari
- Fix Docker builds: Properly link shared package in all containers ([8f6b101](https://github.com/andrewgari/starbunk-js/commit/8f6b1013169b93f9803a3e3a32a5031c617cc042)) by @Andrew Gari
- Fix CI/CD pipeline and resolve dependency issues ([d66559b](https://github.com/andrewgari/starbunk-js/commit/d66559bf5d6f8f43a88777ab25e4e4cba68e23e5)) by @Andrew Gari
- Temporarily disable container tests to allow CI/CD pipeline push ([5f14671](https://github.com/andrewgari/starbunk-js/commit/5f14671d965f495c4acc1eed966db727ad76fc65)) by @Andrew Gari
- Temporarily disable container tests in CI/CD to fix pipeline ([19a02fe](https://github.com/andrewgari/starbunk-js/commit/19a02fe59cbd4eaa7f683b9096ceaf645546f862)) by @Andrew Gari
- Major progress on container architecture - CI/CD pipeline now functional ([6498e0c](https://github.com/andrewgari/starbunk-js/commit/6498e0cd2109ec059561520a17c1be89f5976587)) by @Andrew Gari
- Add Docker Compose variants and update PR snapshot naming strategy ([cf52248](https://github.com/andrewgari/starbunk-js/commit/cf52248203b234f687314ca40a1e42a23679ffb1)) by @Andrew Gari
- Revert "Add Docker Compose variants and update PR snapshot naming strategy" ([039d4f5](https://github.com/andrewgari/starbunk-js/commit/039d4f545bda7ccc40760104d9e5663e057d53a1)) by @Andrew Gari
- Container Architecture Transition with Simplified Docker Image Naming (#234) ([e2355f2](https://github.com/andrewgari/starbunk-js/commit/e2355f228488de40c7c7099efd33e05496690806)) by @Andrew Gari
- Refactor DJCova Discord client architecture to eliminate custom wrapper (#236) ([a7b90ce](https://github.com/andrewgari/starbunk-js/commit/a7b90ce6ab008ff03a2c4613bb90a5ec9a65a289)) by @Andrew Gari
- Add Claude Code GitHub Workflow (#237) ([17e10f2](https://github.com/andrewgari/starbunk-js/commit/17e10f2c6d0c1579c750a373406f8290c25fb03e)) by @Andrew Gari
- Cicd update (#239) ([213dc07](https://github.com/andrewgari/starbunk-js/commit/213dc075f32be43dea0add9f129723d142df63f0)) by @Andrew Gari
- remove obsolete GitHub Actions workflows and fix YAML syntax (#253) ([b17e056](https://github.com/andrewgari/starbunk-js/commit/b17e056ba9b98c581bb93e6ddd1856363f0ebb54)) by @Andrew Gari

### 📊 Statistics

- **Total commits**: 144
- **Contributors**: 3
- **Files changed**: 0

### 👥 Contributors

- @andrewgari
- @Andrew Gari
- @Ian Murray

