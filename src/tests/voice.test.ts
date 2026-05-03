import { describe, expect, it } from 'vitest';
import { normalizeSpeechText, splitSpeechChunks } from '../renderer/voice';

describe('voice text normalization', () => {
  it('removes stage directions before speech synthesis', () => {
    expect(normalizeSpeechText('（眨眨眼）我准备好了（笑）')).toBe('我准备好了');
    expect(normalizeSpeechText('(typing) 现在开始执行 [小声]')).toBe('现在开始执行');
  });

  it('splits long speech into low-latency chunks', () => {
    expect(splitSpeechChunks('塔菲开始看浏览器。然后交给 Codex 写代码。做好之后会告诉你。', 18)).toEqual([
      '塔菲开始看浏览器。',
      '然后交给 Codex 写代码。',
      '做好之后会告诉你。'
    ]);
  });
});
