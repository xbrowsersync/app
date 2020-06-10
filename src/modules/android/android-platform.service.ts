/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-plusplus */
/* eslint-disable prefer-destructuring */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-param-reassign */

import { Injectable } from 'angular-ts-decorators';
import _ from 'underscore';
import { autobind } from 'core-decorators';
import compareVersions from 'compare-versions';
import Globals from '../shared/globals';
import Platform from '../shared/platform.interface';
import StoreService from '../shared/store.service';
import UtilityService from '../shared/utility.service';
import BookmarkService from '../shared/bookmark.service';
import Strings from '../../../res/strings/en.json';

@autobind
@Injectable('PlatformService')
export default class AndroidPlatformService implements Platform {
  $http: ng.IHttpService;
  $interval: ng.IIntervalService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  bookmarkSvc: BookmarkService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  backgroundSyncInterval: any;
  currentPage: any;
  i18nStrings: any;
  loadingId: any;
  sharedBookmark: any;
  vm: any;

  static $inject = ['$http', '$interval', '$q', '$timeout', 'BookmarkService', 'StoreService', 'UtilityService'];
  constructor(
    $http: ng.IHttpService,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkSvc: BookmarkService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$http = $http;
    this.$interval = $interval;
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkSvc = BookmarkSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;

    this.i18nStrings = [];
  }

  automaticUpdates_NextUpdate() {
    return this.$q.resolve();
  }

  automaticUpdates_Start() {
    return this.methodNotApplicable();
  }

  automaticUpdates_Stop() {
    return this.methodNotApplicable();
  }

  bookmarks_BuildIdMappings() {
    return this.methodNotApplicable();
  }

  bookmarks_Clear() {
    return this.methodNotApplicable();
  }

  bookmarks_CreateSingle() {
    return this.methodNotApplicable();
  }

  bookmarks_DeleteSingle() {
    return this.methodNotApplicable();
  }

  bookmarks_Get() {
    return this.methodNotApplicable();
  }

  bookmarks_Populate() {
    return this.methodNotApplicable();
  }

  bookmarks_Share(bookmark) {
    const options = {
      subject: `${bookmark.title} (${this.getConstant(Strings.shareBookmark_Message)})`,
      url: bookmark.url,
      chooserTitle: this.getConstant(Strings.shareBookmark_Message)
    };

    const onError = (err) => {
      // Display alert
      const errMessage = this.getErrorMessageFromException({ code: Globals.ErrorCodes.FailedShareBookmark });
      this.vm.alert.display(errMessage.title, errMessage.message, 'danger');
    };

    // Display share sheet
    window.plugins.socialsharing.shareWithOptions(options, null, onError);
  }

  bookmarks_UpdateSingle() {
    return this.methodNotApplicable();
  }

  checkForDarkTheme() {
    // Check dark theme is supported
    return this.$q((resolve, reject) => {
      window.cordova.plugins.ThemeDetection.isAvailable(resolve, reject);
    })
      .then((isAvailable: any) => {
        if (!isAvailable.value) {
          return;
        }

        // Check dark theme is enabled
        return this.$q((resolve, reject) => {
          window.cordova.plugins.ThemeDetection.isDarkModeEnabled(resolve, reject);
        }).then((isDarkModeEnabled: any) => {
          this.vm.settings.darkModeEnabled = isDarkModeEnabled.value;
        });
      })
      .catch(this.displayErrorAlert);
  }

  checkForInstallOrUpgrade() {
    // Check for stored app version and compare it to current
    const mobileAppVersion = localStorage.getItem('xBrowserSync-mobileAppVersion');
    return (mobileAppVersion
      ? this.$q.resolve(mobileAppVersion)
      : this.storeSvc.get(Globals.CacheKeys.AppVersion)
    ).then((currentVersion) => {
      return currentVersion
        ? this.handleUpgrade(currentVersion, Globals.AppVersion)
        : this.handleInstall(Globals.AppVersion);
    });
  }

  checkForNewVersion() {
    this.$timeout(() => {
      this.utilitySvc.checkForNewVersion().then((newVersion) => {
        if (!newVersion) {
          return;
        }

        this.vm.alert.display(
          null,
          this.getConstant(Strings.appUpdateAvailable_Android_Message).replace('{version}', newVersion),
          null,
          this.getConstant(Strings.button_View_Label),
          () => {
            this.openUrl(Globals.ReleaseNotesUrlStem + newVersion.replace(/^v/, ''));
          }
        );
      });
    }, 1e3);
  }

  checkForSharedBookmark() {
    const bookmark = this.getSharedBookmark();
    if (!bookmark) {
      return this.$q.resolve();
    }

    // Set current page as shared bookmark and display bookmark panel
    this.currentPage = bookmark;
    return this.vm.view.change(this.vm.view.views.bookmark).finally(() => {
      // Set bookmark form fields to display default values
      this.vm.bookmark.current = bookmark;
      this.vm.bookmark.originalUrl = this.vm.bookmark.current.url;

      // Clear current page
      this.currentPage = null;
    });
  }

  copyToClipboard(textToCopy) {
    return this.$q((resolve, reject) => {
      window.cordova.plugins.clipboard.copy(textToCopy, resolve, reject);
    });
  }

