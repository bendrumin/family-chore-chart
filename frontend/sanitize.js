/**
 * HTML Sanitization Utilities
 * Uses DOMPurify to prevent XSS attacks
 */

(function(window) {
  'use strict';

  // Ensure DOMPurify is loaded
  if (typeof DOMPurify === 'undefined') {
    console.error('DOMPurify not loaded! XSS protection disabled.');
    // Fallback: provide unsafe versions that at least work
    window.sanitizeHTML = function(dirty) { return dirty; };
    window.safeSetHTML = function(element, html) { element.innerHTML = html; };
    window.safeSetText = function(element, text) { element.textContent = text; };
    return;
  }

  /**
   * Sanitize HTML string to prevent XSS
   * @param {string} dirty - Potentially unsafe HTML
   * @param {object} config - Optional DOMPurify configuration
   * @returns {string} - Sanitized HTML safe for insertion
   */
  window.sanitizeHTML = function(dirty, config) {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, config || {
      ALLOWED_TAGS: [
        'b', 'i', 'em', 'strong', 'u', 'p', 'br', 'span', 'div',
        'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'tr', 'td', 'th', 'tbody', 'thead',
        'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
        'style', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke',
        'stroke-width', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2'
      ],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  };

  /**
   * Safely set HTML content of an element
   * @param {HTMLElement} element - Target element
   * @param {string} html - HTML content to set
   */
  window.safeSetHTML = function(element, html) {
    if (!element) return;
    element.innerHTML = window.sanitizeHTML(html);
  };

  /**
   * Safely set text content (no HTML parsing, uses textContent)
   * This is the safest method and should be preferred when HTML is not needed
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text content to set
   */
  window.safeSetText = function(element, text) {
    if (!element) return;
    element.textContent = text || '';
  };

  /**
   * Create a sanitized HTML element
   * @param {string} html - HTML string
   * @returns {DocumentFragment} - Safe DOM fragment
   */
  window.createSafeElement = function(html) {
    const template = document.createElement('template');
    template.innerHTML = window.sanitizeHTML(html);
    return template.content;
  };

  /**
   * Sanitize and append HTML to an element
   * @param {HTMLElement} element - Target element
   * @param {string} html - HTML to append
   */
  window.safeAppendHTML = function(element, html) {
    if (!element) return;
    const fragment = window.createSafeElement(html);
    element.appendChild(fragment);
  };

  /**
   * Sanitize URL to prevent javascript: and data: URL attacks
   * @param {string} url - URL to sanitize
   * @returns {string} - Safe URL or empty string
   */
  window.sanitizeURL = function(url) {
    if (!url) return '';
    const trimmed = url.trim().toLowerCase();

    // Block dangerous protocols
    if (trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:text/html') ||
        trimmed.startsWith('vbscript:')) {
      console.warn('Blocked dangerous URL:', url);
      return '';
    }

    return url;
  };

  console.log('✅ Sanitization utilities loaded with DOMPurify');

})(window);
