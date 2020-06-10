import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import WebExtAppModule from '../webext/webext-app.module';
import WebExtPlatformService from '../webext/webext-platform.service';

@NgModule({
  id: 'ChromiumAppModule',
  imports: [WebExtAppModule],
  providers: [WebExtPlatformService]
})
class ChromiumAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(ChromiumAppModule as NgModule).module.name], { strictDi: true });
});
