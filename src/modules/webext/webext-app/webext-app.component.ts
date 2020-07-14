import { autobind } from 'core-decorators';
import { browser } from 'webextension-polyfill-ts';
import Strings from '../../../../res/strings/en.json';
import AppComponent from '../../app/app.component';
import Globals from '../../shared/global-shared.constants';
import { MessageCommand } from '../../shared/global-shared.enum';
import { StoreKey } from '../../shared/store/store.enum';
import { Sync } from '../../shared/sync/sync.interface';
import WebExtPlatformService from '../webext-platform/webext-platform.service';

@autobind
export default class WebExtAppComponent extends AppComponent {
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
    const message = this.platformSvc.getConstant(Strings.downloadFile_Success_Message);
    return this.$q.resolve(message);
  }

  getNextScheduledSyncUpdateCheck(): ng.IPromise<string> {
    return browser.alarms.get(Globals.Alarm.Name).then((alarm) => {
      if (!alarm) {
        return '';
      }

      return this.utilitySvc.get24hrTimeFromDate(new Date(alarm.scheduledTime));
    });
  }

  init(): ng.IPromise<void> {
    // Run init then check if current page is a bookmark
    return super.init().then(this.setBookmarkStatus);
  }

  permissions_Remove(): ng.IPromise<void> {
    // Remove optional permissions
    return browser.permissions.remove((this.platformSvc as WebExtPlatformService).optionalPermissions).then(() => {
      this.logSvc.logInfo('Optional permissions removed');
    });
  }

  permissions_Request(): ng.IPromise<boolean> {
    // Request optional permissions
    return browser.permissions
      .request((this.platformSvc as WebExtPlatformService).optionalPermissions)
      .then((granted) => {
        this.logSvc.logInfo(`Optional permissions ${!granted ? 'not ' : ''}granted`);
        return granted;
      });
  }

  restoreBookmarksSuccess() {
    // Update current bookmark status before continuing
    return this.setBookmarkStatus().then(super.restoreBookmarksSuccess);
  }

  setBookmarkStatus(isActive?) {
    if (isActive !== undefined) {
      this.bookmark.active = isActive;
      return this.$q.resolve();
    }

    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        return;
      }

      // If current page is a bookmark, actvate bookmark icon
      return this.bookmarkHelperSvc.findCurrentUrlInBookmarks().then((result) => {
        this.bookmark.active = !!result;
      });
    });
  }

  sync_Current(): ng.IPromise<Sync> {
    return (this.platformSvc as WebExtPlatformService).sendMessage({
      command: MessageCommand.GetCurrentSync
    });
  }

  sync_GetQueueLength(): ng.IPromise<number> {
    return (this.platformSvc as WebExtPlatformService).sendMessage({
      command: MessageCommand.GetSyncQueueLength
    });
  }

  syncBookmarksSuccess(loadingTimeout?, bookmarkStatusActive?) {
    return super.syncBookmarksSuccess(loadingTimeout, bookmarkStatusActive).then(() => {
      // Update bookmark icon
      return this.setBookmarkStatus(bookmarkStatusActive);
    });
  }
}
