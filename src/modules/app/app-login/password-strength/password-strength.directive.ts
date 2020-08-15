import { AfterViewInit, Directive, Input } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import zxcvbn, { ZXCVBNResult } from 'zxcvbn';

@autobind
@Directive({
  bindToController: true,
  require: {
    ngModel: 'ngModel'
  },
  selector: '[passwordStrength]'
})
export default class PasswordStrengthDirective implements AfterViewInit {
  ngModel: ng.INgModelController;
  @Input('=passwordStrength') result: ZXCVBNResult;

  ngAfterViewInit(): void {
    this.ngModel.$validators.passwordStrength = (value) => {
      this.result = zxcvbn(value ?? '');
      return true;
    };
  }
}
