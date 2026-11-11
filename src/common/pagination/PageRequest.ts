export class PageRequest {
  static readonly DEFAULT_LIMIT = 20;
  static readonly MAX_LIMIT = 100;

  private constructor(
    readonly page: number,
    readonly limit: number,
  ) {}

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  static of(page: number, limit: number): PageRequest {
    return new PageRequest(page, limit);
  }

  /** ?page= (default 1) and ?limit= (default 20, max 100); invalid values fall back to the defaults. */
  static fromQuery(query: Record<string, unknown>): PageRequest {
    const page = Math.max(1, Number.parseInt(String(query.page), 10) || 1);
    const limit = Math.min(
      PageRequest.MAX_LIMIT,
      Math.max(1, Number.parseInt(String(query.limit), 10) || PageRequest.DEFAULT_LIMIT),
    );
    return new PageRequest(page, limit);
  }
}
