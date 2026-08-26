/**
 * Utility for handling pagination in API responses
 */
class PaginationUtil {
  /**
   * Create pagination options for mongoose queries
   * @param {Object} query - Express request query object
   * @param {number} defaultLimit - Default page size
   * @returns {Object} Pagination options
   */
  static getPaginationOptions(query, defaultLimit = 10) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || defaultLimit);
    const skip = (page - 1) * limit;
    
    return {
      page,
      limit,
      skip
    };
  }

  /**
   * Create pagination metadata for API responses
   * @param {number} total - Total number of documents
   * @param {number} page - Current page number
   * @param {number} limit - Page size
   * @returns {Object} Pagination metadata
   */
  static getPaginationData(total, page, limit) {
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;
    
    return {
      total,
      page,
      limit,
      pages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    };
  }
}

export default PaginationUtil;
