import type { PageRequest } from './PageRequest';

/** Serialises as { data, page, limit, total, totalPages }, the shape of every list endpoint. */
export class Page<T> {
  readonly data: T[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;

  private constructor(data: T[], total: number, request: PageRequest) {
    this.data = data;
    this.page = request.page;
    this.limit = request.limit;
    this.total = total;
    this.totalPages = Math.ceil(total / request.limit);
  }

  static of<T>(data: T[], total: number, request: PageRequest): Page<T> {
    return new Page(data, total, request);
  }
}
