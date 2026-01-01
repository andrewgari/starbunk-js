/**
 * GHCR Cleanup Utilities
 * 
 * Utility functions for managing GitHub Container Registry (GHCR) image lifecycle.
 * This module provides helper functions for the PR cleanup workflow.
 */

let github;
let context;
let config;

/**
 * Initialize the utilities with GitHub API client, context, and configuration
 * 
 * @param {Object} githubClient - GitHub API client from actions/github-script
 * @param {Object} actionContext - GitHub Actions context
 * @param {Object} cleanupConfig - Configuration loaded from ghcr-cleanup-config.yml
 */
async function initialize(githubClient, actionContext, cleanupConfig) {
    github = githubClient;
    context = actionContext;
    config = cleanupConfig;
    
    console.log('✅ GHCR cleanup utilities initialized');
    console.log(`   Repository: ${context.repo.owner}/${context.repo.repo}`);
    console.log(`   Event: ${context.eventName}`);
}

/**
 * Get the GitHub API client
 * @returns {Object} GitHub API client
 */
function getGitHub() {
    return github;
}

/**
 * Get the GitHub Actions context
 * @returns {Object} GitHub Actions context
 */
function getContext() {
    return context;
}

/**
 * Get the cleanup configuration
 * @returns {Object} Cleanup configuration
 */
function getConfig() {
    return config;
}

module.exports = {
    initialize,
    getGitHub,
    getContext,
    getConfig
};

