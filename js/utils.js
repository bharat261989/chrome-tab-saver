/**
 * ============================================================================
 * UTILS.JS
 * ============================================================================
 *
 * Utility functions used throughout the Tab Saver extension.
 * These are pure helper functions with no side effects.
 *
 * Functions:
 * - escapeHtml(): Prevent XSS by escaping HTML characters
 * - getHostname(): Safely extract hostname from URL
 * - normalizeUrl(): Normalize URLs for comparison
 * - generateId(): Generate unique IDs for tabs/groups
 * - attachFaviconErrorHandlers(): Handle broken favicon images
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// HTML SAFETY
// -----------------------------------------------------------------------------

/**
 * Escapes HTML special characters to prevent XSS attacks
 *
 * This is critical for security when displaying user-generated content
 * like tab titles or URLs in the DOM.
 *
 * @param {string} text - The text to escape
 * @returns {string} - HTML-safe escaped text
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert("xss")&lt;/script&gt;'
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// -----------------------------------------------------------------------------
// URL HANDLING
// -----------------------------------------------------------------------------

/**
 * Safely extracts the hostname from a URL string
 *
 * Handles invalid URLs gracefully by returning the original string
 * or an empty string if the URL is null/undefined.
 *
 * @param {string} url - The URL to extract hostname from
 * @returns {string} - The hostname or fallback value
 *
 * @example
 * getHostname('https://www.example.com/page?query=1')
 * // Returns: 'www.example.com'
 *
 * getHostname('invalid-url')
 * // Returns: 'invalid-url'
 */
function getHostname(url) {
  // Return empty string for null/undefined URLs
  if (!url) return '';

  try {
    return new URL(url).hostname;
  } catch {
    // URL constructor throws on invalid URLs
    // Return the original string as fallback
    return url;
  }
}

/**
 * Normalizes a URL for comparison purposes
 *
 * This removes trailing slashes and fragments (#) while preserving
 * query parameters. Used to detect duplicate tabs.
 *
 * @param {string} url - The URL to normalize
 * @returns {string} - Normalized URL for comparison
 *
 * @example
 * normalizeUrl('https://example.com/page/#section')
 * // Returns: 'https://example.com/page'
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Combine origin + pathname (without trailing slash) + query string
    // This preserves query params so different search results are unique
    return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
  } catch {
    return url;
  }
}

// -----------------------------------------------------------------------------
// ID GENERATION
// -----------------------------------------------------------------------------

/**
 * Generates a unique identifier for tabs and groups
 *
 * Combines timestamp with random number to ensure uniqueness
 * even when creating multiple items in rapid succession.
 *
 * @returns {number} - Unique numeric ID
 *
 * @example
 * generateId() // Returns something like: 1706889234567.123456
 */
function generateId() {
  return Date.now() + Math.random();
}

/**
 * Generates a string ID (used for groups)
 *
 * @returns {string} - Unique string ID
 */
function generateStringId() {
  return Date.now().toString();
}

// -----------------------------------------------------------------------------
// TAB FILTERING
// -----------------------------------------------------------------------------

/**
 * Filters an array of tabs based on a search query
 *
 * Matches against both title and URL (case-insensitive).
 * Returns all tabs if query is empty.
 *
 * @param {Array} tabs - Array of tab objects to filter
 * @param {string} query - Search query string
 * @returns {Array} - Filtered array of matching tabs
 *
 * @example
 * filterTabs(tabs, 'github')
 * // Returns tabs where title or URL contains 'github'
 */
function filterTabs(tabs, query) {
  // Return all tabs if no search query
  if (!query) return tabs;

  const lowerQuery = query.toLowerCase();

  return tabs.filter(tab =>
    tab.title.toLowerCase().includes(lowerQuery) ||
    tab.url.toLowerCase().includes(lowerQuery)
  );
}

// -----------------------------------------------------------------------------
// IMAGE ERROR HANDLING
// -----------------------------------------------------------------------------

/**
 * Attaches error handlers to favicon images within a container
 *
 * When a favicon fails to load (404, CORS error, etc.), this
 * replaces it with the default placeholder image.
 *
 * This is called after rendering any list of tabs to handle
 * broken favicon URLs gracefully.
 *
 * @param {HTMLElement} container - Container element with favicon images
 *
 * @example
 * attachFaviconErrorHandlers(savedTabsList);
 */
function attachFaviconErrorHandlers(container) {
  // Find all favicon images (both tab favicons and picker favicons)
  const images = container.querySelectorAll('img.tab-favicon, img.picker-favicon');

  images.forEach(img => {
    img.addEventListener('error', function() {
      // Replace broken image with default placeholder
      this.src = DEFAULT_FAVICON;
    });
  });
}

// -----------------------------------------------------------------------------
// SEARCH QUERY HELPER
// -----------------------------------------------------------------------------

/**
 * Safely gets the search query string
 *
 * Handles cases where the query might be passed as different types
 * or when the search input doesn't exist yet.
 *
 * @param {string|undefined} searchQuery - Optional query parameter
 * @returns {string} - Lowercase search query string
 */
function getSearchQuery(searchQuery) {
  // If a string was passed directly, use it
  if (typeof searchQuery === 'string') return searchQuery;

  // Otherwise, get value from search input (with null safety)
  return searchInput?.value?.toLowerCase() || '';
}
