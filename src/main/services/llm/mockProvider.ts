import type { ChatRequest, ChatResponse, LlmProvider } from './types';

export class MockProvider implements LlmProvider {
  id = 'mock';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const last = request.messages.at(-1)?.content ?? '';
    if (request.json) {
      return {
        content: JSON.stringify({
          kind: routeKind(last),
          confidence: 0.82,
          goal: last.slice(0, 160) || '继续任务',
          risk: routeRisk(last),
          requiresApproval: routeKind(last) === 'codex' || routeKind(last) === 'shell',
          reason: 'Mock router based on local keywords'
        }),
        model: 'mock-json'
      };
    }

    return {
      content: buildReply(last),
      model: 'mock-chat'
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Mock provider is ready' };
  }
}

function routeKind(text: string): string {
  if (/codex|代码|编程|修复|项目|仓库|组件|接口/i.test(text)) return 'codex';
  if (/浏览器|打开|网页|搜索|登录|网址|http/i.test(text)) return 'browser';
  if (/命令|终端|shell|npm|pnpm|git|运行/i.test(text)) return 'shell';
  if (/文件|目录|读取|写入/i.test(text)) return 'file';
  if (/设置|配置|模型|声音/i.test(text)) return 'settings';
  return 'chat';
}

function routeRisk(text: string): string {
  if (/删除|付款|支付|发布|推送|push|rm |remove|del /i.test(text)) return 'high';
  if (/运行|命令|codex|写入|安装|npm|git/i.test(text)) return 'medium';
  return 'low';
}

function buildReply(text: string): string {
  if (!text.trim()) return '塔菲在，雏草姬直接把任务丢过来就行喵。';
  return `塔菲先按测试模式接住这只任务：“${text.slice(0, 80)}”。DeepSeek 接好后，塔菲会用 Flash 做快速判断，复杂任务再切到 Pro 喵。`;
}
