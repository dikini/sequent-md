import { renderHast } from '@sequent-md/core';

export function rehypeSequent(options = {}) {
  return (tree) => transformChildren(tree, options);
}

function transformChildren(node, options) {
  if (!node || !Array.isArray(node.children)) return;
  node.children = node.children.map((child) => {
    if (isSequentPre(child)) return renderHast(readCodeText(child.children[0]), options).hast;
    transformChildren(child, options);
    return child;
  });
}

function isSequentPre(node) {
  const code = node?.tagName === 'pre' && node.children?.length === 1 ? node.children[0] : null;
  return code?.tagName === 'code' && Array.isArray(code.properties?.className) && code.properties.className.includes('language-sequent');
}

function readCodeText(code) {
  return (code.children ?? []).filter((child) => child.type === 'text').map((child) => child.value).join('');
}
