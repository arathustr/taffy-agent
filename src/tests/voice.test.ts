import { describe, expect, it } from 'vitest';
import { normalizeSpeechText } from '../renderer/voice';

describe('voice text normalization', () => {
  it('removes stage directions before speech synthesis', () => {
    expect(normalizeSpeechText('（眨眨眼）我准备好了（笑）')).toBe('我准备好了');
    expect(normalizeSpeechText('(typing) 现在开始执行 [小声]')).toBe('现在开始执行');
  });
});
