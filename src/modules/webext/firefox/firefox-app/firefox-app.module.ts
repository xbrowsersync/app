import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtAppModule from '../../webext-app/webext-app.module';
import FirefoxBookmarkService from '../firefox-bookmark/firefox-bookmark.service';
import FirefoxPlatformService from '../firefox-platform/firefox-platform.service';
import FirefoxAppComponent from './firefox-app.component';

@NgModule({
  declarations: [FirefoxAppComponent],
  id: 'FirefoxAppModule',
  imports: [WebExtAppModule],
  providers: [FirefoxBookmarkService, FirefoxPlatformService]
})
export default class FirefoxAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(FirefoxAppModule as NgModule).module.name], { strictDi: true });
});
