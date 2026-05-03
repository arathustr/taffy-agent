import { describe, expect, it } from 'vitest';
import { sanitizeTaffySpeech } from '../shared/taffyPersona';

describe('taffy persona speech sanitizer', () => {
  it('removes out-of-character self labels', () => {
    const cleaned = sanitizeTaffySpeech('我是 Taffy Agent，也是一个智能体助手。');
    expect(cleaned).toContain('塔菲');
    expect(cleaned).not.toMatch(/Agent|智能体|助手|bot/i);
  });

  it('keeps first-person self reference as Taffy', () => {
    expect(sanitizeTaffySpeech('我会先看一下，我这边马上处理。')).toBe('塔菲会先看一下，塔菲这边马上处理。');
  });
});
