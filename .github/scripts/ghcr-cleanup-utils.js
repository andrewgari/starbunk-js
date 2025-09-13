/**
 * GHCR Cleanup Utilities
 *
 * Comprehensive utilities library for GitHub Container Registry (GHCR) image lifecycle management.
 * Provides production-ready functions with safety mechanisms, intelligent retention policies,
 * and detailed logging for container image cleanup operations.
 */

let github;
let context;
let config;
let logger;

/**
 * Initialize the utilities with GitHub API and configuration
 */
async function initialize(githubApi, contextObj, configObj) {
  github = githubApi;
  context = contextObj;
  config = configObj;

  // Simple logger
  logger = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    warn: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    debug: (msg) => {
      if (config.advanced?.debug_logging) {
        console.log(`🔍 DEBUG: ${msg}`);
      }
    }
  };

  logger.info('GHCR cleanup utilities initialized');
}

/**
 * Get list of open PR numbers to protect their images
 */
async function getOpenPRNumbers() {
  logger.debug('Fetching open PR numbers');

  try {
    const { data: openPRs } = await github.rest.pulls.list({
      owner: context.repo.owner,
      repo: context.repo.repo,
      state: 'open',
      per_page: 100
    });

    const prNumbers = new Set(openPRs.map(pr => pr.number));
    logger.info(`Found ${prNumbers.size} open PRs: ${Array.from(prNumbers).join(', ') || 'none'}`);

    return prNumbers;
  } catch (error) {
    logger.error(`Failed to fetch open PRs: ${error.message}`);
    return new Set(); // Return empty set on error to be safe
  }
}

/**
 * Check if an image should be preserved based on configuration
 */
function shouldPreserveImage(version, containerConfig, openPRNumbers) {
  const tags = version.metadata?.container?.tags || [];
  const createdAt = new Date(version.created_at);
  const now = new Date();

  // Age-based protection
  const minAgeHours = config.safety?.min_age_hours || 2;
  const minAge = minAgeHours * 60 * 60 * 1000;

  if (now - createdAt < minAge) {
    return { preserve: true, reason: `too recent (< ${minAgeHours}h)` };
  }

  // Check protected tags
  if (containerConfig?.preserve_tags) {
    for (const protectedTag of containerConfig.preserve_tags) {
      if (tags.includes(protectedTag)) {
        return { preserve: true, reason: `protected tag: ${protectedTag}` };
      }
    }
  }

  // Check protected patterns
  if (containerConfig?.preserve_patterns) {
    for (const pattern of containerConfig.preserve_patterns) {
      const regex = new RegExp(pattern);
      for (const tag of tags) {
        if (regex.test(tag)) {
          return { preserve: true, reason: `matches pattern: ${pattern}` };
        }
      }
    }
  }

  // Check global exclusions
  if (config.advanced?.global_exclusions) {
    for (const exclusion of config.advanced.global_exclusions) {
      const regex = new RegExp(exclusion.replace(/\*/g, '.*'));
      for (const tag of tags) {
        if (regex.test(tag)) {
          return { preserve: true, reason: `global exclusion: ${exclusion}` };
        }
      }
    }
  }

  // Check if this is a PR image for an open PR
  const prTags = tags.filter(tag => tag.startsWith('pr-'));
  if (prTags.length > 0) {
    for (const prTag of prTags) {
      const match = prTag.match(/pr-(\d+)/);
      if (match) {
        const prNumber = parseInt(match[1]);
        if (openPRNumbers.has(prNumber)) {
          return { preserve: true, reason: `open PR #${prNumber}` };
        }
      }
    }
  }

  return { preserve: false, reason: null };
}

/**
 * Get all versions for a container with detailed analysis
 */
