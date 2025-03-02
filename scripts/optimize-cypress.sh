#!/bin/bash

# Script to optimize Cypress for better performance

echo "Optimizing Cypress for better performance..."

# Ensure Cypress is installed
echo "Ensuring Cypress is installed..."
npx cypress install

# Clear Cypress cache
echo "Clearing Cypress cache..."
npx cypress cache clear

# Create optimized Cypress configuration
echo "Creating optimized Cypress environment configuration..."
cat > cypress.env.json << EOF
{
  "numTestsKeptInMemory": 0,
  "experimentalMemoryManagement": true,
  "experimentalInteractiveRunEvents": true,
  "defaultCommandTimeout": 3000,
  "requestTimeout": 3000,
  "responseTimeout": 5000,
  "pageLoadTimeout": 5000,
  "testIsolation": false,
  "experimentalCspAllowList": true,
  "experimentalSkipDomainInjection": ["*"],
  "chromeWebSecurity": false,
  "experimentalSourceRewriting": false,
  "experimentalSessionAndOrigin": true,
  "experimentalSingleTabRunMode": true
}
EOF

# Create a .babelrc file to optimize transpilation
echo "Creating optimized Babel configuration..."
cat > .babelrc << EOF
{
  "presets": [
    ["@babel/preset-env", {
      "targets": {
        "node": "current"
      }
    }],
    "@babel/preset-typescript"
  ],
  "plugins": [
    "@babel/plugin-transform-runtime"
  ]
}
EOF

# Create a .browserslistrc file to optimize browser targeting
echo "Creating optimized browserslist configuration..."
cat > .browserslistrc << EOF
last 1 chrome version
last 1 firefox version
EOF

# Update package.json with optimized test scripts
echo "Updating package.json with optimized test scripts..."
if command -v jq >/dev/null 2>&1; then
  # Use jq if available
  jq '.scripts["test:e2e:fast"] = "cypress run --config video=false,screenshotOnRunFailure=false,numTestsKeptInMemory=0,experimentalMemoryManagement=true,defaultCommandTimeout=3000,requestTimeout=3000,responseTimeout=5000,pageLoadTimeout=5000,testIsolation=false"' package.json > package.json.tmp && mv package.json.tmp package.json
  jq '.scripts["test:e2e:parallel:fast"] = "./scripts/run-parallel-tests.sh"' package.json > package.json.tmp && mv package.json.tmp package.json
else
  echo "jq not found, skipping package.json update. Please add the following scripts manually:"
  echo '  "test:e2e:fast": "cypress run --config video=false,screenshotOnRunFailure=false,numTestsKeptInMemory=0,experimentalMemoryManagement=true,defaultCommandTimeout=3000,requestTimeout=3000,responseTimeout=5000,pageLoadTimeout=5000,testIsolation=false"'
  echo '  "test:e2e:parallel:fast": "./scripts/run-parallel-tests.sh"'
fi

# Create a script to run tests with minimal browser overhead
echo "Creating script to run tests with minimal browser overhead..."
cat > scripts/run-headless-tests.sh << EOF
#!/bin/bash

# Run tests with minimal browser overhead
export CYPRESS_FORCE_MINIMAL_BROWSER=true
export CYPRESS_BROWSER_ARGS="--disable-gpu --no-sandbox --disable-dev-shm-usage --disable-extensions --disable-software-rasterizer --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-breakpad --disable-component-extensions-with-background-pages --disable-features=TranslateUI,BlinkGenPropertyTrees,ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls --disable-ipc-flooding-protection --disable-renderer-backgrounding --enable-features=NetworkService,NetworkServiceInProcess --mute-audio --no-default-browser-check --no-first-run --disable-default-apps --metrics-recording-only"

npx cypress run --headless --config video=false,screenshotOnRunFailure=false,numTestsKeptInMemory=0,experimentalMemoryManagement=true,defaultCommandTimeout=3000,requestTimeout=3000,responseTimeout=5000,pageLoadTimeout=5000,testIsolation=false "\$@"
EOF
chmod +x scripts/run-headless-tests.sh

echo "Cypress optimization complete!"
echo "Run your tests with 'npm run test:e2e:parallel:fast' for maximum performance."
echo "For even faster execution, use './scripts/run-headless-tests.sh' with specific test specs."
