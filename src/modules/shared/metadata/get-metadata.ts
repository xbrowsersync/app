import { WebpageMetadata } from '../global-shared.interface';

export const getMetadata = (url: string, html: string): WebpageMetadata => {
  // Extract metadata values
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(html, 'text/html');

  const getDecodedTextValue = (text: string): string => {
    if (!text) {
      return '';
    }
    const txt = htmlDoc.createElement('textarea');
    txt.innerHTML = text.trim();
    return txt.value;
  };

  const getMetaElements = (metaName: string, returnAll = false): Element | Element[] => {
    const elements = Array.from(
      htmlDoc.querySelectorAll(
        `meta[name="${metaName.toLowerCase()}"],meta[property="${metaName.toLowerCase()}"],meta[name="${metaName.toUpperCase()}"],meta[property="${metaName.toUpperCase()}"]`
      )
    );
    if (!elements?.length) {
      return;
    }
    return returnAll ? elements : elements.slice(-1)[0];
  };

  const getPageDescription = (): string => {
    const ogDescription = getMetaElements('og:description') as HTMLMetaElement;
    if (ogDescription?.content) {
      return getDecodedTextValue(ogDescription.content);
    }
    const twitterDescription = getMetaElements('twitter:description') as HTMLMetaElement;
    if (twitterDescription?.content) {
      return getDecodedTextValue(twitterDescription.content);
    }
    const defaultDescription = getMetaElements('description') as HTMLMetaElement;
    if (defaultDescription?.content) {
      return getDecodedTextValue(defaultDescription.content);
    }
  };

  const getPageKeywords = (): string => {
    const keywordsArr = new Set<string>();
    const ogVideoTags = getMetaElements('og:video:tag', true) as HTMLMetaElement[];
    ogVideoTags?.forEach((tag) => {
      if (tag?.content) {
        keywordsArr.add(getDecodedTextValue(tag.content?.toLowerCase()));
      }
    });
    const metaKeywords = getMetaElements('keywords') as HTMLMetaElement;
    if (metaKeywords?.content) {
      metaKeywords.content.split(',').forEach((keyword) => {
        if (keyword) {
          keywordsArr.add(getDecodedTextValue(keyword?.toLowerCase()));
        }
      });
    }
    const keywords = [...keywordsArr].filter(Boolean).join();
    if (keywords.length) {
      return keywords;
    }
  };

  const getPageTitle = (): string => {
    const ogTitle = getMetaElements('og:title') as HTMLMetaElement;
    if (ogTitle?.content) {
      return getDecodedTextValue(ogTitle.content);
    }
    const twitterTitle = getMetaElements('twitter:title') as HTMLMetaElement;
    if (twitterTitle?.content) {
      return getDecodedTextValue(twitterTitle.content);
    }
    return getDecodedTextValue(htmlDoc.title);
  };

  // Return metadata object
  const title = getPageTitle();
  const description = getPageDescription();
  const tags = getPageKeywords();
  return {
    description,
    tags,
    title,
    url
  };
};
