import 'angular-hammer';
import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import AppModule from '../../app/app.module';
import AndroidBookmarkService from '../android-bookmark/android-bookmark.service';
import AndroidPlatformService from '../android-platform.service';
import AndroidAppAlertComponent from './android-app-alert/android-app-alert.component';
import AndroidAppHelperService from './android-app-helper/android-app-helper.service';
import AndroidAppScanComponent from './android-app-scan/android-app-scan.component';
import AndroidAppWorkingComponent from './android-app-working/android-app-working.component';
import AndroidAppComponent from './android-app.component';

@NgModule({
  declarations: [AndroidAppAlertComponent, AndroidAppComponent, AndroidAppScanComponent, AndroidAppWorkingComponent],
  id: 'AndroidAppModule',
  imports: [AppModule, 'hmTouchEvents'],
  providers: [AndroidAppHelperService, AndroidBookmarkService, AndroidPlatformService]
})
export default class AndroidAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(AndroidAppModule as NgModule).module.name], { strictDi: true });
});