  disableBackgroundSync() {
    if (!this.backgroundSyncInterval) {
      return;
    }

    this.$interval.cancel(this.backgroundSyncInterval);
    this.backgroundSyncInterval = null;
    window.cordova.plugins.backgroundMode.disable();
  }

  disableLight() {
    return this.$q((resolve, reject) => {
      window.QRScanner.disableLight((err) => {
        if (err) {
          const error = new Error(err._message || err.name || err.code);
          this.utilitySvc.logError(error, 'platform.disableLight');
          return reject(error);
        }

        resolve();
      });
    });
  }

  displayDefaultSearchState(originalFunction) {
    return originalFunction().then(() => {
      return this.vm.search.execute();
    });
  }

  displayErrorAlert(err) {
    // Display alert
    const errMessage = this.getErrorMessageFromException(err);
    this.vm.alert.display(errMessage.title, errMessage.message, 'danger');
  }

  displaySnackbar(title, description, level, action, actionCallback) {
    const text = `${(title ? `${title}. ${description}` : description).replace(/\.$/, '')}.`;
    const textColor = '#ffffff';
    let bgColor = null;
    switch (level) {
      case 'danger':
        bgColor = '#ea3869';
        break;
      case 'success':
        bgColor = '#30d278';
        break;
      case 'warning':
        bgColor = '#bdc71b';
        break;
      default:
        bgColor = '#083039';
        break;
    }
    const success = (clicked) => {
      if (clicked && actionCallback) {
        actionCallback();
      }
    };
    const failure = (errMessage) => {
      this.utilitySvc.logError(new Error(errMessage), 'platform.displaySnackbar');
    };

    // Ensure soft keyboard is hidden
    if (document.activeElement) {
      (document.activeElement as HTMLInputElement).blur();
    }

    // Display snackbar
    window.cordova.plugins.snackbar.create(text, 5000, bgColor, textColor, 3, action, success, failure);
  }

  downloadFile(fileName, textContents) {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Set file storage location to external storage root directory
    const storageLocation = `${window.cordova.file.externalRootDirectory}Download`;

    return this.$q((resolve, reject) => {
      const onError = () => {
        return reject({ code: Globals.ErrorCodes.FailedDownloadFile });
      };

      this.utilitySvc.logInfo(`Downloading file ${fileName}`);

      // Save file to storage location
      window.resolveLocalFileSystemURL(
        storageLocation,
        (dirEntry) => {
          dirEntry.getFile(
            fileName,
            { create: true },
            (fileEntry) => {
              fileEntry.createWriter((fileWriter) => {
                fileWriter.write(textContents);
                fileWriter.onerror = onError;
                fileWriter.onwriteend = () => {
                  // Return message to be displayed
                  const message = this.getConstant(Strings.downloadFile_Success_Message).replace(
                    '{fileName}',
                    fileEntry.name
                  );
                  resolve(message);
                };
              }, onError);
            },
            onError
          );
        },
        onError
      );
    });
  }

  enableBackgroundSync() {
    // Exit if background sync already enabled
    if (this.backgroundSyncInterval) {
      return;
    }

    // Keep app running in background
    window.cordova.plugins.backgroundMode.enable();

    // Try executing sync periodically
    this.backgroundSyncInterval = this.$interval(() => {
      // Only execute sync if app running in background
      if (!window.cordova.plugins.backgroundMode.isActive()) {
        return;
      }

      this.executeSync(true);
    }, 120e3);
  }

  enableLight() {
    return this.$q((resolve, reject) => {
      window.QRScanner.enableLight((err) => {
        if (err) {
          const error = new Error(err._message || err.name || err.code);
          this.utilitySvc.logError(error, 'platform.enableLight');
          return reject(error);
        }

        resolve();
      });
    });
  }

  eventListeners_Disable() {
    return this.methodNotApplicable();
  }

  eventListeners_Enable() {
    return this.methodNotApplicable();
  }

  executeSync(isBackgroundSync, displayLoadingId?) {
    let displayLoadingTimeout;

    // Display loading panel if not background sync and currently on the search view
    if (!isBackgroundSync) {
      displayLoadingTimeout = this.interface_Working_Show(displayLoadingId);
    }

    // Sync bookmarks
    return this.bookmarkSvc
      .executeSync(isBackgroundSync)
      .then(() => {
        // Disable background sync if sync successfull
        if (isBackgroundSync) {
          this.disableBackgroundSync();
        }
      })
      .catch((err) => {
        // Display alert if not background sync
        if (!isBackgroundSync) {
          this.displayErrorAlert(err);
        }
      })
      .finally(() => {
        this.interface_Working_Hide(displayLoadingId, displayLoadingTimeout);
      });
  }

  executeSyncIfOnline(displayLoadingId) {
    const isOnline = this.utilitySvc.isNetworkConnected();

    // If not online display an alert and return
    if (!isOnline) {
      this.vm.alert.display(
        this.getConstant(Strings.workingOffline_Title),
        this.getConstant(Strings.workingOffline_Message)
      );

      return this.$q.resolve(false);
    }

    // Sync bookmarks
    return this.executeSync(false, displayLoadingId).then(() => {
      return true;
    });
  }

