import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import WebExtAppHelperService from '../../../../webext-app/shared/webext-app-helper/webext-app-helper.service';

@autobind
@Injectable('AppHelperService')
export default class FirefoxAppHelperService extends WebExtAppHelperService {
  getHelpPages(): string[] {
    const pages = [
      this.platformSvc.getI18nString(this.Strings.View.Help.Welcome),
      this.platformSvc.getI18nString(this.Strings.View.Help.BeforeYouBegin),
      this.platformSvc.getI18nString(this.Strings.View.Help.FirstSync),
      this.platformSvc.getI18nString(this.Strings.View.Help.Service),
      this.platformSvc.getI18nString(this.Strings.View.Help.SyncId),
      this.platformSvc.getI18nString(this.Strings.View.Help.ExistingId),
      this.platformSvc.getI18nString(this.Strings.View.Help.Searching),
      this.platformSvc.getI18nString(this.Strings.View.Help.AddingBookmarks),
      this.platformSvc.getI18nString(this.Strings.View.Help.NativeFeatures),
      this.platformSvc.getI18nString(this.Strings.View.Help.BackingUp),
      this.platformSvc.getI18nString(this.Strings.View.Help.Shortcuts),
      this.platformSvc.getI18nString(this.Strings.View.Help.Mobile),
      this.platformSvc.getI18nString(this.Strings.View.Help.FurtherSupport)
    ];

    return pages;
  }
}
