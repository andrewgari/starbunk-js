module.exports = {
  branches: [
    "main",
  ],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          {
            type: "hotfix",
            release: "patch",
          },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            {
              type: "feat",
              section: "Features",
            },
            {
              type: "fix",
              section: "Bug Fixes",
            },
            {
              type: "hotfix",
              section: "🔥 Hotfixes",
              hidden: false,
            },
            {
              type: "chore",
              hidden: true,
            },
            {
              type: "docs",
              hidden: true,
            },
            {
              type: "style",
              hidden: true,
            },
            {
              type: "refactor",
              hidden: true,
            },
            {
              type: "perf",
              hidden: true,
            },
            {
              type: "test",
              hidden: true,
            },
          ],
        },
      },
    ],
    [
      "@semantic-release/changelog",
      {
        // Write changelog into docs/ so it doesn't violate root-directory cleanliness checks
        changelogFile: "docs/CHANGELOG.md",
      },
    ],
    [
      "@semantic-release/exec",
      {
        // Persist the next release version to VERSION and sync it into package.json/workspaces
        prepareCmd:
          "echo ${nextRelease.version} > config/VERSION && bash scripts/sync-versions.sh",
      },
    ],
    [
      "@semantic-release/git",
      {
        // Commit the synced version files and the docs changelog
        assets: ["package.json", "config/VERSION", "docs/CHANGELOG.md"],
        message:
          "chore(release): v${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: [],
      },
    ],
  ],
};