  getAllFromNativeStorage() {
    return this.$q((resolve, reject) => {
      const cachedData = {};

      const failure = (err) => {
        err = err || new Error();
        if (err.code === 2) {
          // Item not found
          return resolve(null);
        }

        this.utilitySvc.logError(err, 'platform.getAllFromNativeStorage');
        err.code = Globals.ErrorCodes.FailedLocalStorage;
        reject(err);
      };

      const success = (keys) => {
        this.$q
          .all(
            keys.map((key) => {
              return this.$q((resolveGetItem, rejectGetItem) => {
                window.NativeStorage.getItem(
                  key,
                  (result) => {
                    cachedData[key] = result;
                    resolveGetItem();
                  },
                  rejectGetItem
                );
              });
            })
          )
          .then(() => {
            resolve(cachedData);
          })
          .catch(failure);
      };

      window.NativeStorage.keys(success, failure);
    });
  }

  getErrorMessageFromException(err: any): any {
    const errorMessage = {
      title: '',
      message: ''
    };

    if (!err || !err.code) {
      errorMessage.title = this.getConstant(Strings.error_Default_Title);
      errorMessage.message = this.getConstant(Strings.error_Default_Message);
      return errorMessage;
    }

    err.details = !err.details ? '' : err.details;

    switch (err.code) {
      case Globals.ErrorCodes.NetworkOffline:
      case Globals.ErrorCodes.HttpRequestFailed:
        errorMessage.title = this.getConstant(Strings.error_HttpRequestFailed_Title);
        errorMessage.message = this.getConstant(Strings.error_HttpRequestFailed_Message);
        break;
      case Globals.ErrorCodes.TooManyRequests:
        errorMessage.title = this.getConstant(Strings.error_TooManyRequests_Title);
        errorMessage.message = this.getConstant(Strings.error_TooManyRequests_Message);
        break;
      case Globals.ErrorCodes.RequestEntityTooLarge:
        errorMessage.title = this.getConstant(Strings.error_RequestEntityTooLarge_Title);
        errorMessage.message = this.getConstant(Strings.error_RequestEntityTooLarge_Message);
        break;
      case Globals.ErrorCodes.NotAcceptingNewSyncs:
        errorMessage.title = this.getConstant(Strings.error_NotAcceptingNewSyncs_Title);
        errorMessage.message = this.getConstant(Strings.error_NotAcceptingNewSyncs_Message);
        break;
      case Globals.ErrorCodes.DailyNewSyncLimitReached:
        errorMessage.title = this.getConstant(Strings.error_DailyNewSyncLimitReached_Title);
        errorMessage.message = this.getConstant(Strings.error_DailyNewSyncLimitReached_Message);
        break;
      case Globals.ErrorCodes.MissingClientData:
        errorMessage.title = this.getConstant(Strings.error_MissingClientData_Title);
        errorMessage.message = this.getConstant(Strings.error_MissingClientData_Message);
        break;
      case Globals.ErrorCodes.NoDataFound:
        errorMessage.title = this.getConstant(Strings.error_InvalidCredentials_Title);
        errorMessage.message = this.getConstant(Strings.error_InvalidCredentials_Message);
        break;
      case Globals.ErrorCodes.SyncRemoved:
        errorMessage.title = this.getConstant(Strings.error_SyncRemoved_Title);
        errorMessage.message = this.getConstant(Strings.error_SyncRemoved_Message);
        break;
      case Globals.ErrorCodes.InvalidCredentials:
        errorMessage.title = this.getConstant(Strings.error_InvalidCredentials_Title);
        errorMessage.message = this.getConstant(Strings.error_InvalidCredentials_Message);
        break;
      case Globals.ErrorCodes.ContainerChanged:
        errorMessage.title = this.getConstant(Strings.error_ContainerChanged_Title);
        errorMessage.message = this.getConstant(Strings.error_ContainerChanged_Message);
        break;
      case Globals.ErrorCodes.LocalContainerNotFound:
        errorMessage.title = this.getConstant(Strings.error_LocalContainerNotFound_Title);
        errorMessage.message = this.getConstant(Strings.error_LocalContainerNotFound_Message);
        break;
      case Globals.ErrorCodes.DataOutOfSync:
        errorMessage.title = this.getConstant(Strings.error_OutOfSync_Title);
        errorMessage.message = this.getConstant(Strings.error_OutOfSync_Message);
        break;
      case Globals.ErrorCodes.InvalidService:
        errorMessage.title = this.getConstant(Strings.error_InvalidService_Title);
        errorMessage.message = this.getConstant(Strings.error_InvalidService_Message);
        break;
      case Globals.ErrorCodes.ServiceOffline:
        errorMessage.title = this.getConstant(Strings.error_ServiceOffline_Title);
        errorMessage.message = this.getConstant(Strings.error_ServiceOffline_Message);
        break;
      case Globals.ErrorCodes.UnsupportedServiceApiVersion:
        errorMessage.title = this.getConstant(Strings.error_UnsupportedServiceApiVersion_Title);
        errorMessage.message = this.getConstant(Strings.error_UnsupportedServiceApiVersion_Message);
        break;
      case Globals.ErrorCodes.FailedGetPageMetadata:
        errorMessage.title = this.getConstant(Strings.error_FailedGetPageMetadata_Title);
        errorMessage.message = this.getConstant(Strings.error_FailedGetPageMetadata_Message);
        break;
      case Globals.ErrorCodes.FailedScan:
        errorMessage.title = this.getConstant(Strings.error_ScanFailed_Message);
        break;
      case Globals.ErrorCodes.FailedShareBookmark:
        errorMessage.title = this.getConstant(Strings.error_ShareFailed_Title);
        break;
      case Globals.ErrorCodes.FailedDownloadFile:
        errorMessage.title = this.getConstant(Strings.error_FailedDownloadFile_Title);
        break;
      case Globals.ErrorCodes.FailedGetDataToRestore:
        errorMessage.title = this.getConstant(Strings.error_FailedGetDataToRestore_Title);
        break;
      case Globals.ErrorCodes.FailedRestoreData:
        errorMessage.title = this.getConstant(Strings.error_FailedRestoreData_Title);
        errorMessage.message = this.getConstant(Strings.error_FailedRestoreData_Message);
        break;
      case Globals.ErrorCodes.FailedShareUrl:
        errorMessage.title = this.getConstant(Strings.error_FailedShareUrl_Title);
        break;
      case Globals.ErrorCodes.FailedShareUrlNotSynced:
        errorMessage.title = this.getConstant(Strings.error_FailedShareUrlNotSynced_Title);
        break;
      case Globals.ErrorCodes.FailedRefreshBookmarks:
        errorMessage.title = this.getConstant(Strings.error_FailedRefreshBookmarks_Title);
        break;
      case Globals.ErrorCodes.SyncUncommitted:
        errorMessage.title = this.getConstant(Strings.error_UncommittedSyncs_Title);
        errorMessage.message = this.getConstant(Strings.error_UncommittedSyncs_Message);
        break;
      case Globals.ErrorCodes.FailedCreateLocalBookmarks:
      case Globals.ErrorCodes.FailedGetLocalBookmarks:
      case Globals.ErrorCodes.FailedRemoveLocalBookmarks:
      case Globals.ErrorCodes.LocalBookmarkNotFound:
      case Globals.ErrorCodes.XBookmarkNotFound:
        errorMessage.title = this.getConstant(Strings.error_LocalSyncError_Title);
        errorMessage.message = this.getConstant(Strings.error_LocalSyncError_Message);
        break;
      default:
        errorMessage.title = this.getConstant(Strings.error_Default_Title);
        errorMessage.message = this.getConstant(Strings.error_Default_Message);
    }

    return errorMessage;
  }

