import { NgModule } from 'angular-ts-decorators';
import BookmarkIdMapperService from './bookmark-id-mapper/bookmark-id-mapper.service';
import WebExtStoreService from './webext-store/webext-store.service';
import WebExtV160UpgradeProviderService from './webext-upgrade/webext-v1.6.0-upgrade-provider.service';

@NgModule({
  id: 'WebExtSharedModule',
  providers: [BookmarkIdMapperService, WebExtStoreService, WebExtV160UpgradeProviderService]
})
export default class WebExtSharedModule {}