async function analyzeContainer(containerName) {
  logger.info(`Analyzing container: ${containerName}`);

  try {
    const { data: versions } = await github.rest.packages.getAllPackageVersionsForPackageOwnedByUser({
      package_type: 'container',
      package_name: containerName,
      username: context.repo.owner,
      per_page: 100
    });

    logger.info(`Found ${versions.length} versions for ${containerName}`);

    // Categorize versions
    const analysis = {
      total: versions.length,
      prImages: [],
      untaggedImages: [],
      oldImages: [],
      protectedImages: [],
      versions: versions
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    versions.forEach(version => {
      const tags = version.metadata?.container?.tags || [];
      const createdAt = new Date(version.created_at);

      if (tags.some(tag => tag.startsWith('pr-'))) {
        analysis.prImages.push(version);
      }

      if (tags.length === 0) {
        analysis.untaggedImages.push(version);
      }

      if (createdAt < cutoffDate) {
        analysis.oldImages.push(version);
      }
    });

    logger.debug(`Container ${containerName} analysis: ${analysis.prImages.length} PR images, ${analysis.untaggedImages.length} untagged, ${analysis.oldImages.length} old images`);

    return analysis;
  } catch (error) {
    logger.error(`Failed to analyze container ${containerName}: ${error.message}`);
    throw error;
  }
}

/**
 * Clean up PR images for a specific container
 */
async function cleanupContainerPRImages(containerName, options = {}) {
  const { dryRun = true, maxDeletions = 50 } = options;

  logger.info(`${dryRun ? 'DRY RUN - ' : ''}Cleaning PR images for ${containerName}`);

  const containerConfig = config.containers?.find(c => c.name === containerName);
  if (!containerConfig?.enabled) {
    logger.warn(`Container ${containerName} is disabled in configuration`);
    return { processed: 0, deleted: 0, errors: [], skipped: [] };
  }

  const openPRNumbers = await getOpenPRNumbers();
  const analysis = await analyzeContainer(containerName);

  const results = {
    processed: 0,
    deleted: 0,
    errors: [],
    skipped: [],
    container: containerName
  };

  // Sort PR images by creation date (oldest first)
  const prImages = analysis.prImages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Keep most recent PR images based on configuration
  const retentionCount = containerConfig.pr_retention_count || 10;
  const retentionDays = containerConfig.pr_retention_days || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  let deletionCount = 0;

  for (const version of prImages) {
    if (deletionCount >= maxDeletions) {
      logger.warn(`Reached maximum deletions limit (${maxDeletions}) for ${containerName}`);
      break;
    }

    results.processed++;

    const tags = version.metadata?.container?.tags || [];
    const createdAt = new Date(version.created_at);
    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));

    // Check if should preserve
    const preserveCheck = shouldPreserveImage(version, containerConfig, openPRNumbers);
    if (preserveCheck.preserve) {
      results.skipped.push({
        id: version.id,
        tags: tags,
        reason: preserveCheck.reason,
        ageInDays
      });
      logger.debug(`Skipping version ${version.id} (${tags.join(', ')}): ${preserveCheck.reason}`);
      continue;
    }

    // Apply retention policies
    const recentPRImages = prImages.slice(-retentionCount);
    const isInRecentSet = recentPRImages.find(v => v.id === version.id);

    if (isInRecentSet && createdAt >= cutoffDate) {
      results.skipped.push({
        id: version.id,
        tags: tags,
        reason: `within retention policy (${retentionCount} recent images, ${retentionDays} days)`,
        ageInDays
      });
      continue;
    }

    // This version should be deleted
    if (dryRun) {
      logger.info(`[DRY RUN] Would delete: ${version.id} (${tags.join(', ') || 'untagged'}) - ${ageInDays} days old`);
    } else {
      try {
        await github.rest.packages.deletePackageVersionForUser({
          package_type: 'container',
          package_name: containerName,
          username: context.repo.owner,
          package_version_id: version.id
        });

        results.deleted++;
        deletionCount++;
        logger.info(`Deleted: ${version.id} (${tags.join(', ') || 'untagged'}) - ${ageInDays} days old`);

        // Rate limiting
        if (config.advanced?.api_delay_ms) {
          await new Promise(resolve => setTimeout(resolve, config.advanced.api_delay_ms));
        }
      } catch (error) {
        results.errors.push({
          id: version.id,
          tags: tags,
          error: error.message
        });
        logger.error(`Failed to delete version ${version.id}: ${error.message}`);
      }
    }
  }

  logger.info(`${containerName}: ${results.processed} processed, ${results.deleted} deleted, ${results.errors.length} errors`);
  return results;
}

/**
 * Clean up untagged images for a specific container
 */
