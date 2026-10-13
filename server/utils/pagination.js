import { PAGINATION } from '../config/constants.js';

/** Normalizes ?page= & ?limit= query params. */
export function parsePagination(query = {}, { defaultLimit = PAGINATION.defaultLimit, maxLimit = PAGINATION.maxLimit } = {}) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || PAGINATION.defaultPage);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit ?? String(defaultLimit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta({ page, limit, total }) {
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
}

export default { parsePagination, buildMeta };
