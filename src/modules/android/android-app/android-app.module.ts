import angular from 'angular';
import 'angular-hammer';
import { NgModule } from 'angular-ts-decorators';
import AppModule from '../../app/app.module';
import AndroidAppComponent from './android-app.component';
import AndroidPlatformService from '../android-platform.service';
import './android-app.module.scss';

@NgModule({
  declarations: [AndroidAppComponent],
  id: 'AndroidAppModule',
  imports: [AppModule, 'hmTouchEvents'],
  providers: [AndroidPlatformService]
})
export default class AndroidAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(AndroidAppModule as NgModule).module.name], { strictDi: true });
});
