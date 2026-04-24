import { Client } from 'discord.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { logLayer } from '../observability/log-layer';

const logger = logLayer.withPrefix('StartupDM');

/**
 * Send a Discord DM to DISCORD_NOTIFY_USER_ID when the service starts with a
 * new APP_VERSION compared to the version stored in the data directory.
 *
 * Skips silently when:
 *  - APP_VERSION is unset or "dev"
 *  - DISCORD_NOTIFY_USER_ID is unset
 *  - The stored version matches the current version (crash-restart, not a deploy)
 *
 * Data directory defaults to /app/data; override with STARTUP_DM_DATA_DIR env var.
 */
export async function notifyStartupIfNewVersion(
  client: Client,
  displayName: string,
): Promise<void> {
  const currentVersion = process.env.APP_VERSION;
  const notifyUserId = process.env.DISCORD_NOTIFY_USER_ID;

  if (!currentVersion || currentVersion === 'dev') return;
  if (!notifyUserId) return;

  const dataDir = process.env.STARTUP_DM_DATA_DIR ?? '/app/data';
  const versionFile = `${dataDir}/.last_version`;

  let lastVersion: string | null = null;
  try {
    lastVersion = readFileSync(versionFile, 'utf-8').trim();
  } catch {
    // File doesn't exist — first boot on this volume
  }

  if (lastVersion === currentVersion) return;

  try {
    const user = await client.users.fetch(notifyUserId);
    const message =
      lastVersion === null
        ? `🟢 **${displayName}** is online! (v${currentVersion})`
        : `🚀 **${displayName}** updated and online! v${lastVersion} → v${currentVersion}`;

    await user.send(message);
    logger.info(`Sent startup DM: ${message}`);
  } catch (err) {
    logger.warn(`Failed to send startup DM: ${(err as Error).message}`);
  }

  try {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(versionFile, currentVersion, 'utf-8');
  } catch (err) {
    logger.warn(`Failed to write version file at ${versionFile}: ${(err as Error).message}`);
  }
}
