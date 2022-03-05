import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import zxcvbnLanguageCommon from '@zxcvbn-ts/language-common';
import zxcvbnLanguageEn from '@zxcvbn-ts/language-en';
import { Directive, Input, OnInit } from 'angular-ts-decorators';
import { PlatformService } from '../../../shared/global-shared.interface';

@Directive({
  bindToController: true,
  require: {
    ngModel: 'ngModel'
  },
  selector: '[passwordStrength]'
})
export class PasswordStrengthDirective implements OnInit {
  $q: ng.IQService;
  platformSvc: PlatformService;

  ngModel: ng.INgModelController;
  @Input('=passwordStrength') result: any;

  static $inject = ['$q', 'PlatformService'];
  constructor($q: ng.IQService, PlatformSvc: PlatformService) {
    this.$q = $q;
    this.platformSvc = PlatformSvc;
  }

  ngOnInit(): void {
    zxcvbnOptions.setOptions({
      dictionary: {
        ...zxcvbnLanguageCommon.dictionary,
        ...zxcvbnLanguageEn.dictionary
      },
      graphs: zxcvbnLanguageCommon.adjacencyGraphs,
      translations: zxcvbnLanguageEn.translations
    });

    this.ngModel.$validators.passwordStrength = (value) => {
      this.result = zxcvbn(value ?? '');
      return true;
    };
  }
}