async function cleanupContainerUntaggedImages(containerName, options = {}) {
  const { dryRun = true, maxDeletions = 50 } = options;

  logger.info(`${dryRun ? 'DRY RUN - ' : ''}Cleaning untagged images for ${containerName}`);

  const containerConfig = config.containers?.find(c => c.name === containerName);
  if (!containerConfig?.enabled) {
    logger.warn(`Container ${containerName} is disabled in configuration`);
    return { processed: 0, deleted: 0, errors: [] };
  }

  const analysis = await analyzeContainer(containerName);
  const results = { processed: 0, deleted: 0, errors: [], container: containerName };

  let deletionCount = 0;

  for (const version of analysis.untaggedImages) {
    if (deletionCount >= maxDeletions) {
      logger.warn(`Reached maximum deletions limit (${maxDeletions}) for ${containerName}`);
      break;
    }

    results.processed++;

    const createdAt = new Date(version.created_at);
    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));

    // Check minimum age
    const minAgeHours = config.safety?.min_age_hours || 2;
    if (Date.now() - createdAt.getTime() < minAgeHours * 60 * 60 * 1000) {
      logger.debug(`Skipping recent untagged image ${version.id} (${ageInDays} days old)`);
      continue;
    }

    if (dryRun) {
      logger.info(`[DRY RUN] Would delete untagged: ${version.id} - ${ageInDays} days old`);
    } else {
      try {
        await github.rest.packages.deletePackageVersionForUser({
          package_type: 'container',
          package_name: containerName,
          username: context.repo.owner,
          package_version_id: version.id
        });

        results.deleted++;
        deletionCount++;
        logger.info(`Deleted untagged: ${version.id} - ${ageInDays} days old`);

        // Rate limiting
        if (config.advanced?.api_delay_ms) {
          await new Promise(resolve => setTimeout(resolve, config.advanced.api_delay_ms));
        }
      } catch (error) {
        results.errors.push({
          id: version.id,
          error: error.message
        });
        logger.error(`Failed to delete untagged version ${version.id}: ${error.message}`);
      }
    }
  }

  logger.info(`${containerName}: ${results.processed} untagged processed, ${results.deleted} deleted, ${results.errors.length} errors`);
  return results;
}

/**
 * Main cleanup function for PR images across all containers
 */
async function cleanupPRImages(options = {}) {
  const { dryRun = true, maxDeletions = 50, forceOperation = false } = options;

  logger.info(`${dryRun ? 'DRY RUN - ' : ''}Starting PR images cleanup`);

  // Check emergency stop
  if (config.advanced?.emergency_stop) {
    throw new Error('Emergency stop is active - all cleanup operations disabled');
  }

  const containers = config.containers?.filter(c => c.enabled) || [];
  const results = {
    totalProcessed: 0,
    totalDeleted: 0,
    totalErrors: 0,
    containerResults: []
  };

  for (const containerConfig of containers) {
    try {
      const containerResult = await cleanupContainerPRImages(containerConfig.name, {
        dryRun,
        maxDeletions: Math.floor(maxDeletions / containers.length) // Distribute limit across containers
      });

      results.containerResults.push(containerResult);
      results.totalProcessed += containerResult.processed;
      results.totalDeleted += containerResult.deleted;
      results.totalErrors += containerResult.errors.length;

    } catch (error) {
      logger.error(`Failed to cleanup PR images for ${containerConfig.name}: ${error.message}`);
      results.totalErrors++;
      results.containerResults.push({
        container: containerConfig.name,
        processed: 0,
        deleted: 0,
        errors: [{ error: error.message }]
      });
    }
  }

  logger.info(`PR cleanup complete: ${results.totalProcessed} processed, ${results.totalDeleted} deleted, ${results.totalErrors} errors`);
  return results;
}

/**
 * Full cleanup including PR images, untagged images, and old images
 */
async function fullCleanup(options = {}) {
  const { dryRun = true, maxDeletions = 50 } = options;

  logger.info(`${dryRun ? 'DRY RUN - ' : ''}Starting full registry cleanup`);

  const results = {
    prCleanup: null,
    untaggedCleanup: null,
    totalDeleted: 0,
    totalErrors: 0
  };

  // Clean PR images first
  try {
    results.prCleanup = await cleanupPRImages({
      dryRun,
      maxDeletions: Math.floor(maxDeletions * 0.7) // 70% of limit for PR cleanup
    });
    results.totalDeleted += results.prCleanup.totalDeleted;
    results.totalErrors += results.prCleanup.totalErrors;
  } catch (error) {
    logger.error(`PR cleanup failed: ${error.message}`);
    results.totalErrors++;
  }

  // Clean untagged images
  try {
    const containers = config.containers?.filter(c => c.enabled) || [];
    const untaggedResults = [];

    for (const containerConfig of containers) {
      const containerResult = await cleanupContainerUntaggedImages(containerConfig.name, {
        dryRun,
        maxDeletions: Math.floor(maxDeletions * 0.3 / containers.length) // 30% of limit for untagged
      });
      untaggedResults.push(containerResult);
      results.totalDeleted += containerResult.deleted;
      results.totalErrors += containerResult.errors.length;
    }

    results.untaggedCleanup = untaggedResults;
  } catch (error) {
    logger.error(`Untagged cleanup failed: ${error.message}`);
    results.totalErrors++;
  }

  logger.info(`Full cleanup complete: ${results.totalDeleted} total deleted, ${results.totalErrors} total errors`);
  return results;
}

