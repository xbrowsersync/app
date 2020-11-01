import 'angular-hammer';
import { NgModule } from 'angular-ts-decorators';
import AndroidBookmarkService from './android-bookmark/android-bookmark.service';
import AndroidPlatformService from './android-platform/android-platform.service';
import AndroidStoreService from './android-store/android-store.service';
import AndroidUpgradeService from './android-upgrade/android-upgrade.service';

@NgModule({
  id: 'AndroidSharedModule',
  providers: [AndroidBookmarkService, AndroidPlatformService, AndroidStoreService, AndroidUpgradeService]
})
export default class AndroidSharedModule {}
