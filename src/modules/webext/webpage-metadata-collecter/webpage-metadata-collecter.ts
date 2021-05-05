import { WebpageMetadata } from '../../shared/global-shared.interface';
import { getMetadata } from '../../shared/metadata/get-metadata';

class WebpageMetadataCollecter {
  static CollectMetadata(): WebpageMetadata {
    return getMetadata(document.location.href, document.documentElement.innerHTML);
  }
}
export default WebpageMetadataCollecter;
