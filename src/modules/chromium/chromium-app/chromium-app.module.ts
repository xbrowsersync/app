import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtAppModule from '../../webext/webext-app/webext-app.module';
import WebExtPlatformService from '../../webext/webext-platform.service';
import ChromiumAppComponent from './chromium-app.component';

@NgModule({
  declarations: [ChromiumAppComponent],
  id: 'ChromiumAppModule',
  imports: [WebExtAppModule],
  providers: [WebExtPlatformService]
})
export default class ChromiumAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(ChromiumAppModule as NgModule).module.name], { strictDi: true });
});
