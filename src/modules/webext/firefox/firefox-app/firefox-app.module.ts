import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtAppModule from '../../webext-app/webext-app.module';
import FirefoxBookmarkService from '../shared/firefox-bookmark/firefox-bookmark.service';
import FirefoxPlatformService from '../shared/firefox-platform/firefox-platform.service';
import FirefoxAppHelperService from './shared/firefox-app-helper/firefox-app-helper.service';

@NgModule({
  id: 'FirefoxAppModule',
  imports: [WebExtAppModule],
  providers: [FirefoxAppHelperService, FirefoxBookmarkService, FirefoxPlatformService]
})
export default class FirefoxAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(FirefoxAppModule as NgModule).module.name], { strictDi: true });
});
