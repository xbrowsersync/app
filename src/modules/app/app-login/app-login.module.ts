import { NgModule } from 'angular-ts-decorators';
import AppLoginComponent from './app-login.component';
import PasswordStrengthDirective from './password-strength/password-strength.directive';

@NgModule({
  declarations: [AppLoginComponent, PasswordStrengthDirective],
  id: 'AppLoginModule'
})
export default class AppLoginModule {}
