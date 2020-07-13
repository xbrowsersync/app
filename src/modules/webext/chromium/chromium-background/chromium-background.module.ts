import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtBackgroundModule from '../../webext-background/webext-background.module';
import ChromiumBookmarkService from '../chromium-bookmark/chromium-bookmark.service';
import ChromiumPlatformService from '../chromium-platform/chromium-platform.service';

@NgModule({
  id: 'ChromiumBackgroundModule',
  imports: [WebExtBackgroundModule],
  providers: [ChromiumBookmarkService, ChromiumPlatformService]
})
export default class ChromiumBackgroundModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(ChromiumBackgroundModule as NgModule).module.name]);
});
