/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-empty */
/* eslint-disable no-plusplus */
/* eslint-disable no-fallthrough */
/* eslint-disable eqeqeq */
/* eslint-disable no-lonely-if */
/* eslint-disable no-shadow */
/* eslint-disable no-param-reassign */
/* eslint-disable prefer-destructuring */
/* eslint-disable consistent-return */
/* eslint-disable default-case */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import './app-main.component.scss';
import angular from 'angular';
import { autobind } from 'core-decorators';
import * as countriesList from 'countries-list';
import DOMPurify from 'dompurify';
import marked from 'marked';
import _ from 'underscore';
import Strings from '../../../../res/strings/en.json';
import { AlertType } from '../../shared/alert/alert.enum';
import AlertService from '../../shared/alert/alert.service';
import { ApiServiceStatus } from '../../shared/api/api.enum';
import { ApiService } from '../../shared/api/api.interface';
import BackupRestoreService from '../../shared/backup-restore/backup-restore.service';
import BookmarkHelperService from '../../shared/bookmark/bookmark-helper/bookmark-helper.service.js';
import { BookmarkChangeType } from '../../shared/bookmark/bookmark.enum';
import {
  AddBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  BookmarkMetadata,
  BookmarkService,
  ModifyBookmarkChangeData,
  RemoveBookmarkChangeData
} from '../../shared/bookmark/bookmark.interface';
import CryptoService from '../../shared/crypto/crypto.service';
import * as Exceptions from '../../shared/exception/exception';
import { ExceptionHandler } from '../../shared/exception/exception.interface';
import Globals from '../../shared/global-shared.constants';
import { MessageCommand } from '../../shared/global-shared.enum';
import { PlatformService } from '../../shared/global-shared.interface';
import LogService from '../../shared/log/log.service';
import NetworkService from '../../shared/network/network.service';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import SyncEngineService from '../../shared/sync/sync-engine/sync-engine.service';
import { SyncType } from '../../shared/sync/sync.enum';
import { Sync } from '../../shared/sync/sync.interface';
import UtilityService from '../../shared/utility/utility.service';
import { WorkingContext } from '../../shared/working/working.enum';
import WorkingService from '../../shared/working/working.service';
import { AppHelperService } from '../app.interface';

