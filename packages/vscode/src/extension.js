import { render } from '@sequent-md/core';

export function activate() {
  return {
    extendMarkdownIt(markdown) {
      const originalFence = markdown.renderer.rules.fence;
      markdown.renderer.rules.fence = (tokens, index, options, environment, self) => {
        const token = tokens[index];
        const language = token.info.trim().split(/\s+/, 1)[0];
        if (language === 'sequent') return render(token.content).html;
        return originalFence(tokens, index, options, environment, self);
      };
      return markdown;
    }
  };
}