  getConstant(stringObj: any): string {
    let stringVal = '';

    if (stringObj && stringObj.key) {
      stringVal = this.i18nStrings[stringObj.key];
    }

    if (!stringVal) {
      this.utilitySvc.logWarning('I18n string has no value');
    }

    return stringVal;
  }

  getCurrentUrl() {
    return this.$q.resolve(this.currentPage && this.currentPage.url);
  }

  getHelpPages() {
    const pages = [
      this.getConstant(Strings.help_Page_Welcome_Android_Content),
      this.getConstant(Strings.help_Page_FirstSync_Android_Content),
      this.getConstant(Strings.help_Page_ExistingId_Android_Content),
      this.getConstant(Strings.help_Page_Searching_Android_Content),
      this.getConstant(Strings.help_Page_AddingBookmarks_Android_Content),
      this.getConstant(Strings.help_Page_BackingUp_Android_Content),
      this.getConstant(Strings.help_Page_FurtherSupport_Content)
    ];

    return pages;
  }

  getPageMetadata(getFullMetadata, pageUrl) {
    let inAppBrowser;
    let loadUrlTimeout;
    let timeout;

    // Set default metadata from provided page url or current page
    const metadata = {
      description: undefined,
      title: this.currentPage ? this.currentPage.title : null,
      tags: undefined,
      url: pageUrl || (this.currentPage ? this.currentPage.url : null)
    };

    const promise = this.$q((resolve, reject) => {
      // Return if no url set
      if (!metadata.url) {
        this.vm.bookmark.addButtonDisabledUntilEditForm = true;
        return resolve();
      }

      // If url was provided, check connection and is valid http url
      const httpRegex = new RegExp(Globals.URL.HttpRegex, 'i');
      if (pageUrl && (!this.utilitySvc.isNetworkConnected() || !httpRegex.test(pageUrl))) {
        this.utilitySvc.logWarning('Didn’t get page metadata');
        return reject({ code: Globals.ErrorCodes.FailedGetPageMetadata });
      }

      const handleResponse = (pageContent?, err?) => {
        this.interface_Working_Hide('retrievingMetadata', timeout);

        // Cancel timeout
        if (loadUrlTimeout) {
          this.$timeout.cancel(loadUrlTimeout);
          loadUrlTimeout = null;
        }

        // Check html content was returned
        if (err || !pageContent) {
          if (err) {
            this.utilitySvc.logError(err, 'platform.handleResponse');
          }
          this.utilitySvc.logWarning('Didn’t get page metadata');
          return reject({ code: Globals.ErrorCodes.FailedGetPageMetadata });
        }

        // Extract metadata values
        const parser = new DOMParser();
        const document = parser.parseFromString(pageContent, 'text/html');

        const getDecodedTextValue = (text) => {
          if (!text) {
            return '';
          }
          const txt = document.createElement('textarea');
          txt.innerHTML = text.trim();
          return txt.value;
        };

        const getPageDescription = () => {
          const ogDescription: HTMLMetaElement =
            document.querySelector('meta[property="OG:DESCRIPTION"]') ||
            document.querySelector('meta[property="og:description"]');
          if (ogDescription && ogDescription.content) {
            return getDecodedTextValue(ogDescription.content);
          }

          const twitterDescription: HTMLMetaElement =
            document.querySelector('meta[name="TWITTER:DESCRIPTION"]') ||
            document.querySelector('meta[name="twitter:description"]');
          if (twitterDescription && twitterDescription.content) {
            return getDecodedTextValue(twitterDescription.content);
          }

          const defaultDescription: HTMLMetaElement =
            document.querySelector('meta[name="DESCRIPTION"]') || document.querySelector('meta[name="description"]');
          if (defaultDescription && defaultDescription.content) {
            return getDecodedTextValue(defaultDescription.content);
          }

          return '';
        };

        const getPageKeywords = () => {
          const keywords = [];

          // Get open graph tag values
          document.querySelectorAll<HTMLMetaElement>('meta[property="OG:VIDEO:TAG"]').forEach((tag) => {
            if (tag && tag.content) {
              keywords.push(getDecodedTextValue(tag.content));
            }
          });
          document.querySelectorAll<HTMLMetaElement>('meta[property="og:video:tag"]').forEach((tag) => {
            if (tag && tag.content) {
              keywords.push(getDecodedTextValue(tag.content));
            }
          });

          // Get meta tag values
          const metaKeywords: HTMLMetaElement =
            document.querySelector('meta[name="KEYWORDS"]') || document.querySelector('meta[name="keywords"]');
          if (metaKeywords && metaKeywords.content) {
            metaKeywords.content.split(',').forEach((keyword) => {
              if (keyword) {
                keywords.push(getDecodedTextValue(keyword));
              }
            });
          }

          // Remove duplicates
          const uniqueKeywords = keywords.filter((value, index, self) => {
            return self.indexOf(value) === index;
          });

          if (uniqueKeywords.length > 0) {
            return uniqueKeywords.join();
          }

          return null;
        };

        const getPageTitle = () => {
          const ogTitle: HTMLMetaElement =
            document.querySelector('meta[property="OG:TITLE"]') || document.querySelector('meta[property="og:title"]');
          if (ogTitle && ogTitle.content) {
            return getDecodedTextValue(ogTitle.content);
          }

          const twitterTitle: HTMLMetaElement =
            document.querySelector('meta[name="TWITTER:TITLE"]') ||
            document.querySelector('meta[name="twitter:title"]');
          if (twitterTitle && twitterTitle.content) {
            return getDecodedTextValue(twitterTitle.content);
          }

          return getDecodedTextValue(document.title);
        };

        // Update metadata with retrieved page data and return
        metadata.title = getPageTitle();
        metadata.description = getPageDescription();
        metadata.tags = getPageKeywords();
        resolve(metadata);
      };

      // If network disconnected fail immediately, otherwise retrieve page metadata
      if (!this.utilitySvc.isNetworkConnected()) {
        return handleResponse();
      }

      const cancelledCallback = () => {
        resolve(metadata);
      };
      timeout = this.interface_Working_Show('retrievingMetadata', cancelledCallback);
      inAppBrowser = window.cordova.InAppBrowser.open(metadata.url, '_blank', 'hidden=yes');

      inAppBrowser.addEventListener('loaderror', (event) => {
        const errMessage = event && event.message ? event.message : 'Failed to load webpage';
        handleResponse(null, new Error(errMessage));
      });

      inAppBrowser.addEventListener('loadstop', () => {
        // Return if inAppBrowser has already been closed
        if (!inAppBrowser) {
          return;
        }

        // Remove invasive content and return doc html
        inAppBrowser.executeScript(
          {
            code:
              "(function() { var elements = document.querySelectorAll('video,script'); for (var i = 0; i < elements.length; i++) { elements[i].parentNode.removeChild(elements[i]); } })();" +
              "document.querySelector('html').outerHTML;"
          },
          handleResponse
        );
      });

      // Time out metadata load after 10 secs
      loadUrlTimeout = this.$timeout(() => {
        if ((promise as any).$this.$state.status === 0) {
          handleResponse(null, new Error('Timed out loading URL'));
        }
      }, 10e3);
    }).finally(() => {
      // Close InAppBrowser
      if (inAppBrowser) {
        inAppBrowser.close();
        inAppBrowser = null;
      }
    });

    return promise;
  }

