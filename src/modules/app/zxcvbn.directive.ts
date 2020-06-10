/* eslint-disable no-restricted-globals */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { AfterViewInit, Directive, Input } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import zxcvbn, { ZXCVBNResult } from 'zxcvbn';

@autobind
@Directive({
  bindToController: true,
  require: {
    ngModel: 'ngModel'
  },
  selector: '[zxcvbn]'
})
export default class ZxcvbnDirective implements AfterViewInit {
  minScore: string;
  ngModel: ng.INgModelController;
  password: string;
  @Input('=zxcvbn') result: ZXCVBNResult;

  ngAfterViewInit(): void {
    this.ngModel.$validators.passwordStrength = (value) => {
      let minScore = parseInt(this.minScore, 10);
      minScore = isNaN(minScore) || minScore < 0 || minScore > 4 ? 0 : minScore;
      this.password = value || '';
      this.result = zxcvbn(this.password);
      return minScore <= this.result.score;
    };
  }
}
