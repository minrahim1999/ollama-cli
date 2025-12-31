/**
 * Web and documentation tools
 */

import type { ToolCallResult } from '../types/tools.js';

/**
 * Fetch URL - Fetch content from a URL
 */
export async function fetchUrl(params: {
  url: string;
  headers?: Record<string, string>;
}): Promise<ToolCallResult> {
  try {
    const response = await fetch(params.url, {
      ...(params.headers ? { headers: params.headers } : {}),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        timestamp: new Date().toISOString(),
      };
    }

    const contentType = response.headers.get('content-type') || '';
    let content: string;

    if (contentType.includes('application/json')) {
      const json = await response.json();
      content = JSON.stringify(json, null, 2);
    } else {
      content = await response.text();
    }

    return {
      success: true,
      data: {
        url: params.url,
        status: response.status,
        contentType,
        content: content.substring(0, 10000), // Limit to 10KB
        contentLength: content.length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch URL',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Web Search - Search the web (placeholder - would need API key)
 */
export function webSearch(params: { query: string }): ToolCallResult {
  // This is a placeholder. In production, you would integrate with:
  // - Google Custom Search API
  // - Bing Search API
  // - DuckDuckGo API
  // - etc.

  return {
    success: false,
    error:
      'Web search requires API configuration. Please set up a search API key in the config.',
    data: {
      query: params.query,
      suggestion:
        'You can manually search for: ' +
        params.query +
        ' at https://www.google.com/search?q=' +
        encodeURIComponent(params.query),
    },
    timestamp: new Date().toISOString(),
  };
}