  getSharedBookmark() {
    if (!this.sharedBookmark) {
      return;
    }

    const bookmark = this.sharedBookmark;
    const txt = document.createElement('textarea');
    txt.innerHTML = bookmark.title ? bookmark.title.trim() : '';
    bookmark.title = txt.value;
    this.sharedBookmark = null;
    return bookmark;
  }

  getSupportedUrl(url) {
    return url;
  }

  handleBackButton(event) {
    if (
      this.vm.view.current === this.vm.view.views.bookmark ||
      this.vm.view.current === this.vm.view.views.settings ||
      this.vm.view.current === this.vm.view.views.help ||
      this.vm.view.current === this.vm.view.views.support ||
      this.vm.view.current === this.vm.view.views.updated ||
      this.vm.view.current === this.vm.view.views.scan
    ) {
      // Back to login/search panel
      event.preventDefault();
      this.vm.view.displayMainView();
    } else {
      // On main view, exit app
      event.preventDefault();
      window.cordova.plugins.exit();
    }
  }

  handleDeviceReady(viewModel, success, failure) {
    // Set global variables
    this.vm = viewModel;

    // Set platform
    this.vm.platformName = Globals.Platforms.Android;

    // Configure events
    document.addEventListener('backbutton', this.handleBackButton, false);
    document.addEventListener('touchstart', this.handleTouchStart, false);
    window.addEventListener('keyboardDidShow', this.handleKeyboardDidShow);
    window.addEventListener('keyboardWillHide', this.handleKeyboardWillHide);

    // Check if an intent started the app and detect future shared intents
    window.plugins.intentShim.getIntent(this.handleNewIntent, () => {});
    window.plugins.intentShim.onIntent(this.handleNewIntent);

    // Enable app working in background to check for uncommitted syncs
    window.cordova.plugins.backgroundMode.setDefaults({ hidden: true, silent: true });
    window.cordova.plugins.backgroundMode.on('activate', () => {
      window.cordova.plugins.backgroundMode.disableWebViewOptimizations();
    });

    // Set clear search button to display all bookmarks
    const displayDefaultStateOriginal = this.vm.search.displayDefaultState;
    this.vm.search.displayDefaultState = () => {
      return this.displayDefaultSearchState(displayDefaultStateOriginal);
    };

    // Enable select file to restore
    this.vm.settings.fileRestoreEnabled = true;

    // Increase search results timeout to avoid display lag
    this.vm.settings.getSearchResultsDelay = 500;

    // Display existing sync panel by default
    this.vm.login.displayNewSyncPanel = false;

    // Use snackbar for alerts
    this.vm.alert.display = this.displaySnackbar;

    // Load i18n strings
    return (
      this.initI18n()
        // Check for upgrade or do fresh install
        .then(this.checkForInstallOrUpgrade)
        // Run startup process after install/upgrade
        .then(this.handleStartup)
        .then(success)
        .catch(failure)
    );
  }

