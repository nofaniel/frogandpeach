import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = createDOMPurify(window);

marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(md) {
  if (!md) return '';
  return purify.sanitize(marked.parse(md));
}
