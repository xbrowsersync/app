import { zxcvbn, ZxcvbnOptions } from '@zxcvbn-ts/core';
import { IPromise } from 'angular';
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
  platformSvc: PlatformService;

  ngModel: ng.INgModelController;
  @Input('=passwordStrength') result: any;

  static $inject = ['PlatformService'];
  constructor(PlatformSvc: PlatformService) {
    this.platformSvc = PlatformSvc;
  }

  loadOptions(locale: string): IPromise<any> {
    let languagePackagesImports: any[] = [
      import(/* webpackChunkName: "zxcvbn-language-common" */ '@zxcvbn-ts/language-common')
    ];
    switch (locale.replace(/-.*$/, '')) {
      case 'de':
        languagePackagesImports = [
          ...languagePackagesImports,
          import(/* webpackChunkName: "zxcvbn-language-de" */ '@zxcvbn-ts/language-de')
        ];
        break;
      default:
        languagePackagesImports = [
          ...languagePackagesImports,
          import(/* webpackChunkName: "zxcvbn-language-en" */ '@zxcvbn-ts/language-en')
        ];
    }

    return Promise.all(languagePackagesImports).then((packages) => {
      const [zxcvbnLanguageCommon, zxcvbnLanguageEn] = packages;
      return {
        dictionary: {
          ...zxcvbnLanguageCommon.default.dictionary,
          ...zxcvbnLanguageEn.default.dictionary
        },
        graphs: zxcvbnLanguageCommon.default.adjacencyGraphs,
        translations: zxcvbnLanguageEn.default.translations
      };
    });
  }

  ngOnInit(): void {
    this.platformSvc
      .getCurrentLocale()
      .then((currentLocale) => this.loadOptions(currentLocale))
      .then((options) => ZxcvbnOptions.setOptions(options))
      .then(() => {
        this.ngModel.$validators.passwordStrength = (value) => {
          this.result = zxcvbn(value ?? '');
          return true;
        };
      });
  }
}