  handleInstall(installedVersion) {
    return this.storeSvc
      .clear()
      .then(() => {
        return this.$q.all([
          this.storeSvc.set(Globals.CacheKeys.AppVersion, installedVersion),
          this.storeSvc.set(Globals.CacheKeys.CheckForAppUpdates, true),
          this.storeSvc.set(Globals.CacheKeys.DisplayHelp, true)
        ]);
      })
      .then(() => {
        this.utilitySvc.logInfo(`Installed v${installedVersion}`);
      });
  }

  handleKeyboardDidShow(event) {
    document.body.style.height = `calc(100% - ${event.keyboardHeight}px)`;
    setTimeout(() => {
      (document.activeElement as any).scrollIntoViewIfNeeded();
    }, 100);
  }

  handleKeyboardWillHide() {
    document.body.style.removeProperty('height');
  }

  handleNewIntent(intent) {
    if (!intent || !intent.extras) {
      return;
    }

    this.utilitySvc.logInfo(`Detected new intent: ${intent.extras['android.intent.extra.TEXT']}`);

    // Set shared bookmark with shared intent data
    this.sharedBookmark = {
      title: intent.extras['android.intent.extra.SUBJECT'],
      url: intent.extras['android.intent.extra.TEXT']
    };
  }

  handleResume() {
    // Set theme
    return this.checkForDarkTheme().then(() => {
      // Check if sync enabled and reset network disconnected flag
      this.storeSvc
        .get(Globals.CacheKeys.SyncEnabled)
        .then((syncEnabled) => {
          // Deselect bookmark
          this.vm.search.selectedBookmark = null;

          if (!syncEnabled) {
            return;
          }

          // Run sync
          return this.executeSyncIfOnline('delayDisplayDialog')
            .then((isOnline) => {
              if (isOnline === false) {
                return;
              }

              // Refresh search results if query not present
              if (this.vm.view.current === this.vm.view.views.search && !this.vm.search.query) {
                this.vm.search.displayDefaultState();
              }
            })
            .then(() => {
              // Check if a bookmark was shared
              return this.checkForSharedBookmark();
            });
        })
        .catch(this.displayErrorAlert);
    });
  }

  handleStartup() {
    this.utilitySvc.logInfo('Starting up');

    // Set theme
    return this.checkForDarkTheme().then(() => {
      // Retrieve cached data
      return this.storeSvc
        .get()
        .then((cachedData) => {
          const syncEnabled = cachedData[Globals.CacheKeys.SyncEnabled];
          const checkForAppUpdates = cachedData[Globals.CacheKeys.CheckForAppUpdates];

          // Prime bookmarks cache
          if (syncEnabled) {
            this.bookmarkSvc.getCachedBookmarks();
          }

          // Add useful debug info to beginning of trace log
          cachedData.platform = {
            name: window.device.platform,
            device: `${window.device.manufacturer} ${window.device.model}`
          };
          this.utilitySvc.logInfo(
            _.omit(
              cachedData,
              'debugMessageLog',
              Globals.CacheKeys.Bookmarks,
              Globals.CacheKeys.TraceLog,
              Globals.CacheKeys.Password
            )
          );

          // Check for new app version
          if (checkForAppUpdates) {
            this.checkForNewVersion();
          }

          // Exit if sync not enabled
          if (!syncEnabled) {
            return;
          }

          // Run sync
          this.executeSyncIfOnline('delayDisplayDialog')
            .then((isOnline) => {
              if (isOnline === false) {
                return;
              }

              // Refresh search results if query not present
              if (this.vm.view.current === this.vm.view.views.search && !this.vm.search.query) {
                this.vm.search.displayDefaultState();
              }
            })
            .then(() => {
              // Check if a bookmark was shared
              return this.checkForSharedBookmark();
            })
            .catch(this.displayErrorAlert);
        })
        .catch(this.displayErrorAlert);
    });
  }

