// The Help Center's articles, bundled at build time from the Markdown files in help/.
import { buildArticles } from './articles';

const files = import.meta.glob('/help/**/*.md', { query: '?raw', import: 'default', eager: true });

export const ARTICLES = buildArticles(files);
