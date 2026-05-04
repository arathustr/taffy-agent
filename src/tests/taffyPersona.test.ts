import { describe, expect, it } from 'vitest';
import { sanitizeTaffySpeech } from '../shared/taffyPersona';

describe('taffy persona speech sanitizer', () => {
  it('removes out-of-character self labels', () => {
    const cleaned = sanitizeTaffySpeech('我是 Taffy Agent，也是一个智能体助手 agent。');
    expect(cleaned).toContain('塔菲');
    expect(cleaned).not.toMatch(/Agent|智能体|助手|bot/i);
  });

  it('keeps first-person self reference as Taffy', () => {
    expect(sanitizeTaffySpeech('我会先看一下，我这边马上处理。')).toBe('塔菲会先看一下，塔菲这边马上处理。');
  });

  it('softens formal assistant wording', () => {
    const cleaned = sanitizeTaffySpeech('您好，作为AI助手，我已经为您完成配置，请注意查看。');
    expect(cleaned).toContain('雏草姬');
    expect(cleaned).toContain('塔菲已经给雏草姬');
    expect(cleaned).not.toMatch(/您好|AI助手|作为|为您|请注意/);
  });

  it('removes stage directions from visible assistant text', () => {
    expect(sanitizeTaffySpeech('（眨眨眼）我准备好了（笑）')).toBe('塔菲准备好了');
  });

  it('does not damage OpenAI product names while replacing standalone AI labels', () => {
    expect(sanitizeTaffySpeech('OpenAI API 已接好，AI助手已退出。')).toBe('OpenAI API 已接好，塔菲已退出。');
  });
});
