import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtBackgroundModule from '../../webext-background/webext-background.module';
import WebExtPlatformService from '../../webext-platform/webext-platform.service';
import ChromiumBookmarkService from '../chromium-bookmark/chromium-bookmark.service';

@NgModule({
  id: 'ChromiumBackgroundModule',
  imports: [WebExtBackgroundModule],
  providers: [ChromiumBookmarkService, WebExtPlatformService]
})
export default class ChromiumBackgroundModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(ChromiumBackgroundModule as NgModule).module.name]);
});
