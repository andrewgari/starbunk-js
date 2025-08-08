import { extractWebhookId } from '../webhook';

describe('extractWebhookId', () => {
  it('returns id from valid webhook URL', () => {
    const id = extractWebhookId('https://discord.com/api/webhooks/1401616914886819850/abcdef');
    expect(id).toBe('1401616914886819850');
  });

  it('returns undefined for undefined input', () => {
    expect(extractWebhookId(undefined)).toBeUndefined();
  });

  it('returns undefined when URL has no id', () => {
    expect(extractWebhookId('https://discord.com/api/webhooks/')).toBeUndefined();
  });
});

