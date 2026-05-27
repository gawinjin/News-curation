type ArticleLike = {
  data: { date: Date };
  id: string;
  slug?: string;
};

export function getArticleSlug(article: Pick<ArticleLike, 'id' | 'slug'>): string {
  return article.slug ?? article.id.replace(/\.(md|mdx)$/, '');
}

export function sortArticlesByNewest<T extends ArticleLike>(articles: T[]): T[] {
  return [...articles].sort((a, b) => {
    const dateDiff = b.data.date.getTime() - a.data.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return getArticleSlug(b).localeCompare(getArticleSlug(a));
  });
}
