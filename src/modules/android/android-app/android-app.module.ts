import 'angular-hammer';
import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import AppModule from '../../app/app.module';
import AndroidSharedModule from '../android-shared/android-shared.module';
import AndroidAppAlertComponent from './android-app-alert/android-app-alert.component';
import AndroidAppBookmarkComponent from './android-app-bookmark/android-app-bookmark.component';
import AndroidAppHelperService from './android-app-helper/android-app-helper.service';
import AndroidAppScanComponent from './android-app-scan/android-app-scan.component';
import AndroidAppSearchComponent from './android-app-search/android-app-search.component';
import AndroidAppWorkingComponent from './android-app-working/android-app-working.component';
import AndroidAppComponent from './android-app.component';

@NgModule({
  declarations: [
    AndroidAppAlertComponent,
    AndroidAppBookmarkComponent,
    AndroidAppComponent,
    AndroidAppScanComponent,
    AndroidAppSearchComponent,
    AndroidAppWorkingComponent
  ],
  id: 'AndroidAppModule',
  imports: [AndroidSharedModule, AppModule, 'hmTouchEvents'],
  providers: [AndroidAppHelperService]
})
export default class AndroidAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(AndroidAppModule as NgModule).module.name], { strictDi: true });
});