  handleTouchStart(event) {
    // Blur focus (and hide keyboard) when pressing out of text fields
    if (!this.isTextInput(event.target) && this.isTextInput(document.activeElement)) {
      this.$timeout(() => {
        (document.activeElement as HTMLInputElement).blur();
      }, 100);
    } else if (this.vm.search.selectedBookmark) {
      // Deselect selected bookmark
      this.vm.search.selectedBookmark = null;
    }
  }

  handleUpgrade(oldVersion, newVersion) {
    if (compareVersions.compare(oldVersion, newVersion, '=')) {
      // No upgrade
      return this.$q.resolve();
    }

    // Clear trace log
    return this.storeSvc
      .set(Globals.CacheKeys.TraceLog)
      .then(() => {
        this.utilitySvc.logInfo(`Upgrading from ${oldVersion} to ${newVersion}`);
      })
      .then(() => {
        if (compareVersions(oldVersion, newVersion)) {
          switch (true) {
            case newVersion.indexOf('1.5.3') === 0:
              return this.upgradeTo153();
          }
        }
      })
      .then(() => {
        return this.$q.all([
          this.storeSvc.set(Globals.CacheKeys.AppVersion, newVersion),
          this.storeSvc.set(Globals.CacheKeys.DisplayUpdated, true)
        ]);
      })
      .catch((err) => {
        this.utilitySvc.logError(err, 'platform.handleUpgrade');
        this.displayErrorAlert(err);
      });
  }

  init(viewModel) {
    return this.$q((resolve, reject) => {
      // Bind to device events
      document.addEventListener(
        'deviceready',
        () => {
          this.handleDeviceReady(viewModel, resolve, reject);
        },
        false
      );
      document.addEventListener('resume', this.handleResume, false);
    });
  }

  initI18n() {
    let i18nCode = 'en';
    return this.$q<string>((resolve, reject) => {
      navigator.globalization.getPreferredLanguage(resolve, reject);
    })
      .then((language: any) => {
        if (!language && !language.value) {
          this.utilitySvc.logWarning('Couldn’t get preferred language');
          return;
        }
        i18nCode = language.value.split('-')[0];
      })
      .catch((err) => {
        this.utilitySvc.logError(err, 'platform.initI18n');
      })
      .finally(() => {
        this.$http
          .get(`./assets/strings_${i18nCode}.json`)
          .then((response) => {
            this.i18nStrings = response.data;
          })
          .catch((err) => {
            this.utilitySvc.logWarning(`Couldn’t load i18n strings: ${i18nCode}`);
            throw err;
          });
      });
  }

  interface_Refresh() {
    return this.methodNotApplicable();
  }

  interface_Working_Hide(id, timeout) {
    if (timeout) {
      this.$timeout.cancel(timeout);
    }

    // Hide loading panel if supplied if matches current
    if (!this.loadingId || id === this.loadingId) {
      window.SpinnerDialog.hide();
      this.loadingId = null;
    }
  }

  interface_Working_Show(id, cancelledCallback?) {
    let timeout;

    // Return if loading overlay already displayed
    if (this.loadingId) {
      return;
    }

    switch (id) {
      // Display syncing dialog after a slight delay
      case 'delayDisplayDialog':
        timeout = this.$timeout(() => {
          if (this.vm.view.current === this.vm.view.views.search) {
            window.SpinnerDialog.show(null, `${this.vm.working.message}…`, true);
          }
        }, 250);
        break;
      // Loading bookmark metadata, display cancellable overlay
      case 'retrievingMetadata':
        const cancel = () => {
          window.SpinnerDialog.hide();
          this.loadingId = null;
          cancelledCallback();
        };
        window.SpinnerDialog.hide();
        timeout = this.$timeout(() => {
          window.SpinnerDialog.show(null, this.getConstant(Strings.getMetadata_Message), cancel);
        }, 250);
        break;
      // Display default overlay
      default:
        timeout = this.$timeout(() => {
          window.SpinnerDialog.show(null, `${this.getConstant(Strings.working_Syncing_Message)}…`, true);
        });
        break;
    }

    this.loadingId = id;
    return timeout;
  }

  isTextInput(node) {
    return ['INPUT', 'TEXTAREA'].indexOf(node.nodeName) !== -1;
  }

  methodNotApplicable() {
    // Unused for this platform
    return this.$q.resolve();
  }

  openUrl(url) {
    window.open(url, '_system', '');
  }

  refreshLocalSyncData() {
    return this.sync_Queue({ type: Globals.SyncType.Pull }).then(() => {
      this.utilitySvc.logInfo('Local sync data refreshed');
    });
  }

