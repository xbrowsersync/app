import { NgModule } from 'angular-ts-decorators';
import BookmarkIdMapperService from './bookmark-id-mapper/bookmark-id-mapper.service';
import WebExtStoreService from './webext-store/webext-store.service';
import WebExtUpgradeService from './webext-upgrade-service/webext-upgrade.service';

@NgModule({
  id: 'WebExtSharedModule',
  providers: [BookmarkIdMapperService, WebExtStoreService, WebExtUpgradeService]
})
export default class WebExtSharedModule {}
