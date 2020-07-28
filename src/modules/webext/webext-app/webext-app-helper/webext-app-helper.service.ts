import { autobind } from 'core-decorators';
import { browser } from 'webextension-polyfill-ts';
import Strings from '../../../../../res/strings/en.json';
import Globals from '../../../shared/global-shared.constants';
import { MessageCommand } from '../../../shared/global-shared.enum';
import LogService from '../../../shared/log/log.service';
import { Sync } from '../../../shared/sync/sync.interface';
import UtilityService from '../../../shared/utility/utility.service';
import WebExtPlatformService from '../../webext-platform/webext-platform.service';

@autobind
export default class WebExtAppHelperService {
  $q: ng.IQService;
  logSvc: LogService;
  platformSvc: WebExtPlatformService;
  utilitySvc: UtilityService;

  static $inject = ['$q', 'LogService', 'PlatformService', 'UtilityService'];
  constructor($q: ng.IQService, LogSvc: LogService, PlatformSvc: WebExtPlatformService, UtilitySvc: UtilityService) {
    this.$q = $q;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  confirmBeforeSyncing(): boolean {
    return true;
  }

  copyTextToClipboard(text: string): ng.IPromise<void> {
    return navigator.clipboard.writeText(text);
  }

  downloadFile(fileName: string, textContents: string, linkId: string): ng.IPromise<string> {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Use provided hyperlink or create new one
    let downloadLink: HTMLAnchorElement;
    if (linkId) {
      downloadLink = document.getElementById(linkId) as HTMLAnchorElement;
    } else {
      downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
    }

    if (!downloadLink) {
      throw new Error('Link element not found.');
    }

    this.logSvc.logInfo(`Downloading file ${fileName}`);

    // Use hyperlink to trigger file download
    const file = new Blob([textContents], { type: 'text/plain' });
    downloadLink.href = URL.createObjectURL(file);
    downloadLink.innerText = fileName;
    downloadLink.download = fileName;
    downloadLink.click();

    if (!linkId) {
      document.body.removeChild(downloadLink);
    }

    // Return message to be displayed
    const message = this.platformSvc.getI18nString(Strings.downloadFile_Success_Message);
    return this.$q.resolve(message);
  }

  getCurrentSync(): ng.IPromise<Sync> {
    return this.platformSvc.sendMessage({
      command: MessageCommand.GetCurrentSync
    });
  }

  getNextScheduledSyncUpdateCheck(): ng.IPromise<string> {
    return browser.alarms.get(Globals.Alarm.Name).then((alarm) => {
      if (!alarm) {
        return '';
      }

      return this.utilitySvc.get24hrTimeFromDate(new Date(alarm.scheduledTime));
    });
  }

  getSyncQueueLength(): ng.IPromise<number> {
    return this.platformSvc.sendMessage({
      command: MessageCommand.GetSyncQueueLength
    });
  }

  openUrl(event?: Event, url?: string): void {
    // Stop event propogation
    event?.preventDefault();

    // Open the target url
    if (url) {
      this.platformSvc.openUrl(url);
    } else if (event?.currentTarget) {
      this.platformSvc.openUrl((event.currentTarget as HTMLLinkElement).href);
    } else {
      this.logSvc.logWarning('Couldn’t open url');
    }
  }

  removePermissions(): ng.IPromise<void> {
    // Remove optional permissions
    return browser.permissions.remove(this.platformSvc.optionalPermissions).then(() => {
      this.logSvc.logInfo('Optional permissions removed');
    });
  }

  requestPermissions(): ng.IPromise<boolean> {
    // Request optional permissions
    return browser.permissions.request(this.platformSvc.optionalPermissions).then((granted) => {
      this.logSvc.logInfo(`Optional permissions ${!granted ? 'not ' : ''}granted`);
      return granted;
    });
  }
}
