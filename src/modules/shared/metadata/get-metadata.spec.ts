import { getMetadata } from './get-metadata';

describe('getMetadata', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Returns title from og:title meta tag', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="OG Title">
        <title>Page Title</title>
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.title).toBe('OG Title');
    expect(result.url).toBe('https://example.com');
  });

  test('Returns title from document title when no meta tags', () => {
    const html = `
      <html><head>
        <title>Page Title</title>
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.title).toBe('Page Title');
  });

  test('Returns description from og:description meta tag', () => {
    const html = `
      <html><head>
        <meta property="og:description" content="OG Description">
        <meta name="description" content="Default Description">
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.description).toBe('OG Description');
  });

  test('Returns description from default description meta tag', () => {
    const html = `
      <html><head>
        <meta name="description" content="Default Description">
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.description).toBe('Default Description');
  });

  test('Returns description from twitter:description meta tag', () => {
    const html = `
      <html><head>
        <meta name="twitter:description" content="Twitter Description">
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.description).toBe('Twitter Description');
  });

  test('Returns keywords from meta keywords tag', () => {
    const html = `
      <html><head>
        <meta name="keywords" content="javascript,testing,web">
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.tags).toBe('javascript,testing,web');
  });

  test('Returns undefined description when no description meta tags exist', () => {
    const html = `
      <html><head>
        <title>Title</title>
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.description).toBeUndefined();
  });

  test('Returns undefined tags when no keywords meta tags exist', () => {
    const html = `
      <html><head>
        <title>Title</title>
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.tags).toBeUndefined();
  });

  test('Returns title from twitter:title meta tag', () => {
    const html = `
      <html><head>
        <meta name="twitter:title" content="Twitter Title">
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.title).toBe('Twitter Title');
  });

  test('Decodes HTML entities in title', () => {
    const html = `
      <html><head>
        <title>Hello &amp; World</title>
      </head><body></body></html>
    `;

    const result = getMetadata('https://example.com', html);

    expect(result.title).toBe('Hello & World');
  });

  test('URL is passed through to result', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';

    const result = getMetadata('https://test.example.com/page', html);

    expect(result.url).toBe('https://test.example.com/page');
  });
});
