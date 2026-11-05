import { describe, expect, it } from 'vitest';
import { faviconSources } from './favicon';

describe('faviconSources', () => {
  it("tries the open tab's own icon first, then the favicon cache", () => {
    const sources = faviconSources('https://hackernewz.com/', 16, 'https://hackernewz.com/favicon.ico');
    expect(sources[0]).toBe('https://hackernewz.com/favicon.ico');
    expect(sources).toHaveLength(2);
  });

  it("skips tab icons the panel can't load, and tabs without one", () => {
    expect(faviconSources('chrome://settings', 16, 'chrome://theme/IDR_SETTINGS_FAVICON')).toHaveLength(1);
    expect(faviconSources('https://example.com', 16)).toHaveLength(1);
    expect(faviconSources('https://example.com', 16, 'data:image/png;base64,AAAA')[0]).toMatch(/^data:image/);
  });
});
