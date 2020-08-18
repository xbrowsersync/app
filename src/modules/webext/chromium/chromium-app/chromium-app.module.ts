import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtAppModule from '../../webext-app/webext-app.module';
import ChromiumBookmarkService from '../chromium-shared/chromium-bookmark/chromium-bookmark.service';
import ChromiumPlatformService from '../chromium-shared/chromium-platform/chromium-platform.service';
import ChromiumAppHelperService from './chromium-app-helper/chromium-app-helper.service';

@NgModule({
  id: 'ChromiumAppModule',
  imports: [WebExtAppModule],
  providers: [ChromiumAppHelperService, ChromiumBookmarkService, ChromiumPlatformService]
})
export default class ChromiumAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(ChromiumAppModule as NgModule).module.name], { strictDi: true });
});
