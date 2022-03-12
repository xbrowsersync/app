import { NgModule } from 'angular-ts-decorators';
import { XbrowsersyncLoginComponent } from './api-xbrowsersync-login-form/api-xbrowsersync-login-form.component';
import { AppLoginComponent } from './app-login.component';
import { PasswordStrengthDirective } from './password-strength/password-strength.directive';

@NgModule({
  declarations: [AppLoginComponent, PasswordStrengthDirective, XbrowsersyncLoginComponent],
  id: 'AppLoginModule'
})
export class AppLoginModule {}
