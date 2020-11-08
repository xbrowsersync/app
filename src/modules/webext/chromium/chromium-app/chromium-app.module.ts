import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtAppModule from '../../webext-app/webext-app.module';
import ChromiumBookmarkService from '../shared/chromium-bookmark/chromium-bookmark.service';
import ChromiumPlatformService from '../shared/chromium-platform/chromium-platform.service';
import ChromiumAppHelperService from './shared/chromium-app-helper/chromium-app-helper.service';

@NgModule({
  id: 'ChromiumAppModule',
  imports: [WebExtAppModule],
  providers: [ChromiumAppHelperService, ChromiumBookmarkService, ChromiumPlatformService]
})
export default class ChromiumAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(ChromiumAppModule as NgModule).module.name], { strictDi: true });
});
