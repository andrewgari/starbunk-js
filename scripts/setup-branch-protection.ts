import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function setupBranchProtection() {
  await octokit.repos.updateBranchProtection({
    owner: 'andrewgari',
    repo: 'starbunk-js',
    branch: 'main',
    required_status_checks: {
      strict: true,
      contexts: ['lint', 'test', 'build-docker']
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true
    },
    restrictions: null
  });
}

setupBranchProtection().catch(console.error); 