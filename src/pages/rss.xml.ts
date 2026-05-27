import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/site';
import { getArticleSlug, sortArticlesByNewest } from '../lib/articles';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(SITE.url);
  const feedUrl = new URL('/rss.xml', site).toString();
  const items = sortArticlesByNewest(await getCollection('articles', ({ data }) => !data.draft));
  return rss({
    title: SITE.name,
    description: SITE.description,
    site,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },
    items: items.map((a) => ({
      title: a.data.title,
      pubDate: a.data.date,
      description: a.data.summary,
      link: `/articles/${getArticleSlug(a)}/`,
      categories: a.data.tags,
    })),
    customData:
      `<language>en-us</language>` +
      `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>` +
      `<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />`,
  });
}