  sync_DisplayConfirmation(): boolean {
    return false;
  }

  sync_Queue(syncData, command?) {
    syncData.command = command || Globals.Commands.SyncBookmarks;

    // Add sync data to queue and run sync
    return this.bookmarkSvc
      .queueSync(syncData)
      .then(() => {
        if (syncData.changeInfo === undefined) {
          return;
        }
        return this.$q.resolve(syncData.changeInfo).then((changeInfo) => {
          switch (true) {
            case changeInfo.type === Globals.UpdateType.Create:
              this.$timeout(() => {
                this.vm.alert.display(null, this.getConstant(Strings.bookmarkCreated_Message));
              }, 200);
              break;
            case changeInfo.type === Globals.UpdateType.Delete:
              this.$timeout(() => {
                this.vm.alert.display(null, this.getConstant(Strings.bookmarkDeleted_Message));
              }, 200);
              break;
            case changeInfo.type === Globals.UpdateType.Update:
              this.$timeout(() => {
                this.vm.alert.display(null, this.getConstant(Strings.bookmarkUpdated_Message));
              }, 200);
              break;
          }
        });
      })
      .catch((err) => {
        // If local data out of sync, queue refresh sync
        return (this.bookmarkSvc.checkIfRefreshSyncedDataOnError(err)
          ? this.refreshLocalSyncData()
          : this.$q.resolve()
        ).then(() => {
          // Check for uncommitted syncs
          if (err.code === Globals.ErrorCodes.SyncUncommitted) {
            this.vm.alert.display(
              this.getConstant(Strings.error_UncommittedSyncs_Title),
              this.getConstant(Strings.error_UncommittedSyncs_Message)
            );

            this.enableBackgroundSync();
            return;
          }

          throw err;
        });
      });
  }

  scanner_Start() {
    this.vm.scanner.lightEnabled = false;
    this.vm.scanner.invalidSyncId = false;

    return this.$q((resolve, reject) => {
      const waitForScan = () => {
        this.$timeout(() => {
          this.vm.scanner.invalidSyncId = false;
        }, 100);

        window.QRScanner.scan((err, scannedText) => {
          if (err) {
            const scanError = new Error(err._message || err.name || err.code);
            this.utilitySvc.logError(scanError, 'platform.startScanning');
            return reject(scanError);
          }

          window.QRScanner.pausePreview(() => {
            this.utilitySvc.logInfo(`Scanned: ${scannedText}`);

            let syncInfo;
            try {
              syncInfo = this.utilitySvc.decodeQrCode(scannedText);
            } catch (decodeQrCodeErr) {
              // If scanned value is not value resume scanning
              this.vm.scanner.invalidSyncId = true;
              this.$timeout(() => {
                window.QRScanner.resumePreview(waitForScan);
              }, 3e3);
              return;
            }

            this.$timeout(() => {
              resolve(syncInfo);
            }, 1e3);
          });
        });
      };

      window.QRScanner.prepare((err, status) => {
        if (err) {
          const authError = new Error(err._message || err.name || err.code);
          this.utilitySvc.logError(authError, 'platform.startScanning');
          return reject(authError);
        }

        if (status.authorized) {
          window.QRScanner.show(() => {
            this.$timeout(() => {
              this.vm.view.change(this.vm.view.views.scan);
              waitForScan();
            }, 500);
          });
        } else {
          const noAuthError = new Error('Not authorised');
          this.utilitySvc.logError(noAuthError, 'platform.startScanning');
          reject(noAuthError);
        }
      });
    }).catch((err) => {
      return this.$q.reject({
        code: Globals.ErrorCodes.FailedScan,
        stack: err.stack
      });
    });
  }

  scanner_Stop() {
    this.disableLight()
      .catch(() => {})
      .finally(() => {
        window.QRScanner.hide(() => {
          window.QRScanner.destroy();
        });
      });
    return this.$q.resolve();
  }

  scanner_ToggleLight(switchOn) {
    // If state was elected toggle light based on value
    if (switchOn !== undefined) {
      return (switchOn ? this.enableLight() : this.disableLight()).then(() => {
        return switchOn;
      });
    }

    // Otherwise toggle light based on current state
    return this.$q((resolve, reject) => {
      window.QRScanner.getStatus((status) => {
        (status.lightEnabled ? this.disableLight() : this.enableLight())
          .then(() => {
            resolve(!status.lightEnabled);
          })
          .catch(reject);
      });
    });
  }

  sync_Current() {
    return this.$q.resolve(this.bookmarkSvc.getCurrentSync());
  }

  sync_Disable() {
    return this.bookmarkSvc.disableSync();
  }

  sync_GetQueueLength() {
    return this.$q.resolve(this.bookmarkSvc.getSyncQueueLength());
  }

  upgradeTo153() {
    // Convert local storage items to IndexedDB
    return this.getAllFromNativeStorage()
      .then((cachedData) => {
        if (!cachedData || Object.keys(cachedData).length === 0) {
          return;
        }

        return this.$q.all(
          Object.keys(cachedData).map((key) => {
            return this.storeSvc.set(key, cachedData[key]);
          })
        );
      })
      .then(() => {
        return window.NativeStorage.clear();
      });
  }
}
