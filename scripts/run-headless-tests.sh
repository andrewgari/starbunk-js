#!/bin/bash

# Run tests with minimal browser overhead
export CYPRESS_FORCE_MINIMAL_BROWSER=true
export CYPRESS_BROWSER_ARGS="--disable-gpu --no-sandbox --disable-dev-shm-usage --disable-extensions --disable-software-rasterizer --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-breakpad --disable-component-extensions-with-background-pages --disable-features=TranslateUI,BlinkGenPropertyTrees,ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls --disable-ipc-flooding-protection --disable-renderer-backgrounding --enable-features=NetworkService,NetworkServiceInProcess --mute-audio --no-default-browser-check --no-first-run --disable-default-apps --metrics-recording-only"

npx cypress run --headless --config video=false,screenshotOnRunFailure=false,numTestsKeptInMemory=0,experimentalMemoryManagement=true,defaultCommandTimeout=3000,requestTimeout=3000,responseTimeout=5000,pageLoadTimeout=5000,testIsolation=false "$@"
