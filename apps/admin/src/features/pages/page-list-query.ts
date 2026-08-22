const defaultPage = 1;

export function readPageListPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get("page"));

  if (!Number.isInteger(page) || page < defaultPage) {
    return defaultPage;
  }

  return page;
}

export function buildPageListSearch(page: number): string {
  const searchParams = new URLSearchParams();

  if (page > defaultPage) {
    searchParams.set("page", String(page));
  }

  return searchParams.toString();
}
