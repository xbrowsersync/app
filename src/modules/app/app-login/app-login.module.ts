import { NgModule } from 'angular-ts-decorators';
import { AppLoginComponent } from './app-login.component';
import { PasswordStrengthDirective } from './password-strength/password-strength.directive';
import { XbrowsersyncLoginComponent } from './xbrowsersync-login-form/xbrowsersync-login-form.component';

@NgModule({
  declarations: [AppLoginComponent, PasswordStrengthDirective, XbrowsersyncLoginComponent],
  id: 'AppLoginModule'
})
export class AppLoginModule {}
