import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Standard pagination query params for list endpoints. */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortDir?: 'ASC' | 'DESC' | 'asc' | 'desc';

  @IsOptional()
  @IsString()
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginateOptions<T> {
  /** Whitelist of columns callers may sort by — protects against injection. */
  sortableColumns?: string[];
  /** Column used when no sortBy is provided. Defaults to `id`. */
  defaultSort?: { column: keyof T | string; dir: 'ASC' | 'DESC' };
  /** Skip the COUNT(*) — useful when only the current page is needed. */
  skipTotal?: boolean;
}

/**
 * Paginates a QueryBuilder in a single round-trip. Count runs in parallel
 * with the page fetch (both use the same WHERE clauses via `.clone()`),
 * so total latency is max(count, fetch) rather than count + fetch.
 *
 * If the caller supplies a sortBy, it's validated against
 * `sortableColumns` and quietly falls back to the default when invalid —
 * this is important because sortBy comes from the URL and can't be
 * trusted for column names.
 */
export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
  options: PaginateOptions<T> = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  // Guarded sort
  const allowed = new Set(options.sortableColumns ?? []);
  const alias = qb.alias;
  let sortColumn: string | null = null;
  let sortDir: 'ASC' | 'DESC' = 'ASC';

  if (query.sortBy && allowed.has(query.sortBy)) {
    sortColumn = query.sortBy;
  } else if (options.defaultSort) {
    sortColumn = String(options.defaultSort.column);
    sortDir = options.defaultSort.dir;
  }
  if (query.sortDir) {
    sortDir = (query.sortDir.toUpperCase() as 'ASC' | 'DESC') || sortDir;
  }
  if (sortColumn) {
    qb.orderBy(
      sortColumn.includes('.') ? sortColumn : `${alias}.${sortColumn}`,
      sortDir,
    );
  }

  const [items, total] = await Promise.all([
    qb.clone().skip(skip).take(pageSize).getMany(),
    options.skipTotal ? Promise.resolve(0) : qb.clone().getCount(),
  ]);

  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
