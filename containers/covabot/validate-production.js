#!/usr/bin/env node

/**
 * Production Validation Script for CovaBot Memory Management
 * This script validates that all components are production-ready
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 CovaBot Production Validation\n');

const checks = [];
let passed = 0;
let failed = 0;

function addCheck(name, fn) {
  checks.push({ name, fn });
}

function pass(message) {
  console.log(`✅ ${message}`);
  passed++;
}

function fail(message) {
  console.log(`❌ ${message}`);
  failed++;
}

function warn(message) {
  console.log(`⚠️  ${message}`);
}

// File existence checks
addCheck('Required files exist', () => {
  const requiredFiles = [
    'src/web/server.ts',
    'src/web/static/index.html',
    'src/web/static/app.js',
    'src/web/static/styles.css',
    'src/web/middleware/auth.ts',
    'src/services/personalityNotesService.ts',
    'src/services/personalityNotesServiceDb.ts',
    'src/services/botConfigurationService.ts',
    'Dockerfile',
    'package.json',
    'DEPLOYMENT.md',
    '.env.production.example'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      pass(`File exists: ${file}`);
    } else {
      fail(`Missing file: ${file}`);
    }
  }
});

// Package.json validation
addCheck('Package.json configuration', () => {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (pkg.scripts['start:web']) {
      pass('Web start script configured');
    } else {
      fail('Missing start:web script');
    }

    if (pkg.scripts['dev:web']) {
      pass('Web dev script configured');
    } else {
      fail('Missing dev:web script');
    }

    if (pkg.scripts['test:web']) {
      pass('Web test script configured');
    } else {
      fail('Missing test:web script');
    }

    const requiredDeps = ['express', 'cors', '@prisma/client'];
    for (const dep of requiredDeps) {
      if (pkg.dependencies[dep]) {
        pass(`Dependency present: ${dep}`);
      } else {
        fail(`Missing dependency: ${dep}`);
      }
    }

  } catch (error) {
    fail(`Error reading package.json: ${error.message}`);
  }
});

// Dockerfile validation
addCheck('Dockerfile configuration', () => {
  try {
    const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
    
    if (dockerfile.includes('EXPOSE 7080')) {
      pass('Correct port exposed in Dockerfile');
    } else {
      fail('Dockerfile should expose port 7080');
    }

    if (dockerfile.includes('index-web.js')) {
      pass('Dockerfile uses web entry point');
    } else {
      fail('Dockerfile should use index-web.js entry point');
    }

  } catch (error) {
    fail(`Error reading Dockerfile: ${error.message}`);
  }
});

// TypeScript compilation
addCheck('TypeScript compilation', () => {
  try {
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'pipe' });
    pass('TypeScript compilation successful');
  } catch (error) {
    fail('TypeScript compilation failed');
  }
});

// Web interface structure
addCheck('Web interface structure', () => {
  try {
    const html = fs.readFileSync('src/web/static/index.html', 'utf8');
    
    if (html.includes('CovaBot')) {
      pass('HTML contains CovaBot branding');
    } else {
      fail('HTML missing CovaBot branding');
    }

    if (html.includes('dashboard-tab')) {
      pass('Dashboard tab present');
    } else {
      fail('Dashboard tab missing');
    }

    if (html.includes('notes-tab')) {
      pass('Notes management tab present');
    } else {
      fail('Notes management tab missing');
    }

    const js = fs.readFileSync('src/web/static/app.js', 'utf8');
    if (js.includes('class CovaBot')) {
      pass('JavaScript class structure present');
    } else {
      fail('JavaScript class structure missing');
    }

  } catch (error) {
    fail(`Error reading web interface files: ${error.message}`);
  }
});

// Environment configuration
addCheck('Environment configuration', () => {
  if (fs.existsSync('.env.production.example')) {
    const envExample = fs.readFileSync('.env.production.example', 'utf8');
    
    const requiredVars = [
      'STARBUNK_TOKEN',
      'COVABOT_API_KEY',
      'USE_DATABASE',
      'DATABASE_URL',
      'NODE_ENV'
    ];

    for (const envVar of requiredVars) {
      if (envExample.includes(envVar)) {
        pass(`Environment variable documented: ${envVar}`);
      } else {
        fail(`Environment variable missing from example: ${envVar}`);
      }
    }
  } else {
    fail('Missing .env.production.example file');
  }
});

// Database schema validation
addCheck('Database schema', () => {
  try {
    const schemaPath = '../../prisma/schema.prisma';
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      if (schema.includes('model PersonalityNote')) {
        pass('PersonalityNote model present in schema');
      } else {
        fail('PersonalityNote model missing from schema');
      }
    } else {
      warn('Prisma schema not found (may be in different location)');
    }
  } catch (error) {
    warn(`Could not validate database schema: ${error.message}`);
  }
});

// Security checks
addCheck('Security configuration', () => {
  try {
    const authFile = fs.readFileSync('src/web/middleware/auth.ts', 'utf8');
    
    if (authFile.includes('apiKeyAuth')) {
      pass('API key authentication implemented');
    } else {
      fail('API key authentication missing');
    }

    if (authFile.includes('rateLimit')) {
      pass('Rate limiting implemented');
    } else {
      fail('Rate limiting missing');
    }

    if (authFile.includes('requestLogger')) {
      pass('Request logging implemented');
    } else {
      fail('Request logging missing');
    }

  } catch (error) {
    fail(`Error reading auth middleware: ${error.message}`);
  }
});

// Documentation checks
addCheck('Documentation', () => {
  const docs = ['README.md', 'DEPLOYMENT.md'];
  
  for (const doc of docs) {
    if (fs.existsSync(doc)) {
      pass(`Documentation present: ${doc}`);
    } else {
      fail(`Documentation missing: ${doc}`);
    }
  }
});

// Run all checks
async function runValidation() {
  console.log('Running validation checks...\n');
  
  for (const check of checks) {
    console.log(`\n📋 ${check.name}`);
    try {
      await check.fn();
    } catch (error) {
      fail(`Check failed with error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL CHECKS PASSED! CovaBot is production-ready!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Configure .env file');
    console.log('   2. Set up database (if using USE_DATABASE=true)');
    console.log('   3. Deploy with Docker Compose');
    console.log('   4. Access web interface at http://localhost:7080');
    return true;
  } else {
    console.log('\n⚠️  Some checks failed. Please address the issues above.');
    return false;
  }
}

// Run validation
runValidation().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Validation script failed:', error);
  process.exit(1);
});
