import angular from 'angular';
import 'angular-hammer';
import { NgModule } from 'angular-ts-decorators';
import AndroidPlatformService from './android-platform.service';
import AppModule from '../app/app.module';
import './android-app.module.scss';

@NgModule({
  id: 'AndroidAppModule',
  imports: [AppModule, 'hmTouchEvents'],
  providers: [AndroidPlatformService]
})
export default class AndroidAppModule {}

angular.element(document).ready(() => {
  angular.bootstrap(document, [(AndroidAppModule as NgModule).module.name], { strictDi: true });
});
