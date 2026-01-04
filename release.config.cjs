module.exports = {
  branches: [
    "main",
  ],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
      },
    ],
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
      },
    ],
    [
      "@semantic-release/exec",
      {
        // Persist the next release version to VERSION and sync it into package.json/workspaces
        prepareCmd:
          "echo ${nextRelease.version} > VERSION && bash scripts/sync-versions.sh",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "VERSION", "CHANGELOG.md"],
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

