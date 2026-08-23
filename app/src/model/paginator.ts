export interface PageFilter<T> {
  isBlank(): boolean;
  matches(item: T): boolean;
  getSorting(): ((a: T, b: T) => number) | undefined;
}

/** One rendered page. `elements` is padded with null to fill the grid. */
export class Page<T> {
  constructor(
    readonly elements: (T | null)[],
    readonly total: number,
    readonly first: number,
    readonly last: number,
    readonly next: boolean,
    readonly previous: boolean,
  ) {}
}

/** Filters, sorts and pages a collection. Ported from models/paginator.js. */
export class Paginator<T> {
  private collection: T[];

  constructor(
    public page: number,
    public pageSize: number,
    collection: T[] | undefined,
    public filter: PageFilter<T>,
  ) {
    this.collection = collection ?? [];
  }

  nextPage(): void {
    this.page += 1;
  }

  previousPage(): void {
    this.page -= 1;
  }

  setPageSize(size: number): void {
    this.pageSize = size;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getCurrentPage(): number {
    return this.page;
  }

  setCollection(collection: T[]): void {
    const sorting = this.filter.getSorting();
    this.collection = sorting ? [...collection].sort(sorting) : collection;
  }

  getCollection(): T[] {
    return this.collection;
  }

  getResults(): T[] {
    return this.filter.isBlank()
      ? this.collection
      : this.collection.filter((item) => this.filter.matches(item));
  }

  getPage(): Page<T> {
    const results = this.getResults();
    const total = results.length;

    // Walk back if the current page no longer exists, e.g. after a filter
    // narrowed the collection.
    let first = total > 0 ? (this.page - 1) * this.pageSize + 1 : 0;
    while (total < first) {
      this.previousPage();
      first = (this.page - 1) * this.pageSize + 1;
    }

    const last = this.page * this.pageSize > total ? total : this.page * this.pageSize;
    const elements: (T | null)[] = total > 0 ? results.slice(first - 1, last) : [];
    const next = this.pageSize * this.page < total;
    const previous = this.page > 1;

    // Padded so the overview grid keeps a fixed number of columns.
    while (elements.length < this.pageSize) {
      elements.push(null);
    }
    return new Page(elements, total, first, last, next, previous);
  }
}
