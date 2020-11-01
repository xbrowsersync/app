import autobind from 'autobind-decorator';
import { WebpageMetadata } from '../../shared/global-shared.interface';

@autobind
class WebpageMetadataCollecter {
  static CollectMetadata(): WebpageMetadata {
    const collecter = new WebpageMetadataCollecter();
    return {
      title: collecter.getPageTitle(),
      url: document.location.href,
      description: collecter.getPageDescription(),
      tags: collecter.getPageKeywords()
    };
  }

  getDecodedTextValue(text: string): string {
    if (!text) {
      return '';
    }
    const txt = document.createElement('textarea');
    txt.innerHTML = text.trim();
    return txt.value;
  }

  getPageDescription(): string {
    const ogDescription: HTMLMetaElement =
      document.querySelector('meta[property="OG:DESCRIPTION"]') ??
      document.querySelector('meta[property="og:description"]');
    if (ogDescription && ogDescription.content) {
      return this.getDecodedTextValue(ogDescription.content);
    }

    const twitterDescription: HTMLMetaElement =
      document.querySelector('meta[name="TWITTER:DESCRIPTION"]') ??
      document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && twitterDescription.content) {
      return this.getDecodedTextValue(twitterDescription.content);
    }

    const defaultDescription: HTMLMetaElement =
      document.querySelector('meta[name="DESCRIPTION"]') ?? document.querySelector('meta[name="description"]');
    if (defaultDescription && defaultDescription.content) {
      return this.getDecodedTextValue(defaultDescription.content);
    }

    return '';
  }

  getPageKeywords(): string {
    const keywords: string[] = [];

    // Get open graph tag values
    document.querySelectorAll<HTMLMetaElement>('meta[property="OG:VIDEO:TAG"]').forEach((tag) => {
      if (tag && tag.content) {
        keywords.push(this.getDecodedTextValue(tag.content));
      }
    });
    document.querySelectorAll<HTMLMetaElement>('meta[property="og:video:tag"]').forEach((tag) => {
      if (tag && tag.content) {
        keywords.push(this.getDecodedTextValue(tag.content));
      }
    });

    // Get meta tag values
    const metaKeywords: HTMLMetaElement =
      document.querySelector('meta[name="KEYWORDS"]') ?? document.querySelector('meta[name="keywords"]');
    if (metaKeywords && metaKeywords.content) {
      metaKeywords.content.split(',').forEach((keyword) => {
        if (keyword) {
          keywords.push(this.getDecodedTextValue(keyword));
        }
      });
    }

    // Remove duplicates
    const uniqueKeywords = keywords.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });

    if (uniqueKeywords.length > 0) {
      return uniqueKeywords.join();
    }
  }

  getPageTitle(): string {
    const ogTitle: HTMLMetaElement =
      document.querySelector('meta[property="OG:TITLE"]') ?? document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) {
      return this.getDecodedTextValue(ogTitle.content);
    }

    const twitterTitle: HTMLMetaElement =
      document.querySelector('meta[name="TWITTER:TITLE"]') ?? document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle && twitterTitle.content) {
      return this.getDecodedTextValue(twitterTitle.content);
    }

    return this.getDecodedTextValue(document.title);
  }
}
export default WebpageMetadataCollecter.CollectMetadata();