/**
 * Emergency cleanup with extended limits and reduced safety checks
 */
async function emergencyCleanup(options = {}) {
  const { dryRun = true, maxDeletions = 200 } = options;

  logger.warn(`${dryRun ? 'DRY RUN - ' : ''}EMERGENCY CLEANUP INITIATED`);
  logger.warn('Using extended limits and reduced safety checks');

  // Temporarily reduce minimum age for emergency cleanup
  const originalMinAge = config.safety?.min_age_hours || 2;
  if (config.safety) {
    config.safety.min_age_hours = Math.min(originalMinAge, 1); // Reduce to 1 hour minimum
  }

  try {
    const results = await fullCleanup({ dryRun, maxDeletions });
    results.emergency = true;

    logger.warn(`Emergency cleanup complete: ${results.totalDeleted} deleted, ${results.totalErrors} errors`);
    return results;
  } finally {
    // Restore original safety settings
    if (config.safety) {
      config.safety.min_age_hours = originalMinAge;
    }
  }
}

/**
 * Generate health report for the registry
 */
async function generateHealthReport() {
  logger.info('Generating GHCR health report');

  const containers = config.containers?.filter(c => c.enabled) || [];
  const report = {
    timestamp: new Date().toISOString(),
    totalContainers: containers.length,
    containerAnalysis: [],
    totalImages: 0,
    totalPRImages: 0,
    totalUntaggedImages: 0,
    recommendations: [],
    warnings: []
  };

  for (const containerConfig of containers) {
    try {
      const analysis = await analyzeContainer(containerConfig.name);

      const containerReport = {
        name: containerConfig.name,
        totalImages: analysis.total,
        prImages: analysis.prImages.length,
        untaggedImages: analysis.untaggedImages.length,
        oldImages: analysis.oldImages.length
      };

      report.containerAnalysis.push(containerReport);
      report.totalImages += analysis.total;
      report.totalPRImages += analysis.prImages.length;
      report.totalUntaggedImages += analysis.untaggedImages.length;

      // Generate recommendations
      if (analysis.prImages.length > (containerConfig.pr_retention_count || 10) * 2) {
        report.recommendations.push(`Container ${containerConfig.name}: Consider more frequent PR cleanup (${analysis.prImages.length} PR images)`);
      }

      if (analysis.untaggedImages.length > 10) {
        report.warnings.push(`Container ${containerConfig.name}: ${analysis.untaggedImages.length} untagged images found`);
      }

    } catch (error) {
      logger.error(`Failed to analyze container ${containerConfig.name}: ${error.message}`);
      report.warnings.push(`Failed to analyze container ${containerConfig.name}: ${error.message}`);
    }
  }

  logger.info(`Health report generated: ${report.totalImages} total images across ${report.totalContainers} containers`);
  return report;
}

/**
 * Validate current configuration
 */
