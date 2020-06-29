import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import FirefoxPlatformService from './firefox-platform.service';
import WebExtAppModule from '../webext/webext-app.module';
import FirefoxAppComponent from './firefox-app.component';

@NgModule({
  declarations: [FirefoxAppComponent],
  id: 'FirefoxAppModule',
  imports: [WebExtAppModule],
  providers: [FirefoxPlatformService]
})
export default class FirefoxAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(FirefoxAppModule as NgModule).module.name], { strictDi: true });
});