@autobind
export default class AppMainComponent {
  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  apiSvc: ApiService;
  appHelperSvc: AppHelperService;
  backupRestoreSvc: BackupRestoreService;
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: BookmarkService;
  cryptoSvc: CryptoService;
  logSvc: LogService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncEngineSvc: SyncEngineService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  ApiServiceStatus = ApiServiceStatus;
  bookmark = {
    active: false,
    addButtonDisabledUntilEditForm: false,
    current: undefined,
    descriptionFieldOriginalHeight: undefined,
    displayUpdateForm: false,
    originalUrl: undefined,
    tagLookahead: undefined,
    tagText: undefined,
    tagTextMeasure: undefined
  };
  bookmarkForm: any;
  globals = Globals;
  help = {
    currentPage: 0,
    pages: undefined
  };
  initialised = true;
  login = {
    displayGetSyncIdPanel: true,
    displayOtherSyncsWarning: false,
    displayNewSyncPanel: true,
    displayPasswordConfirmation: false,
    displaySyncConfirmation: false,
    displayUpdateServiceConfirmation: false,
    displayUpdateServicePanel: false,
    displayUpgradeConfirmation: false,
    passwordComplexity: {},
    passwordConfirmation: undefined,
    showPassword: false,
    upgradeConfirmed: false,
    validatingServiceUrl: false
  };
  restoreForm: any;
  search = {
    batchResultsNum: 10,
    bookmarkTree: undefined,
    cancelGetBookmarksRequest: undefined,
    displayFolderView: false,
    getLookaheadTimeout: undefined,
    getSearchResultsTimeout: undefined,
    lastWord: undefined,
    lookahead: undefined,
    query: undefined,
    queryMeasure: undefined,
    results: undefined,
    resultsDisplayed: 10,
    selectedBookmark: undefined,
    scrollDisplayMoreEnabled: true
  };
  settings = {
    appVersion: undefined,
    backupCompletedMessage: undefined,
    backupFileName: undefined,
    checkForAppUpdates: false,
    darkModeEnabled: false,
    dataToRestore: undefined,
    displayQrPanel: false,
    displayRestoreConfirmation: false,
    displayRestoreForm: false,
    displayRevertConfirmation: false,
    displaySearchBarBeneathResults: false,
    displaySyncBookmarksToolbarConfirmation: false,
    downloadLogCompletedMessage: undefined,
    fileRestoreEnabled: false,
    defaultToFolderView: false,
    getSearchLookaheadDelay: 50,
    getSearchResultsDelay: 250,
    logSize: undefined,
    nextAutoUpdate: undefined,
    readWebsiteDataPermissionsGranted: false,
    restoreCompletedMessage: undefined,
    revertCompleted: false,
    revertConfirmationMessage: undefined,
    revertUnavailable: false,
    savingBackup: false,
    savingLog: false,
    syncBookmarksToolbar: true,
    syncIdCopied: false,
    updatesAvailable: undefined,
    validatingRestoreData: false
  };
  strings = Strings;
  sync = {
    dataSize: undefined,
    dataUsed: undefined,
    enabled: false,
    id: undefined,
    inProgress: false,
    newService: {
      apiVersion: '',
      location: undefined,
      maxSyncSize: 0,
      message: '',
      status: undefined,
      url: undefined
    },
    password: '',
    service: {
      apiVersion: '',
      location: undefined,
      maxSyncSize: 0,
      message: '',
      newServiceUrl: '',
      status: undefined,
      url: undefined
    }
  };
  syncForm: any;
  view = {
    current: undefined,
    views: {
      login: 1,
      search: 2,
      bookmark: 3,
      settings: 4,
      help: 5,
      support: 6,
      updated: 7,
      permissions: 8,
      loading: 9,
      scan: 10
    }
  };
  vm: AppMainComponent = this;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$timeout',
    'AlertService',
    'ApiService',
    'AppHelperService',
    'BackupRestoreService',
    'BookmarkHelperService',
    'BookmarkService',
    'CryptoService',
    'LogService',
    'NetworkService',
    'PlatformService',
    'StoreService',
    'SyncEngineService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ng.IExceptionHandlerService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    ApiSvc: ApiService,
    AppHelperSvc: AppHelperService,
    BackupRestoreSvc: BackupRestoreService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSvc: BookmarkService,
    CryptoSvc: CryptoService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$q = $q;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.apiSvc = ApiSvc;
    this.appHelperSvc = AppHelperSvc;
    this.backupRestoreSvc = BackupRestoreSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.cryptoSvc = CryptoSvc;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncEngineSvc = SyncEngineSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    this.bookmarkForm = {};
    this.restoreForm = {};
    this.syncForm = {};
  }

  backupRestoreForm_Backup_Click() {
    this.settings.savingBackup = true;

    return this.downloadBackupFile().finally(() => {
      this.$timeout(() => {
        this.settings.savingBackup = false;

        // Focus on done button
        if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
          (document.querySelector('.btn-done') as HTMLButtonElement).focus();
        }
      });
    });
  }

  backupRestoreForm_BackupFile_Change() {
    const fileInput = document.getElementById('backupFile') as HTMLInputElement;

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      this.settings.backupFileName = file.name;
      const reader = new FileReader();

      reader.onload = ((data) => {
        return (event) => {
          this.$timeout(() => {
            this.settings.dataToRestore = event.target.result;

            // Reset validation interface
            this.resetBackupRestoreFormValidity();
            this.settings.validatingRestoreData = true;

            // Trigger restore data validation
            this.$timeout(() => {
              this.validateBackupData();
              this.settings.validatingRestoreData = false;
            });
          });
        };
      })(file);

      // Read the backup file data
      reader.readAsText(file);
    }
  }

  backupRestoreForm_ConfirmRestore_Click() {
    if (!this.settings.dataToRestore) {
      // Display alert
      this.alertSvc.setCurrentAlert({
        message: this.platformSvc.getI18nString(Strings.error_NoDataToRestore_Message),
        title: this.platformSvc.getI18nString(Strings.error_NoDataToRestore_Title),
        type: AlertType.Error
      });
      return;
    }

    // Hide restore confirmation
    this.settings.displayRestoreConfirmation = false;
    this.settings.displayRestoreForm = true;

    // Start restore
    return this.restoreData(JSON.parse(this.settings.dataToRestore));
  }

  resetBackupRestoreFormValidity() {
    this.restoreForm.dataToRestore.$setValidity('InvalidData', true);
  }

  backupRestoreForm_DisplayRestoreForm_Click() {
    // Display restore form
    this.settings.backupFileName = null;
    this.settings.restoreCompletedMessage = null;
    this.settings.displayRestoreConfirmation = false;
    this.settings.dataToRestore = '';
    this.settings.displayRestoreForm = true;
    (document.querySelector('#backupFile') as HTMLInputElement).value = null;
    this.restoreForm.dataToRestore.$setValidity('InvalidData', true);

    // Focus on restore textarea
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        (document.querySelector('#restoreForm textarea') as HTMLTextAreaElement).select();
      });
    }
  }

  backupRestoreForm_Restore_Click() {
    if (!this.validateBackupData()) {
      return;
    }

    // Display restore confirmation
    this.settings.displayRestoreForm = false;
    this.settings.displayRestoreConfirmation = true;

    // Focus on confirm button
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        (document.querySelector('.btn-confirm-restore') as HTMLButtonElement).focus();
      });
    }
  }

  backupRestoreForm_SelectBackupFile_Click() {
    // Open select file dialog
    (document.querySelector('#backupFile') as HTMLInputElement).click();
  }

  backupRestoreForm_Revert_Click() {
    // Retrieve install backup from local storage
    return this.storeSvc.get<any>(StoreKey.InstallBackup).then((installBackup) => {
      this.$timeout(() => {
        if (!installBackup) {
          this.settings.revertUnavailable = true;
          return;
        }

        const installBackupObj = JSON.parse(installBackup);
        if (installBackupObj?.date && installBackupObj?.bookmarks) {
          const date = new Date(installBackupObj.date);
          const confirmationMessage = this.platformSvc.getI18nString(
            Strings.settings_BackupRestore_Revert_Confirmation_Message
          );
          this.settings.revertConfirmationMessage = confirmationMessage.replace('{date}', date.toLocaleDateString());
          this.settings.displayRevertConfirmation = true;
        } else {
          this.settings.revertUnavailable = true;
        }
      });
    });
  }

  backupRestoreForm_ConfirmRevert_Click() {
    // Display loading overlay
    this.workingSvc.show(WorkingContext.Reverting);

    // Disable sync and restore native bookmarks to installation state
    return this.$q
      .all([this.storeSvc.get<any>(StoreKey.InstallBackup), this.disableSync()])
      .then((response) => {
        const installBackupObj = JSON.parse(response[0]);
        const installBackupDate = new Date(installBackupObj.date);
        const bookmarksToRestore = installBackupObj.bookmarks;
        this.logSvc.logInfo(`Reverting data to installation state from ${installBackupDate.toISOString()}`);

        // Start restore
        return this.queueSync(
          {
            bookmarks: bookmarksToRestore,
            type: SyncType.Local
          },
          MessageCommand.RestoreBookmarks
        );
      })
      .then(() => {
        this.$timeout(() => {
          // Display completed message
          this.settings.displayRevertConfirmation = false;
          this.settings.revertCompleted = true;
        });
      })
      .finally(this.workingSvc.hide);
  }

  backupRestoreForm_CancelRevert_Click() {
    this.settings.displayRevertConfirmation = false;
    this.settings.revertCompleted = false;
    this.settings.revertConfirmationMessage = null;
    this.settings.revertUnavailable = false;
  }

  bookmarkForm_BookmarkDescription_Change() {
    // Limit the bookmark description to the max length
    this.$timeout(() => {
      this.bookmark.current.description = this.utilitySvc.trimToNearestWord(
        this.bookmark.current.description,
        Globals.Bookmarks.DescriptionMaxLength
      );
    });
  }

  bookmarkForm_BookmarkTags_Change(event?) {
    // Get tag text from event data if provided
    if (event?.data) {
      this.bookmark.tagText = event.data;
    }

    if (!this.bookmark.tagText?.trim()) {
      return;
    }

    // Get last word of tag text
    const lastWord = _.last<string>(this.bookmark.tagText.split(',')).trimLeft();

    // Display lookahead if word length exceeds minimum
    if (lastWord?.length > Globals.LookaheadMinChars) {
      // Get tags lookahead
      return this.bookmarkHelperSvc
        .getLookahead(lastWord.toLowerCase(), null, true, this.bookmark.current.tags)
        .then((results) => {
          if (!results) {
            this.bookmark.tagLookahead = null;
            return;
          }

          let lookahead = results[0];
          const word = results[1];

          if (lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
            // Set lookahead after trimming word
            lookahead = lookahead ? lookahead.substring(word.length) : undefined;
            this.bookmark.tagTextMeasure = this.bookmark.tagText.replace(/\s/g, '&nbsp;');
            this.bookmark.tagLookahead = lookahead.replace(/\s/g, '&nbsp;');
          }
        });
    }
    this.bookmark.tagLookahead = null;
  }

  bookmarkForm_BookmarkTags_ClearAll_Click() {
    this.bookmark.current.tags = [];
    this.bookmarkForm.$setDirty();
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      (document.querySelector('input[name="bookmarkTags"]') as HTMLInputElement).focus();
    }
  }

  bookmarkForm_BookmarkTags_Lookahead_Click() {
    this.bookmark.tagText += this.bookmark.tagLookahead.replace(/&nbsp;/g, ' ');
    this.bookmarkForm_CreateTags_Click();
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      (document.querySelector('input[name="bookmarkTags"]') as HTMLInputElement).focus();
    }
  }

  bookmarkForm_BookmarkTags_KeyDown(event) {
    switch (true) {
      // If user pressed Enter
      case event.keyCode === 13:
        // Add new tags
        event.preventDefault();
        this.bookmarkForm_CreateTags_Click();
        break;
      // If user pressed tab or right arrow key and lookahead present
      case (event.keyCode === 9 || event.keyCode === 39) && this.bookmark.tagLookahead:
        // Add lookahead to tag text
        event.preventDefault();
        this.bookmark.tagText += this.bookmark.tagLookahead.replace(/&nbsp;/g, ' ');
        this.bookmarkForm_BookmarkTags_Change();
        if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
          (document.querySelector('input[name="bookmarkTags"]') as HTMLInputElement).focus();
        }
        break;
    }
  }

  bookmarkForm_BookmarkUrl_Change() {
    // Reset form if field is invalid
    if (this.bookmarkForm.bookmarkUrl.$invalid) {
      this.bookmarkForm.bookmarkUrl.$setValidity('Exists', true);
    }
  }

  bookmarkForm_CreateBookmark_Click() {
    // Add tags if tag text present
    if (this.bookmark.tagText?.length > 0) {
      this.bookmarkForm_CreateTags_Click();
    }

    // Clone current bookmark object
    const bookmarkToAdd = this.bookmarkHelperSvc.cleanBookmark(this.bookmark.current);

    // Check for protocol
    if (!new RegExp(Globals.URL.ProtocolRegex).test(bookmarkToAdd.url ?? '')) {
      bookmarkToAdd.url = `https://${bookmarkToAdd.url}`;
    }

    // Validate the new bookmark
    return this.bookmarkForm_ValidateBookmark(bookmarkToAdd)
      .then((isValid) => {
        if (!isValid) {
          // Bookmark URL exists, display validation error
          this.bookmarkForm.bookmarkUrl.$setValidity('Exists', false);
          return;
        }

        // Display loading overlay
        this.workingSvc.show();

        // Create change info and sync changes
        const data: AddBookmarkChangeData = {
          metadata: bookmarkToAdd
        };
        const changeInfo: BookmarkChange = {
          changeData: data,
          type: BookmarkChangeType.Add
        };
        return this.queueSync({
          changeInfo,
          type: SyncType.LocalAndRemote
        }).then(() => {
          // Set bookmark active status if current bookmark is current page
          return this.platformSvc.getCurrentUrl().then((currentUrl) => {
            // Update bookmark status and switch view
            const bookmarkStatusActive = currentUrl.toUpperCase() === bookmarkToAdd.url.toUpperCase();
            return this.syncBookmarksSuccess(bookmarkStatusActive);
          });
        });
      })
      .catch((err) => {
        return this.checkIfSyncDataRefreshedOnError(err).then(() => {
          throw err;
        });
      });
  }

  bookmarkForm_CreateTags_Click() {
    // Clean and sort tags and add them to tag array
    const newTags = this.utilitySvc.getTagArrayFromText(this.bookmark.tagText);
    this.bookmark.current.tags = _.sortBy(_.union(newTags, this.bookmark.current.tags), (tag) => {
      return tag;
    });

    this.bookmarkForm.$setDirty();
    this.bookmark.tagText = '';
    this.bookmark.tagLookahead = '';
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      (document.querySelector('input[name="bookmarkTags"]') as HTMLInputElement).focus();
    }
  }

  bookmarkForm_DeleteBookmark_Click() {
    const bookmarkToRemove = this.bookmark.current;

    // Display loading overlay
    this.workingSvc.show();

    // Create change info and sync changes
    const data: RemoveBookmarkChangeData = {
      id: bookmarkToRemove.id
    };
    const changeInfo: BookmarkChange = {
      changeData: data,
      type: BookmarkChangeType.Remove
    };
    return this.queueSync({
      changeInfo,
      type: SyncType.LocalAndRemote
    })
      .then(() => {
        // Set bookmark active status if current bookmark is current page
        return this.platformSvc.getCurrentUrl();
      })
      .then((currentUrl) => {
        // Update bookmark status and switch view
        const bookmarkStatusActive =
          currentUrl.toUpperCase() === this.bookmark.originalUrl.toUpperCase() ? false : undefined;
        return this.syncBookmarksSuccess(bookmarkStatusActive);
      })
      .catch((err) => {
        return this.checkIfSyncDataRefreshedOnError(err).then(() => {
          throw err;
        });
      });
  }

  bookmarkForm_GetMetadata_Click() {
    return this.getMetadataForUrl(this.bookmark.current.url).then((metadata) => {
      if (!metadata?.title && !metadata?.description && !metadata?.tags) {
        return;
      }

      // Update bookmark metadata and set url field as pristine
      this.bookmark.current.title = metadata.title ?? this.bookmark.current.title;
      this.bookmark.current.description = metadata.description ?? this.bookmark.current.description;
      this.bookmark.current.tags = metadata.tags ?? this.bookmark.current.tags;
      this.bookmarkForm.bookmarkUrl.$setPristine();

      // Display alert
      this.alertSvc.setCurrentAlert({
        message: this.platformSvc.getI18nString(Strings.getMetadata_Success_Message),
        type: AlertType.Information
      });
    });
  }

  bookmarkForm_RemoveTag_Click(tag) {
    this.bookmark.current.tags = _.without(this.bookmark.current.tags, tag);
    this.bookmarkForm.$setDirty();
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      (document.querySelector('#bookmarkForm input[name="bookmarkTags"]') as HTMLInputElement).focus();
    }
  }

  bookmarkForm_UpdateBookmark_Click() {
    // Add tags if tag text present
    if (this.bookmark.tagText?.length > 0) {
      this.bookmarkForm_CreateTags_Click();
    }

    // Clone current bookmark object
    const bookmarkToModify = this.bookmarkHelperSvc.cleanBookmark(this.bookmark.current);

    // Check for protocol
    if (!new RegExp(Globals.URL.ProtocolRegex).test(bookmarkToModify.url ?? '')) {
      bookmarkToModify.url = `https://${bookmarkToModify.url}`;
    }

    // Validate the new bookmark
    return this.bookmarkForm_ValidateBookmark(bookmarkToModify, this.bookmark.originalUrl)
      .then((isValid) => {
        if (!isValid) {
          // Bookmark URL exists, display validation error
          this.bookmarkForm.bookmarkUrl.$setValidity('Exists', false);
          return;
        }

        // Display loading overlay
        this.workingSvc.show();

        // Create change info and sync changes
        const data: ModifyBookmarkChangeData = {
          bookmark: bookmarkToModify
        };
        const changeInfo: BookmarkChange = {
          changeData: data,
          type: BookmarkChangeType.Modify
        };
        return this.queueSync({
          changeInfo,
          type: SyncType.LocalAndRemote
        }).then(() => {
          // Set bookmark active status if current bookmark is current page
          return this.platformSvc.getCurrentUrl().then((currentUrl) => {
            // Update bookmark status and switch view
            const bookmarkStatusActive =
              currentUrl.toUpperCase() === bookmarkToModify.url.toUpperCase() ? true : undefined;
            return this.syncBookmarksSuccess(bookmarkStatusActive);
          });
        });
      })
      .catch((err) => {
        return this.checkIfSyncDataRefreshedOnError(err).then(() => {
          throw err;
        });
      });
  }

  bookmarkForm_ValidateBookmark(bookmarkToValidate, originalUrl?) {
    // Skip validation if URL is unmodified
    if (bookmarkToValidate.url.toUpperCase() === originalUrl?.toUpperCase()) {
      return this.$q.resolve(true);
    }

    // Check if bookmark url already exists
    return this.bookmarkHelperSvc
      .searchBookmarks({
        url: bookmarkToValidate.url
      })
      .then((results) => {
        // Filter search results for bookmarks wuth matching urls
        const duplicateBookmarks = results.filter((b) => {
          return b.url.toUpperCase() === bookmarkToValidate.url.toUpperCase();
        });

        return duplicateBookmarks.length === 0;
      });
  }

  bookmarkPanel_Close_Click() {
    return this.displayMainView();
  }

  changeView(view, viewData?) {
    let initNewView;

    // Hide loading panel
    this.workingSvc.hide();

    // Initialise new view
    switch (view) {
      case this.view.views.bookmark:
        initNewView = this.init_bookmarkView(viewData);
        break;
      case this.view.views.search:
        initNewView = this.init_searchView();
        break;
      case this.view.views.settings:
        initNewView = this.init_settingsView();
        break;
      case this.view.views.help:
      case this.view.views.permissions:
      case this.view.views.support:
      case this.view.views.updated:
        initNewView = this.init_infoView();
        break;
      case this.view.views.loading:
        initNewView = this.init_loadingView();
        break;
      case this.view.views.login:
        initNewView = this.init_loginView();
        break;
      default:
        initNewView = this.$q.resolve();
    }

    return initNewView.finally(() => {
      // Display new view
      this.view.current = view;

      // Attach events to new tab links
      this.$timeout(this.setNewTabLinks, 150);
    });
  }

  checkIfSyncDataRefreshedOnError(err) {
    // If data out of sync display main view
    return (this.syncEngineSvc.checkIfRefreshSyncedDataOnError(err) ? this.displayMainView() : this.$q.resolve()).then(
      () => {
        return err;
      }
    );
  }

  closeQrPanel(): void {
    this.settings.displayQrPanel = false;
  }

  getPageMetadataAsBookmarkMetadata(metadata: any): BookmarkMetadata {
    if (!metadata) {
      return;
    }

    return {
      description: this.utilitySvc.trimToNearestWord(metadata.description, Globals.Bookmarks.DescriptionMaxLength),
      tags: this.utilitySvc.getTagArrayFromText(metadata.tags),
      title: metadata.title,
      url: metadata.url
    };
  }

  disableSync() {
    return this.platformSvc.disableSync().then(() => {
      this.sync.dataSize = null;
      this.sync.dataUsed = null;
      this.sync.enabled = false;
      this.sync.password = '';
      this.login.passwordComplexity = {};
    });
  }

  displayDefaultSearchState() {
    // Clear search and results
    this.search.query = null;
    this.search.queryMeasure = null;
    this.search.lookahead = null;
    this.search.results = null;

    if (this.search.displayFolderView) {
      // Initialise bookmark tree
      this.search.bookmarkTree = null;
      this.bookmarkHelperSvc.getCachedBookmarks().then((results) => {
        this.$timeout(() => {
          // Display bookmark tree view, sort containers
          this.search.bookmarkTree = results.sort((a, b) => {
            return b.title.localeCompare(a.title);
          });
        });
      });
    }

    return this.$q.resolve();
  }

  displayMainView() {
    return this.storeSvc
      .get([StoreKey.DisplayHelp, StoreKey.DisplayPermissions, StoreKey.DisplayUpdated, StoreKey.SyncEnabled])
      .then((storeContent) => {
        switch (true) {
          case storeContent.displayUpdated:
            return this.changeView(this.view.views.updated);
          case storeContent.displayPermissions:
            return this.changeView(this.view.views.permissions);
          case storeContent.displayHelp:
            return this.helpPanel_ShowHelp();
          case storeContent.syncEnabled:
            return this.changeView(this.view.views.search);
          default:
            return this.changeView(this.view.views.login);
        }
      });
  }

  displayQrPanel() {
    this.settings.displayQrPanel = true;
  }

  downloadBackupFile() {
    // Get data for backup
    return this.$q
      .all([
        this.getBookmarksForExport(),
        this.storeSvc.get([StoreKey.SyncEnabled, StoreKey.SyncId]),
        this.utilitySvc.getServiceUrl()
      ])
      .then((data) => {
        const bookmarksData = data[0];
        const syncEnabled = data[1].syncEnabled;
        const syncId = data[1].syncId;
        const serviceUrl = data[2];
        const backupData = this.backupRestoreSvc.createBackupData(
          bookmarksData,
          syncEnabled ? syncId : null,
          syncEnabled ? serviceUrl : null
        );

        // Beautify json and download data
        const beautifiedJson = JSON.stringify(backupData, null, 2);
        return this.appHelperSvc.downloadFile(this.backupRestoreSvc.getBackupFileName(), beautifiedJson, 'backupLink');
      })
      .then((message) => {
        // Display message
        this.settings.backupCompletedMessage = message;
      });
  }

  downloadLogFile() {
    // Get cached message log
    return this.storeSvc
      .get<string[]>(StoreKey.TraceLog)
      .then((debugMessageLog) => {
        // Trigger download
        return this.appHelperSvc.downloadFile(
          this.getLogFileName(),
          debugMessageLog.join('\r\n'),
          'downloadLogFileLink'
        );
      })
      .then((message) => {
        // Display message
        this.settings.downloadLogCompletedMessage = message;
      });
  }

  getBookmarksForExport() {
    const cleanRecursive = (bookmarks: Bookmark[]): Bookmark[] => {
      return bookmarks.map((bookmark) => {
        const cleanedBookmark = this.bookmarkHelperSvc.cleanBookmark(bookmark);
        if (_.isArray(cleanedBookmark.children)) {
          cleanedBookmark.children = cleanRecursive(cleanedBookmark.children);
        }
        return cleanedBookmark;
      });
    };

    return this.storeSvc
      .get<boolean>(StoreKey.SyncEnabled)
      .then((syncEnabled) => {
        // If sync is not enabled, export native bookmarks
        return syncEnabled
          ? this.bookmarkHelperSvc.getCachedBookmarks()
          : this.bookmarkSvc.getNativeBookmarksAsBookmarks();
      })
      .then((bookmarks) => {
        // Clean bookmarks for export
        return cleanRecursive(this.bookmarkHelperSvc.removeEmptyContainers(bookmarks));
      });
  }

  getCountryNameFrom2LetterISOCode(isoCode) {
    if (!isoCode) {
      return;
    }

    const country = countriesList.countries[isoCode];
    if (!country) {
      this.logSvc.logWarning(`No country found matching ISO code: ${isoCode}`);
    }
    return country.name;
  }

  getLogFileName() {
    const fileName = `xbs_log_${this.utilitySvc.getDateTimeString(new Date())}.txt`;
    return fileName;
  }

  getMetadataForCurrentPage() {
    return this.platformSvc.getPageMetadata(true).then(this.getPageMetadataAsBookmarkMetadata);
  }

  getMetadataForUrl(url) {
    if (!url) {
      return this.$q.resolve(null);
    }

    return this.platformSvc.getPageMetadata(true, url).then(this.getPageMetadataAsBookmarkMetadata);
  }

  getServiceStatusTextFromStatusCode(statusCode) {
    if (statusCode == null) {
      return;
    }

    switch (statusCode) {
      case ApiServiceStatus.NoNewSyncs:
        return this.platformSvc.getI18nString(Strings.settings_Service_Status_NoNewSyncs);
      case ApiServiceStatus.Offline:
        return this.platformSvc.getI18nString(Strings.settings_Service_Status_Offline);
      case ApiServiceStatus.Online:
        return this.platformSvc.getI18nString(Strings.settings_Service_Status_Online);
      case ApiServiceStatus.Error:
      default:
        return this.platformSvc.getI18nString(Strings.settings_Service_Status_Error);
    }
  }

  init() {
    // Get cached prefs from storage
    return this.$q
      .all([
        this.storeSvc.get([
          StoreKey.DarkModeEnabled,
          StoreKey.DisplaySearchBarBeneathResults,
          StoreKey.DefaultToFolderView,
          StoreKey.SyncEnabled,
          StoreKey.SyncId
        ]),
        this.utilitySvc.getServiceUrl()
      ])
      .then((cachedData) => {
        // Set view model values
        this.settings.darkModeEnabled = !!cachedData[0].darkModeEnabled;
        this.settings.displaySearchBarBeneathResults = !!cachedData[0].displaySearchBarBeneathResults;
        this.settings.defaultToFolderView = !!cachedData[0].defaultToFolderView;
        this.sync.enabled = !!cachedData[0].syncEnabled;
        this.sync.id = cachedData[0].syncId;
        this.sync.service.url = cachedData[1];

        // Check if a sync is currently in progress
        return this.appHelperSvc.getCurrentSync().then((currentSync) => {
          if (currentSync) {
            this.logSvc.logInfo('Waiting for syncs to finish...');

            // Display loading panel
            return this.changeView(this.view.views.loading)
              .then(this.waitForSyncsToFinish)
              .then(() => {
                return this.storeSvc.get<boolean>(StoreKey.SyncEnabled);
              })
              .then((syncEnabled) => {
                // Check that user didn't cancel sync
                this.sync.enabled = syncEnabled;
                if (this.sync.enabled) {
                  this.logSvc.logInfo('Syncs finished, resuming');
                  return this.syncBookmarksSuccess();
                }
              });
          }

          // Return here if view has already been set
          if (this.view.current) {
            return;
          }

          // Set initial view
          return this.displayMainView();
        });
      })
      .catch((err) => {
        this.displayMainView().then(() => {
          throw err;
        });
      });
  }

  init_bookmarkView(bookmark) {
    this.bookmark.addButtonDisabledUntilEditForm = false;
    this.bookmark.current = null;
    this.bookmark.displayUpdateForm = false;
    this.bookmark.originalUrl = null;
    this.bookmark.tagLookahead = null;
    this.bookmark.tagText = null;
    this.bookmark.tagTextMeasure = null;

    return this.$q((resolve) => {
      // If bookmark to update provided, set to current and return
      if (bookmark) {
        this.bookmark.displayUpdateForm = true;
        return resolve(bookmark);
      }

      // Check if current url is a bookmark
      return this.bookmarkHelperSvc.findCurrentUrlInBookmarks().then((existingBookmark) => {
        if (existingBookmark) {
          // Display update bookmark form and return
          this.bookmark.displayUpdateForm = true;
          return resolve(existingBookmark);
        }

        resolve();
      });
    })
      .then((bookmarkToUpdate: any) => {
        if (bookmarkToUpdate) {
          // Remove search score and set current bookmark to result
          delete bookmarkToUpdate.score;
          this.bookmark.current = bookmarkToUpdate;
          this.bookmark.originalUrl = bookmarkToUpdate.url;
          return;
        }

        // Set default bookmark form values
        this.bookmark.current = { url: 'https://' };
        this.bookmark.originalUrl = this.bookmark.current.url;

        // Get current page metadata as bookmark
        this.getMetadataForCurrentPage()
          .then((currentPageMetadata) => {
            if (currentPageMetadata) {
              this.bookmark.current = currentPageMetadata;
              this.bookmark.originalUrl = currentPageMetadata.url;
            }
          })
          .catch(this.$exceptionHandler);
      })
      .then(() => {
        this.$timeout(() => {
          // Reset form
          this.bookmarkForm.$setPristine();
          this.bookmarkForm.$setUntouched();

          if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
            // Set initial focus
            const element = document.querySelector('.focused') as HTMLInputElement;
            if (element.select) {
              element.select();
            } else {
              element.focus();
            }
          }
        }, 150);
      })
      .catch((err) => {
        if (err.url) {
          // Set bookmark url
          this.bookmark.current = {
            url: err.url
          } as BookmarkMetadata;
        }

        throw err;
      });
  }

  init_infoView() {
    this.$timeout(() => {
      // Focus on button
      if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
        const element = document.querySelector('.focused') as HTMLInputElement;
        if (element) {
          element.focus();
        }
      }
    }, 150);

    return this.$q.resolve();
  }

  init_loadingView() {
    this.workingSvc.show();
    return this.$q.resolve();
  }

  init_loginView() {
    this.login.displayOtherSyncsWarning = false;
    this.login.displayPasswordConfirmation = false;
    this.login.displaySyncConfirmation = false;
    this.login.displayUpdateServiceConfirmation = false;
    this.login.displayUpdateServicePanel = false;
    this.login.displayUpgradeConfirmation = false;
    this.login.passwordComplexity = {};
    this.login.passwordConfirmation = null;
    this.login.showPassword = false;
    this.login.upgradeConfirmed = false;
    this.login.validatingServiceUrl = false;
    this.sync.password = '';

    // Validate sync id if present
    this.$timeout(() => {
      this.syncForm_SyncId_Change();
    }, 150);

    return this.storeSvc.get<boolean>(StoreKey.DisplayOtherSyncsWarning).then((displayOtherSyncsWarning) => {
      if (this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
        // Set displayed panels for mobile platform
        this.login.displayGetSyncIdPanel = !this.sync.id;
        this.login.displayNewSyncPanel = false;
      } else {
        // Set displayed panels for browsers
        this.login.displayNewSyncPanel = !this.sync.id;

        // If not synced before, display warning to disable other sync tools
        if (displayOtherSyncsWarning == null || displayOtherSyncsWarning === true) {
          this.login.displayOtherSyncsWarning = true;

          // Focus on first button
          if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
            this.$timeout(() => {
              (document.querySelector('.otherSyncsWarning .buttons > button') as HTMLButtonElement).focus();
            }, 150);
          }
        } else {
          // Focus on password field
          if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
            this.$timeout(() => {
              (document.querySelector('.active-login-form  input[name="txtPassword"]') as HTMLInputElement).focus();
            }, 150);
          }
        }
      }

      // Refresh service info
      this.refreshServiceStatus();
    });
  }

  init_searchView() {
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        // Focus on search box
        (document.querySelector('input[name=txtSearch]') as HTMLInputElement).focus();
      }, 150);
    }

    // Reset search view
    this.search.displayFolderView = this.settings.defaultToFolderView;
    this.search.bookmarkTree = null;
    this.search.selectedBookmark = null;
    return this.displayDefaultSearchState();
  }

  init_settingsView() {
    this.settings.appVersion = undefined;
    this.settings.displayQrPanel = false;
    this.settings.displayRestoreConfirmation = false;
    this.settings.displayRestoreForm = false;
    this.settings.displayRevertConfirmation = false;
    this.settings.displaySyncBookmarksToolbarConfirmation = false;
    this.settings.backupFileName = null;
    this.settings.backupCompletedMessage = null;
    this.settings.downloadLogCompletedMessage = null;
    this.settings.readWebsiteDataPermissionsGranted = false;
    this.settings.restoreCompletedMessage = null;
    this.settings.revertCompleted = false;
    this.settings.revertConfirmationMessage = undefined;
    this.settings.revertUnavailable = false;
    this.settings.dataToRestore = '';
    this.settings.savingBackup = false;
    this.settings.savingLog = false;
    this.settings.validatingRestoreData = false;
    this.settings.updatesAvailable = undefined;
    this.settings.nextAutoUpdate = undefined;

    // Get current service url and sync bookmarks toolbar setting from cache
    return this.$q
      .all([
        this.bookmarkHelperSvc.getSyncBookmarksToolbar(),
        this.storeSvc.get([StoreKey.CheckForAppUpdates, StoreKey.TraceLog]),
        this.platformSvc.getAppVersion(),
        this.platformSvc.checkOptionalNativePermissions()
      ])
      .then((data) => {
        const syncBookmarksToolbar = data[0];
        const checkForAppUpdates = data[1].checkForAppUpdates;
        const traceLog = data[1].traceLog;
        const appVersion = data[2];
        const readWebsiteDataPermissionsGranted = data[3];

        this.settings.appVersion = appVersion;
        this.settings.checkForAppUpdates = checkForAppUpdates;
        this.settings.syncBookmarksToolbar = syncBookmarksToolbar;
        this.settings.readWebsiteDataPermissionsGranted = readWebsiteDataPermissionsGranted;
        this.settings.logSize = new TextEncoder().encode(traceLog.join()).length;

        this.$timeout(() => {
          // Check for available sync updates on non-mobile platforms
          if (this.sync.enabled && !this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
            this.$q
              .all([this.syncEngineSvc.checkForUpdates(), this.appHelperSvc.getNextScheduledSyncUpdateCheck()])
              .then((data) => {
                if (data[0]) {
                  this.settings.updatesAvailable = true;
                  this.settings.nextAutoUpdate = data[1];
                } else {
                  this.settings.updatesAvailable = false;
                }
              })
              .catch((err) => {
                // Swallow error if sync failed due to network connection
                if (
                  this.networkSvc.isNetworkConnectionError(err) ||
                  err instanceof Exceptions.InvalidServiceException ||
                  err instanceof Exceptions.ServiceOfflineException
                ) {
                  return;
                }

                throw err;
              });
          }

          // Set backup file change event for mobile platforms
          if (this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
            document
              .getElementById('backupFile')
              .addEventListener('change', this.backupRestoreForm_BackupFile_Change, false);
          }

          // Update service status and display info
          this.refreshServiceStatus().then(this.refreshSyncDataUsageMeter);
        }, 150);
      });
  }

  issuesPanel_ClearLog_Click() {
    // Clear trace log
    return this.storeSvc.set(StoreKey.TraceLog).then(() => {
      this.$timeout(() => {
        this.settings.logSize = 0;
      });
    });
  }

  issuesPanel_DownloadLogFile_Click() {
    this.settings.savingLog = true;

    return this.downloadLogFile().finally(() => {
      this.$timeout(() => {
        this.settings.savingLog = false;

        // Focus on done button
        if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
          (document.querySelector('.btn-done') as HTMLButtonElement).focus();
        }
      });
    });
  }

  helpPanel_ShowHelp() {
    this.storeSvc.set(StoreKey.DisplayHelp, false);
    this.changeView(this.view.views.help);
  }

  permissions_Revoke_Click() {
    return this.appHelperSvc.removePermissions().then(() => {
      this.settings.readWebsiteDataPermissionsGranted = false;
    });
  }

  permissions_Request_Click() {
    return this.appHelperSvc.requestPermissions().then((granted) => {
      this.settings.readWebsiteDataPermissionsGranted = granted;
    });
  }

  queueSync(sync: Sync, command = MessageCommand.SyncBookmarks): ng.IPromise<any> {
    return this.platformSvc
      .queueSync(sync, command)
      .catch((err) => {
        // Swallow error if sync was processed but not committed (offline)
        if (err instanceof Exceptions.SyncUncommittedException) {
          this.$timeout(() => {
            this.$exceptionHandler(err);
          }, 150);
          return;
        }

        throw err;
      })
      .finally(this.workingSvc.hide);
  }

  refreshServiceStatus(serviceObj?, serviceInfo?) {
    serviceObj = serviceObj ?? this.sync.service;

    // Clear current status
    serviceObj.status = null;

    // Retrieve service info
    return (serviceInfo ? this.$q.resolve(serviceInfo) : this.apiSvc.checkServiceStatus())
      .then((response) => {
        if (!response) {
          return;
        }

        // Render markdown and add link classes to service message
        let message = response.message ? marked(response.message) : '';
        if (message) {
          const messageDom = new DOMParser().parseFromString(message, 'text/html');
          _.each(messageDom.querySelectorAll('a'), (hyperlink) => {
            hyperlink.className = 'new-tab';
          });
          message = DOMPurify.sanitize(messageDom.body.firstElementChild.innerHTML);
          this.$timeout(this.setNewTabLinks);
        }

        serviceObj.apiVersion = response.version;
        serviceObj.location = response.location;
        serviceObj.maxSyncSize = response.maxSyncSize / 1024;
        serviceObj.message = message;
        serviceObj.status = response.status;
      })
      .catch((err) => {
        if (err instanceof Exceptions.ServiceOfflineException) {
          serviceObj.status = ApiServiceStatus.Offline;
        } else {
          serviceObj.status = ApiServiceStatus.Error;
        }
      });
  }

  refreshSyncDataUsageMeter() {
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      // Return if not synced
      if (!syncEnabled) {
        return;
      }

      // Get  bookmarks sync size and calculate sync data percentage used
      return this.bookmarkHelperSvc.getSyncSize().then((bookmarksSyncSize) => {
        this.$timeout(() => {
          this.sync.dataSize = bookmarksSyncSize / 1024;
          this.sync.dataUsed = Math.ceil((this.sync.dataSize / this.sync.service.maxSyncSize) * 150);
        });
      });
    });
  }

  restoreBookmarksSuccess() {
    // Refresh data usage
    return this.refreshSyncDataUsageMeter().then(() => {
      this.settings.displayRestoreForm = false;
      this.settings.dataToRestore = '';
      this.settings.restoreCompletedMessage = this.platformSvc.getI18nString(
        Strings.settings_BackupRestore_RestoreSuccess_Message
      );

      if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
        this.$timeout(() => {
          (document.querySelector('.btn-done') as HTMLButtonElement).focus();
        });
      } else {
        // Refresh search results
        this.search.query = null;
        this.search.queryMeasure = null;
        this.search.lookahead = null;
        return this.searchBookmarks();
      }
    });
  }

  restoreData(backupData) {
    let bookmarksToRestore;
    let serviceUrl;
    let syncId;
    let syncEnabled;

    this.logSvc.logInfo('Restoring data');

    if (backupData.xbrowsersync) {
      // Get data to restore from v1.5.0 backup
      const data = backupData.xbrowsersync.data;
      const sync = backupData.xbrowsersync.sync;
      bookmarksToRestore = data ? data.bookmarks : null;
      serviceUrl = sync ? sync.url : null;
      syncId = sync ? sync.id : null;
    } else if (backupData.xBrowserSync) {
      // Get data to restore from backups prior to v1.5.0
      bookmarksToRestore = backupData.xBrowserSync.bookmarks;
      syncId = backupData.xBrowserSync.id;
    } else {
      // Data to restore invalid, throw error
      throw new Exceptions.FailedRestoreDataException();
    }

    this.workingSvc.show(WorkingContext.Restoring);

    return this.storeSvc
      .get<boolean>(StoreKey.SyncEnabled)
      .then((cachedSyncEnabled) => {
        syncEnabled = cachedSyncEnabled;

        // If synced check service status before starting restore, otherwise restore sync settings
        return syncEnabled
          ? this.apiSvc.checkServiceStatus()
          : this.$q((resolve, reject) => {
              // Clear current password and set sync ID if supplied
              this.sync.password = '';
              this.login.passwordComplexity = {};
              this.$q
                .all([
                  this.storeSvc.set(StoreKey.Password),
                  syncId ? this.storeSvc.set(StoreKey.SyncId, syncId) : this.$q.resolve(),
                  serviceUrl ? this.updateServiceUrl(serviceUrl) : this.$q.resolve()
                ])
                .then(resolve)
                .catch(reject);
            });
      })
      .then(() => {
        // Return if no bookmarks found
        if (!bookmarksToRestore) {
          return;
        }

        // Start restore
        return this.queueSync(
          {
            bookmarks: bookmarksToRestore,
            type: !syncEnabled ? SyncType.Local : SyncType.LocalAndRemote
          },
          MessageCommand.RestoreBookmarks
        ).then(this.restoreBookmarksSuccess);
      })
      .finally(this.workingSvc.hide);
  }

  searchBookmarks() {
    const queryData = {
      url: undefined,
      keywords: []
    };
    const urlRegex = new RegExp(`^${Globals.URL.ValidUrlRegex}$`, 'i');

    if (this.search.query) {
      // Iterate query words to form query data object
      const queryWords = this.search.query.split(/[\s,]+/);
      _.each<string>(queryWords, (queryWord) => {
        // Add query word as url if query is in url format, otherwise add to keywords
        if (!queryData.url && urlRegex.test(queryWord.trim())) {
          queryData.url = queryWord.trim();
        } else {
          const keyword = queryWord.trim().replace("'", '').replace(/\W$/, '').toLowerCase();
          if (keyword) {
            queryData.keywords.push(queryWord.trim());
          }
        }
      });
    }

    return this.bookmarkHelperSvc.searchBookmarks(queryData).then((results) => {
      this.search.scrollDisplayMoreEnabled = false;
      this.search.resultsDisplayed = this.search.batchResultsNum;
      this.search.results = results;

      // Scroll to top of search results
      this.$timeout(() => {
        this.search.scrollDisplayMoreEnabled = true;
        const resultsPanel = document.querySelector('.search-results-container');
        if (resultsPanel) {
          resultsPanel.scrollTop = 0;
        }
      }, 150);
    });
  }

  searchForm_AddBookmark_Click() {
    // Display bookmark panel
    return this.changeView(this.view.views.bookmark).then(() => {
      // Disable add bookmark button by default
      this.bookmark.addButtonDisabledUntilEditForm = true;
    });
  }

  searchForm_Clear_Click() {
    return this.displayDefaultSearchState().then(() => {
      // Display default search results
      this.searchBookmarks();

      // Focus on search box
      if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
        (document.querySelector('input[name=txtSearch]') as HTMLInputElement).focus();
      }
    });
  }

  searchForm_DeleteBookmark_Click(event, bookmark) {
    if (event) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      if (event.srcEvent) {
        event.srcEvent.stopPropagation();
      }
    }

    let originalBookmarks;
    if (this.search.displayFolderView) {
      // Find and remove the deleted bookmark element in the bookmark tree
      originalBookmarks = angular.copy(this.search.bookmarkTree);

      // Find parent of bookmark to delete
      let parent;
      let childIndex = -1;
      this.bookmarkHelperSvc.eachBookmark(this.search.bookmarkTree, (current) => {
        if (current.children?.length === 0) {
          return;
        }

        // Check children for target bookmark
        const index = current.children.findIndex((child) => {
          return child.id === bookmark.id;
        });
        if (index >= 0) {
          parent = current;
          childIndex = index;
        }
      });

      // If target bookmark and parent were found, remove the bookmark
      if (parent && childIndex >= 0) {
        parent.children.splice(childIndex, 1);
      }
    } else {
      // Find and remove the deleted bookmark element in the search results
      originalBookmarks = angular.copy(this.search.results);

      const removedBookmarkIndex = _.findIndex<any>(this.search.results, (result) => {
        return result.id === bookmark.id;
      });
      if (removedBookmarkIndex >= 0) {
        this.search.results.splice(removedBookmarkIndex, 1);
      }
    }

    this.$timeout(() => {
      // Display loading overlay
      this.workingSvc.show();

      // Create change info and sync changes
      const data: RemoveBookmarkChangeData = {
        id: bookmark.id
      };
      const changeInfo: BookmarkChange = {
        changeData: data,
        type: BookmarkChangeType.Remove
      };
      this.queueSync({
        changeInfo,
        type: SyncType.LocalAndRemote
      }).catch((err) => {
        // Restore current bookmarks view and then handle error
        if (this.search.displayFolderView) {
          this.search.bookmarkTree = originalBookmarks;
        } else {
          this.search.results = originalBookmarks;
        }
        return this.checkIfSyncDataRefreshedOnError(err).then(this.$exceptionHandler);
      });
    }, 1e3);
  }

  searchForm_SearchText_Autocomplete() {
    this.search.query = `${this.search.query}${this.search.lookahead}`;
    this.searchForm_SearchText_Change();
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        (document.querySelector('input[name=txtSearch]') as HTMLInputElement).focus();
      });
    }
  }

  searchForm_SearchText_Change(event?) {
    // Hide alerts
    this.alertSvc.clearCurrentAlert();

    // Get query from event data if provided
    if (event?.data) {
      this.search.query = event.data;
    }

    if (this.search.getSearchResultsTimeout) {
      this.$timeout.cancel(this.search.getSearchResultsTimeout);
      this.search.getSearchResultsTimeout = null;
    }

    // No query, clear results
    if (!this.search.query?.trim()) {
      this.displayDefaultSearchState();
      return;
    }

    // Get last word of search query
    const queryWords = this.search.query.split(/[\s]+/);
    const lastWord = _.last<string>(queryWords);

    // Display lookahead if word length exceed minimum
    if (lastWord?.length > Globals.LookaheadMinChars) {
      // Get lookahead
      return this.bookmarkHelperSvc
        .getLookahead(lastWord.toLowerCase(), this.search.results)
        .then((results) => {
          if (!results) {
            this.search.lookahead = null;
            return;
          }

          let lookahead = results[0];
          const word = results[1];

          if (lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
            // Set lookahead after trimming word
            lookahead = lookahead ? lookahead.substring(word.length) : undefined;
            this.search.queryMeasure = this.search.query.replace(/\s/g, '&nbsp;');
            this.search.lookahead = lookahead.replace(/\s/g, '&nbsp;');
          }

          this.search.cancelGetBookmarksRequest = null;
        })
        .then(() => {
          this.search.displayFolderView = false;
          return this.searchBookmarks();
        });
    }
    this.search.lookahead = null;
  }

  searchForm_SearchText_KeyDown(event) {
    // If user pressed enter and search text present
    if (event.keyCode === 13) {
      (document.activeElement as HTMLInputElement).blur();

      if (this.search.getSearchResultsTimeout) {
        this.$timeout.cancel(this.search.getSearchResultsTimeout);
        this.search.getSearchResultsTimeout = null;
      }

      // Get search results
      this.search.displayFolderView = false;
      this.searchBookmarks();

      // Return focus to search box
      this.$timeout(() => {
        (document.querySelector('input[name=txtSearch]') as HTMLInputElement).focus();
      });

      return;
    }

    // If user pressed down arrow and search results present
    if (event.keyCode === 40 && this.search.results?.length > 0) {
      // Focus on first search result
      event.preventDefault();
      (document.querySelectorAll('.search-results-container bookmark')[0] as HTMLDivElement).focus();
      return;
    }

    // If user pressed tab or right arrow key and lookahead present
    if ((event.keyCode === 9 || event.keyCode === 39) && this.search.lookahead) {
      // Add lookahead to search query
      event.preventDefault();
      this.searchForm_SearchText_Autocomplete();
    }
  }

  searchForm_SearchResult_KeyDown(event) {
    let currentIndex;
    let newIndex;
    let elementToFocus;

    switch (true) {
      // Enter
      case event.keyCode === 13:
        event.target.querySelector('.bookmark-content').click();
        break;
      // Up arrow
      case event.keyCode === 38:
        if (event.target.previousElementSibling) {
          // Focus on previous result
          elementToFocus = event.target.previousElementSibling;
        } else {
          // Focus on search box
          elementToFocus = document.querySelector('input[name=txtSearch]');
        }
        break;
      // Down arrow
      case event.keyCode === 40:
        if (event.target.nextElementSibling) {
          // Focus on next result
          elementToFocus = event.target.nextElementSibling;
        }
        break;
      // Page up
      case event.keyCode === 33:
        // Focus on result 10 up from current
        currentIndex = _.indexOf(event.target.parentElement.children, event.target);
        newIndex = currentIndex - 10;
        if (newIndex < 0) {
          elementToFocus = event.target.parentElement.firstElementChild;
        } else {
          elementToFocus = event.target.parentElement.children[newIndex];
        }
        break;
      // Page down
      case event.keyCode === 34:
        // Focus on result 10 down from current
        currentIndex = _.indexOf(event.target.parentElement.children, event.target);
        newIndex = currentIndex + 10;
        if (event.target.parentElement.children.length <= newIndex) {
          elementToFocus = event.target.parentElement.lastElementChild;
        } else {
          elementToFocus = event.target.parentElement.children[newIndex];
        }
        break;
      // Home
      case event.keyCode === 36:
        // Focus on first result
        elementToFocus = event.target.parentElement.firstElementChild;
        break;
      // End
      case event.keyCode === 35:
        // Focus on last result
        elementToFocus = event.target.parentElement.lastElementChild;
        break;
      // Backspace
      case event.keyCode === 8:
      // Space
      case event.keyCode === 32:
      // Numbers and letters
      case event.keyCode > 47 && event.keyCode < 112:
        // Focus on search box
        elementToFocus = document.querySelector('input[name=txtSearch]');
        break;
    }

    if (elementToFocus) {
      event.preventDefault();
      elementToFocus.focus();
    }
  }

  searchForm_SearchResults_Scroll() {
    if (this.search.results?.length > 0 && this.search.scrollDisplayMoreEnabled) {
      // Display next batch of results
      this.search.resultsDisplayed += this.search.batchResultsNum;
    }
  }

  searchForm_SelectBookmark_Press(event, bookmarkId) {
    if (event) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      if (event.srcEvent) {
        event.srcEvent.stopPropagation();
      }
    }

    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      return;
    }

    // Display menu for selected bookmark
    this.search.selectedBookmark = bookmarkId;
  }

  searchForm_ShareBookmark_Click(event, bookmarkToShare) {
    if (event) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      if (event.srcEvent) {
        event.srcEvent.stopPropagation();
      }
    }

    // Trigger native share functionality
    this.appHelperSvc.shareBookmark(bookmarkToShare);
  }

  searchForm_ToggleBookmark_Click() {
    // Display bookmark panel
    return this.changeView(this.view.views.bookmark);
  }

  searchForm_ToggleView_Click() {
    this.search.displayFolderView = !this.search.displayFolderView;
    return this.displayDefaultSearchState().then(() => {
      // Display default search results
      if (!this.search.displayFolderView) {
        this.searchBookmarks();
      }

      // Focus on search box
      if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
        (document.querySelector('input[name=txtSearch]') as HTMLInputElement).focus();
      }
    });
  }

  searchForm_UpdateBookmark_Click(event, bookmarkToUpdate) {
    if (event) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      if (event.srcEvent) {
        event.srcEvent.stopPropagation();
      }
    }

    // On mobiles, display bookmark panel with slight delay to avoid focussing on description field
    if (this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        this.changeView(this.view.views.bookmark, bookmarkToUpdate);
      }, 500);
    } else {
      this.changeView(this.view.views.bookmark, bookmarkToUpdate);
    }
  }

  serviceIsOnline(): boolean {
    return (
      this.sync.service.status === ApiServiceStatus.NoNewSyncs || this.sync.service.status === ApiServiceStatus.Online
    );
  }

  setNewTabLinks() {
    const links = document.querySelectorAll('a.new-tab');
    for (let i = 0; i < links.length; i++) {
      const link = links[i] as any;
      link.onclick = this.appHelperSvc.openUrl;
    }
  }

  settings_Prefs_CheckForAppUpdates_Click() {
    // Update setting value and store in cache
    const value = !this.settings.checkForAppUpdates;
    this.settings.checkForAppUpdates = value;
    return this.storeSvc.set(StoreKey.CheckForAppUpdates, value);
  }

  settings_Prefs_DisplaySearchBar_Click() {
    // Update setting value and store in cache
    const value = !this.settings.displaySearchBarBeneathResults;
    this.settings.displaySearchBarBeneathResults = value;
    return this.storeSvc.set(StoreKey.DisplaySearchBarBeneathResults, value);
  }

  settings_Prefs_EnableDarkMode_Click() {
    // Update setting value and store in cache
    const value = !this.settings.darkModeEnabled;
    this.settings.darkModeEnabled = value;
    return this.storeSvc.set(StoreKey.DarkModeEnabled, value);
  }

  settings_Prefs_DefaultToFolderView_Click() {
    // Update setting value and store in cache
    const value = !this.settings.defaultToFolderView;
    this.settings.defaultToFolderView = value;
    return this.storeSvc.set(StoreKey.DefaultToFolderView, value);
  }

  settings_Prefs_SyncBookmarksToolbar_Click() {
    this.settings.syncBookmarksToolbar = !this.settings.syncBookmarksToolbar;

    // If confirmation message is currently displayed, hide it and return
    if (this.settings.displaySyncBookmarksToolbarConfirmation) {
      this.settings.displaySyncBookmarksToolbarConfirmation = false;
      return;
    }

    return this.$q
      .all([this.bookmarkHelperSvc.getSyncBookmarksToolbar(), this.storeSvc.get<boolean>(StoreKey.SyncEnabled)])
      .then((cachedData) => {
        const syncBookmarksToolbar = cachedData[0];
        const syncEnabled = cachedData[1];

        // If sync not enabled or user just clicked to disable toolbar sync, update stored value and return
        if (!syncEnabled || syncBookmarksToolbar) {
          this.logSvc.logInfo(`Toolbar sync ${!syncBookmarksToolbar ? 'enabled' : 'disabled'}`);
          return this.storeSvc.set(StoreKey.SyncBookmarksToolbar, !syncBookmarksToolbar);
        }

        // Otherwise, display sync confirmation
        this.settings.displaySyncBookmarksToolbarConfirmation = true;
        this.$timeout(() => {
          (document.querySelector('.btn-confirm-sync-toolbar') as HTMLButtonElement).focus();
        });
      });
  }

  settings_Prefs_SyncBookmarksToolbar_Cancel() {
    this.settings.displaySyncBookmarksToolbarConfirmation = false;
    this.settings.syncBookmarksToolbar = false;
  }

  settings_Prefs_SyncBookmarksToolbar_Confirm() {
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        return;
      }

      // Hide sync confirmation and display loading overlay
      this.settings.displaySyncBookmarksToolbarConfirmation = false;
      this.workingSvc.show();

      // Enable setting in cache
      return this.storeSvc.set(StoreKey.SyncBookmarksToolbar, true).then(() => {
        this.logSvc.logInfo('Toolbar sync enabled');

        // Refresh local sync data
        return this.queueSync({ type: SyncType.Local });
      });
    });
  }

  startSyncing() {
    const syncData = {} as any;
    let syncInfoMessage;

    // Display loading panel
    this.login.displaySyncConfirmation = false;
    this.login.displayOtherSyncsWarning = false;
    this.login.displayUpgradeConfirmation = false;
    this.workingSvc.show();

    // Check service status
    return this.apiSvc
      .checkServiceStatus()
      .then(() => {
        // Clear the current cached password
        return this.storeSvc.set(StoreKey.Password);
      })
      .then(() => {
        // If a sync ID has not been supplied, get a new one
        if (!this.sync.id) {
          // Set sync type for create new sync
          syncData.type = SyncType.Remote;

          // Get new sync ID
          return this.apiSvc.createNewSync().then((newSync) => {
            syncInfoMessage = `New sync id created: ${newSync.id}`;

            // Add sync data to cache and return
            return this.$q
              .all([
                this.storeSvc.set(StoreKey.LastUpdated, newSync.lastUpdated),
                this.storeSvc.set(StoreKey.SyncId, newSync.id),
                this.storeSvc.set(StoreKey.SyncVersion, newSync.version)
              ])
              .then(() => {
                return newSync.id;
              });
          });
        }

        syncInfoMessage = `Synced to existing id: ${this.sync.id}`;

        // Set sync type for retrieve existing sync
        syncData.type = SyncType.Local;

        // Retrieve sync version for existing id
        return this.apiSvc.getBookmarksVersion(this.sync.id).then((response) => {
          // If no sync version is set, confirm upgrade
          if (!response.version) {
            if (this.login.upgradeConfirmed) {
              syncData.type = SyncType.Upgrade;
            } else {
              this.login.displayUpgradeConfirmation = true;
              return;
            }
          }

          // Add sync version to cache and return current sync ID
          return this.$q
            .all([
              this.storeSvc.set(StoreKey.SyncId, this.sync.id),
              this.storeSvc.set(StoreKey.SyncVersion, response.version)
            ])
            .then(() => {
              return this.sync.id;
            });
        });
      })
      .then((syncId) => {
        if (!syncId) {
          return;
        }

        // Generate a password hash, cache it then queue the sync
        return this.cryptoSvc
          .getPasswordHash(this.sync.password, syncId)
          .then((passwordHash) => {
            this.storeSvc.set(StoreKey.Password, passwordHash);
            return this.queueSync(syncData);
          })
          .then(() => {
            this.logSvc.logInfo(syncInfoMessage);
            return this.syncBookmarksSuccess();
          })
          .then(() => {
            this.sync.enabled = true;
            this.sync.id = syncId;
          })
          .catch((err) => {
            return this.syncBookmarksFailed(err, syncData);
          });
      })
      .catch((err) => {
        // Disable upgrade confirmed flag
        this.login.upgradeConfirmed = false;

        throw err;
      })
      .finally(() => {
        // Hide loading panel
        this.workingSvc.hide();
      });
  }

  syncBookmarksFailed(err, syncData) {
    // Disable upgrade confirmed flag
    this.login.upgradeConfirmed = false;

    // Clear cached data
    const keys = [StoreKey.Bookmarks, StoreKey.Password, StoreKey.SyncVersion];
    // If error occurred whilst creating new sync, remove cached sync ID and password
    if (syncData.type === SyncType.Remote) {
      keys.push(StoreKey.SyncId);
    }
    this.storeSvc.set(keys);

    // If ID was removed disable sync and display login panel
    if (err instanceof Exceptions.SyncRemovedException) {
      return this.changeView(this.view.views.login).finally(() => {
        this.$exceptionHandler(err);
      });
    }

    // If creds were incorrect, focus on password field
    if (
      err instanceof Exceptions.InvalidCredentialsException &&
      !this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)
    ) {
      this.$timeout(() => {
        (document.querySelector('.login-form-existing input[name="txtPassword"]') as HTMLInputElement).select();
      }, 150);
    }

    throw err;
  }

  syncBookmarksSuccess(bookmarkStatusActive?) {
    // Hide loading panel
    this.workingSvc.hide();

    // If initial sync, switch to search panel
    this.$timeout(() => {
      if (this.view.current !== this.view.views.search) {
        return this.changeView(this.view.views.search);
      }

      this.displayDefaultSearchState();
    }, 150);

    return this.$q.resolve();
  }

  syncForm_ConfirmPassword_Back_Click() {
    this.login.displayPasswordConfirmation = false;
    this.login.passwordConfirmation = null;
  }

  syncForm_ConfirmPassword_Click() {
    this.login.displayPasswordConfirmation = true;

    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        (document.querySelector('input[name="txtPasswordConfirmation"]') as HTMLInputElement).focus();
      }, 150);
    }
  }

  syncForm_DisableSync_Click() {
    // Disable sync and switch to login panel
    return this.$q.all([this.disableSync(), this.changeView(this.view.views.login)]);
  }

  syncForm_EnableSync_Click() {
    if (this.sync.id && this.appHelperSvc.confirmBeforeSyncing()) {
      // Display overwrite data confirmation panel
      this.login.displaySyncConfirmation = true;
      if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
        this.$timeout(() => {
          (document.querySelector('.btn-confirm-enable-sync') as HTMLInputElement).focus();
        });
      }
    } else {
      // If no ID provided start syncing
      this.startSyncing();
    }
  }

  syncForm_ExistingSync_Click() {
    this.login.displayNewSyncPanel = false;
    this.sync.password = '';

    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        (document.querySelector('input[name="txtId"]') as HTMLInputElement).focus();
      }, 150);
    }
  }

  syncForm_ManualEntry_Click() {
    this.login.displayGetSyncIdPanel = false;
  }

  syncForm_NewSync_Click() {
    this.login.displayNewSyncPanel = true;
    this.login.displayPasswordConfirmation = false;
    this.storeSvc.set(StoreKey.SyncId);
    this.storeSvc.set(StoreKey.Password);
    this.sync.id = null;
    this.sync.password = '';
    this.syncForm.txtId.$setValidity('InvalidSyncId', true);
    this.login.passwordConfirmation = null;
    this.login.passwordComplexity = {};

    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        (document.querySelector('.login-form-new input[name="txtPassword"]') as HTMLInputElement).focus();
      }, 150);
    }
  }

  syncForm_OtherSyncsDisabled_Click() {
    // Hide disable other syncs warning panel and update cache setting
    this.login.displayOtherSyncsWarning = false;
    this.storeSvc.set(StoreKey.DisplayOtherSyncsWarning, false);

    // Focus on password field
    if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
      this.$timeout(() => {
        (document.querySelector('.active-login-form input[name="txtPassword"]') as HTMLInputElement).focus();
      }, 150);
    }
  }

  syncForm_ShowPassword_Click() {
    // Toggle show password
    this.login.showPassword = !this.login.showPassword;
  }

  syncForm_Submit_Click() {
    this.$timeout(() => {
      // Handle enter key press
      if (this.login.displayUpdateServicePanel) {
        (document.querySelector('.update-service-panel .btn-update-service-url') as HTMLButtonElement).click();
      } else if (this.login.displayNewSyncPanel) {
        if (this.login.displayPasswordConfirmation) {
          (document.querySelector('.login-form-new .btn-new-sync') as HTMLButtonElement).click();
        } else {
          (document.querySelector('.login-form-new .btn-confirm-password') as HTMLButtonElement).click();
        }
      } else {
        (document.querySelector('.login-form-existing .btn-existing-sync') as HTMLButtonElement).click();
      }
    });
  }

  syncForm_SyncId_Change() {
    if (!this.sync.id || this.utilitySvc.syncIdIsValid(this.sync.id)) {
      this.syncForm.txtId.$setValidity('InvalidSyncId', true);
      this.storeSvc.set(StoreKey.SyncId, this.sync.id);
    } else {
      this.syncForm.txtId.$setValidity('InvalidSyncId', false);
    }
  }

  syncForm_SyncUpdates_Click() {
    // Display loading panel
    this.workingSvc.show();

    // Pull updates
    return this.queueSync({ type: SyncType.Local }).then(() => {
      return this.syncBookmarksSuccess();
    });
  }

  syncForm_UpdateService_Cancel_Click() {
    this.login.displayUpdateServiceConfirmation = false;
    this.login.displayUpdateServicePanel = false;
  }

  syncForm_UpdateService_Click() {
    // Reset view
    this.sync.newService.url = this.sync.service.url;
    this.login.displayUpdateServiceConfirmation = false;
    this.login.displayUpdateServicePanel = true;
    this.login.validatingServiceUrl = false;

    // Validate service url
    this.syncForm_UpdateService_ServiceUrl_Validate().finally(() => {
      // Focus on url field
      (document.querySelector('.update-service-panel input') as HTMLInputElement).focus();
    });
  }

  syncForm_UpdateService_Confirm_Click() {
    // Update saved credentials
    const url = this.sync.newService.url.replace(/\/$/, '');
    return this.$q
      .all([this.updateServiceUrl(url), this.storeSvc.set(StoreKey.SyncId), this.storeSvc.set(StoreKey.Password)])
      .then(() => {
        // Update view
        this.login.displayUpdateServicePanel = false;
        this.login.passwordComplexity = {};
        this.login.passwordConfirmation = null;
        this.sync.id = null;
        this.sync.password = '';
        this.syncForm.txtId.$setValidity('InvalidSyncId', true);
        this.syncForm.$setPristine();
        this.syncForm.$setUntouched();

        // Focus on first field
        if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
          this.$timeout(() => {
            (document.querySelector('.active-login-form input') as HTMLInputElement).focus();
          }, 150);
        }
      })
      .catch((err) => {
        this.logSvc.logError(err);
      });
  }

  syncForm_UpdateService_ServiceUrl_Change(event) {
    // Reset form if field is invalid
    if (this.syncForm.newServiceUrl.$invalid) {
      this.syncForm.newServiceUrl.$setValidity('InvalidService', true);
      this.syncForm.newServiceUrl.$setValidity('RequestFailed', true);
      this.syncForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', true);
    }
  }

  syncForm_UpdateService_ServiceUrl_Validate() {
    const timeout = this.$timeout(() => {
      this.login.validatingServiceUrl = true;
    }, 150);

    // Check service url status
    const url = this.sync.newService.url.replace(/\/$/, '');
    return this.apiSvc
      .checkServiceStatus(url)
      .catch((err) => {
        switch (err.constructor) {
          case Exceptions.ServiceOfflineException:
            // If API is offline still allow setting as current service
            return true;
          case Exceptions.UnsupportedApiVersionException:
            this.syncForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', false);
            break;
          case Exceptions.InvalidServiceException:
            this.syncForm.newServiceUrl.$setValidity('InvalidService', false);
            break;
          default:
            this.syncForm.newServiceUrl.$setValidity('RequestFailed', false);
        }

        // Focus on url field
        (document.querySelector('input[name=newServiceUrl]') as HTMLInputElement).focus();
        return false;
      })
      .finally(() => {
        this.$timeout.cancel(timeout);
        this.$timeout(() => {
          this.login.validatingServiceUrl = false;
        });
      });
  }

  syncForm_UpdateService_Update_Click() {
    // Check for protocol
    if (
      this.sync.newService.url?.trim() &&
      !new RegExp(Globals.URL.ProtocolRegex).test(this.sync.newService.url ?? '')
    ) {
      this.sync.newService.url = `https://${this.sync.newService.url}`;
    }

    // Validate service url
    return this.syncForm_UpdateService_ServiceUrl_Validate().then((newServiceInfo) => {
      if (!newServiceInfo) {
        return;
      }

      // Retrieve new service status
      return this.refreshServiceStatus(this.sync.newService, newServiceInfo).then(() => {
        // Display confirmation panel
        this.login.displayUpdateServiceConfirmation = true;

        // Focus on first button
        if (!this.utilitySvc.isMobilePlatform(this.appHelperSvc.platformName)) {
          this.$timeout(() => {
            (document.querySelector('.update-service-panel .confirm .buttons > button') as HTMLButtonElement).focus();
          }, 150);
        }
      });
    });
  }

  syncForm_UpgradeSync_Click() {
    this.login.upgradeConfirmed = true;
    this.startSyncing();
  }

  closeUpdatedPanel() {
    this.storeSvc.set(StoreKey.DisplayUpdated, false);
    this.changeView(this.view.views.support);
  }

  updateServiceUrl(url) {
    url = url.replace(/\/$/, '');
    return this.storeSvc.set(StoreKey.ServiceUrl, url).then(() => {
      this.sync.service.apiVersion = '';
      this.sync.service.location = null;
      this.sync.service.maxSyncSize = 0;
      this.sync.service.message = '';
      this.sync.service.status = null;
      this.sync.service.url = url;
      this.logSvc.logInfo(`Service url changed to: ${url}`);

      // Refresh service info
      this.refreshServiceStatus();
    });
  }

  validateBackupData() {
    let bookmarks;
    let restoreData;
    let validateData = false;

    if (!this.settings.dataToRestore) {
      validateData = false;
    }

    // Check backup data structure
    try {
      restoreData = JSON.parse(this.settings.dataToRestore);
      bookmarks = restoreData.xBrowserSync?.bookmarks ?? restoreData.xbrowsersync?.data?.bookmarks;
      validateData = !!bookmarks;
    } catch (err) {}
    this.restoreForm.dataToRestore.$setValidity('InvalidData', validateData);

    return validateData;
  }

  waitForSyncsToFinish() {
    const doActionUntil = (currentData) => {
      const currentSync = currentData[0];
      const syncQueueLength = currentData[1];
      return this.$q.resolve(currentSync == null && syncQueueLength === 0);
    };

    const action = () => {
      return this.$q((resolve, reject) => {
        this.$timeout(() => {
          this.$q
            .all([this.appHelperSvc.getCurrentSync(), this.appHelperSvc.getSyncQueueLength()])
            .then(resolve)
            .catch(reject);
        }, 1e3);
      });
    };

    // Periodically check sync queue until it is empty
    return this.utilitySvc.promiseWhile([], doActionUntil, action);
  }

  workingCancelAction(): ng.IPromise<void> {
    this.logSvc.logInfo('Cancelling sync');
    return this.queueSync({
      type: SyncType.Cancel
    }).then(() => {
      this.sync.enabled = false;
    });
  }
}
