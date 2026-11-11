const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}

function paginated(data, total, { page, limit }) {
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

module.exports = { parsePagination, paginated };
