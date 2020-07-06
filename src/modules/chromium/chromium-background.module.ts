import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtBackgroundModule from '../webext/webext-background/webext-background.module';
import WebExtPlatformService from '../webext/webext-platform.service';
import ChromiumNativeBookmarksService from './chromium-native-bookmarks.service';

@NgModule({
  id: 'ChromiumBackgroundModule',
  imports: [WebExtBackgroundModule],
  providers: [ChromiumNativeBookmarksService, WebExtPlatformService]
})
export default class ChromiumBackgroundModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(ChromiumBackgroundModule as NgModule).module.name]);
});
