import 'angular-hammer';
import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import AppModule from '../../app/app.module';
import AndroidBookmarkService from '../android-bookmark/android-bookmark.service';
import AndroidPlatformService from '../android-platform.service';
import AndroidAppComponent from './android-app.component';

@NgModule({
  declarations: [AndroidAppComponent],
  id: 'AndroidAppModule',
  imports: [AppModule, 'hmTouchEvents'],
  providers: [AndroidBookmarkService, AndroidPlatformService]
})
export default class AndroidAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(AndroidAppModule as NgModule).module.name], { strictDi: true });
});