async function validateConfiguration() {
  logger.info('Validating GHCR cleanup configuration');

  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    recommendations: []
  };

  // Check basic structure
  if (!config.containers || !Array.isArray(config.containers)) {
    validation.errors.push('Configuration must include containers array');
    validation.valid = false;
  }

  if (config.containers) {
    // Check each container configuration
    config.containers.forEach((container, index) => {
      if (!container.name) {
        validation.errors.push(`Container at index ${index} missing name`);
        validation.valid = false;
      }

      if (typeof container.enabled !== 'boolean') {
        validation.warnings.push(`Container ${container.name || index}: enabled should be boolean`);
      }

      if (container.pr_retention_count && container.pr_retention_count < 3) {
        validation.warnings.push(`Container ${container.name}: pr_retention_count is very low (${container.pr_retention_count})`);
      }
    });
  }

  // Check safety configuration
  if (config.safety) {
    if (config.safety.min_images_to_preserve < 3) {
      validation.recommendations.push('Consider setting min_images_to_preserve to at least 3 for safety');
    }

    if (config.safety.max_deletions_per_run > 100) {
      validation.warnings.push('max_deletions_per_run is quite high - consider reducing to limit potential damage');
    }
  }

  logger.info(`Configuration validation complete: ${validation.valid ? 'VALID' : 'INVALID'}, ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
  return validation;
}

/**
 * Generate a formatted summary of cleanup results
 */
function generateSummary(results, operationType) {
  const lines = [];

  lines.push(`# GHCR ${operationType.toUpperCase()} Summary`);
  lines.push(`**Timestamp:** ${new Date().toISOString()}`);
  lines.push('');

  if (results.emergency) {
    lines.push('🚨 **EMERGENCY CLEANUP PERFORMED**');
    lines.push('');
  }

  if (results.totalDeleted !== undefined) {
    lines.push(`**Total Images Processed:** ${results.totalProcessed || 'unknown'}`);
    lines.push(`**Total Images Deleted:** ${results.totalDeleted}`);
    lines.push(`**Total Errors:** ${results.totalErrors || 0}`);
  }

  if (results.containerResults) {
    lines.push('');
    lines.push('## Container Results');
    results.containerResults.forEach(container => {
      lines.push(`- **${container.container}**: ${container.deleted} deleted, ${container.errors?.length || 0} errors`);
    });
  }

  if (results.prCleanup) {
    lines.push('');
    lines.push('## PR Images Cleanup');
    lines.push(`- Processed: ${results.prCleanup.totalProcessed}`);
    lines.push(`- Deleted: ${results.prCleanup.totalDeleted}`);
    lines.push(`- Errors: ${results.prCleanup.totalErrors}`);
  }

  if (results.untaggedCleanup) {
    lines.push('');
    lines.push('## Untagged Images Cleanup');
    const totalUntagged = results.untaggedCleanup.reduce((sum, c) => sum + c.deleted, 0);
    lines.push(`- Total Untagged Deleted: ${totalUntagged}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*Generated by GHCR Lifecycle Management System*');

  return lines.join('\n');
}

/**
 * Format health report for display
 */
function formatHealthReport(healthReport, validationResults) {
  const lines = [];

  lines.push('# GHCR Health Report');
  lines.push(`**Generated:** ${healthReport.timestamp}`);
  lines.push('');

  lines.push('## Overview');
  lines.push(`- **Total Containers:** ${healthReport.totalContainers}`);
  lines.push(`- **Total Images:** ${healthReport.totalImages}`);
  lines.push(`- **PR Images:** ${healthReport.totalPRImages}`);
  lines.push(`- **Untagged Images:** ${healthReport.totalUntaggedImages}`);
  lines.push('');

  if (healthReport.containerAnalysis.length > 0) {
    lines.push('## Container Analysis');
    healthReport.containerAnalysis.forEach(container => {
      lines.push(`### ${container.name}`);
      lines.push(`- Total Images: ${container.totalImages}`);
      lines.push(`- PR Images: ${container.prImages}`);
      lines.push(`- Untagged Images: ${container.untaggedImages}`);
      lines.push(`- Old Images: ${container.oldImages}`);
      lines.push('');
    });
  }

  if (healthReport.warnings.length > 0) {
    lines.push('## ⚠️ Warnings');
    healthReport.warnings.forEach(warning => {
      lines.push(`- ${warning}`);
    });
    lines.push('');
  }

  if (healthReport.recommendations.length > 0) {
    lines.push('## 💡 Recommendations');
    healthReport.recommendations.forEach(rec => {
      lines.push(`- ${rec}`);
    });
    lines.push('');
  }

  if (validationResults) {
    lines.push('## Configuration Validation');
    lines.push(`**Status:** ${validationResults.valid ? '✅ Valid' : '❌ Invalid'}`);

    if (validationResults.errors.length > 0) {
      lines.push('### Errors');
      validationResults.errors.forEach(error => {
        lines.push(`- ${error}`);
      });
    }

    if (validationResults.warnings.length > 0) {
      lines.push('### Warnings');
      validationResults.warnings.forEach(warning => {
        lines.push(`- ${warning}`);
      });
    }

    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by GHCR Health Monitoring System*');

  return lines.join('\n');
}

// Export functions for use in GitHub Actions
module.exports = {
  initialize,
  cleanupPRImages,
  fullCleanup,
  emergencyCleanup,
  generateHealthReport,
  validateConfiguration,
  generateSummary,
  formatHealthReport,
  // Internal functions exposed for testing
  _internal: {
    getOpenPRNumbers,
    shouldPreserveImage,
    analyzeContainer,
    cleanupContainerPRImages,
    cleanupContainerUntaggedImages
  }
};