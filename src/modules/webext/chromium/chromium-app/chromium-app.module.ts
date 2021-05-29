import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import { WebExtAppModule } from '../../webext-app/webext-app.module';
import { ChromiumBookmarkService } from '../shared/chromium-bookmark/chromium-bookmark.service';
import { ChromiumPlatformService } from '../shared/chromium-platform/chromium-platform.service';
import { ChromiumAppBackupRestoreSettingsComponent } from './chromium-app-backup-restore-settings/chromium-app-backup-restore-settings.component';
import { ChromiumAppHelperService } from './shared/chromium-app-helper/chromium-app-helper.service';

@NgModule({
  declarations: [ChromiumAppBackupRestoreSettingsComponent],
  id: 'ChromiumAppModule',
  imports: [WebExtAppModule],
  providers: [ChromiumAppHelperService, ChromiumBookmarkService, ChromiumPlatformService]
})
class ChromiumAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(ChromiumAppModule as NgModule).module.name], { strictDi: true });
});
