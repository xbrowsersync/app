/* eslint-disable default-case */
/* eslint-disable no-undef */
/* eslint-disable no-case-declarations */
/* eslint-disable no-empty */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable global-require */

import angular from 'angular';
import { Component } from 'angular-ts-decorators';
import browserDetect from 'browser-detect';
import compareVersions from 'compare-versions';
import { autobind } from 'core-decorators';
import _ from 'underscore';
import { browser } from 'webextension-polyfill-ts';
import Globals from '../shared/globals';
import StoreService from '../shared/store.service';
import BookmarkService from '../shared/bookmark.service';
import Platform from '../shared/platform.interface';
import UtilityService from '../shared/utility.service';
import BookmarkIdMapperService from './bookmark-id-mapper.service';
import Strings from '../../../res/strings/en.json';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'webextBackground',
  template: require('./webext-background.component.html')
})
export default class WebExtBackgroundComponent {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkSvc: BookmarkService;
  platformSvc: Platform;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  bookmarkEventsQueue = [];
  notificationClickHandlers = [];
  startupInitiated = false;
  processBookmarkEventsTimeout: any;

  static $inject = [
    '$q',
    '$timeout',
    'BookmarkIdMapperService',
    'BookmarkService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: BookmarkService,
    PlatformSvc: Platform,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;

    browser.alarms.onAlarm.addListener(this.onAlarmHandler);
    browser.notifications.onClicked.addListener(this.onNotificationClicked);
    browser.notifications.onClosed.addListener(this.onNotificationClosed);
    browser.runtime.onMessage.addListener(this.onMessageHandler as any);
    (window as any).handleXBrowserSyncMessage = this.onMessageHandler;
  }

  changeBookmark(id, changes) {
    // Retrieve full bookmark info
    browser.bookmarks.getSubTree(id).then((results) => {
      const changedBookmark = results[0];

      // If bookmark is separator update local bookmark properties
      (this.bookmarkSvc.isSeparator(changedBookmark)
        ? this.convertLocalBookmarkToSeparator(changedBookmark)
        : this.$q.resolve(changedBookmark)
      ).then((bookmarkNode) => {
        // If the bookmark was converted to a separator, update id mapping
        let updateMappingPromise;
        if (bookmarkNode.id !== id) {
          updateMappingPromise = this.bookmarkIdMapperSvc.get(id).then((idMapping) => {
            if (!idMapping) {
              return this.$q.reject({ code: Globals.ErrorCodes.BookmarkMappingNotFound });
            }

            return this.bookmarkIdMapperSvc.remove(idMapping.syncedId).then(() => {
              const newMapping = this.bookmarkIdMapperSvc.createMapping(idMapping.syncedId, bookmarkNode.id);
              return this.bookmarkIdMapperSvc.add(newMapping);
            });
          });
        } else {
          updateMappingPromise = this.$q.resolve();
        }
        return updateMappingPromise.then(() => {
          // Create change info
          const changeInfo = {
            bookmark: bookmarkNode,
            type: Globals.UpdateType.Update
          };

          // Queue sync
          this.queueBookmarksSync(
            {
              changeInfo,
              type: Globals.SyncType.Push
            },
            (response) => {
              if (!response.success) {
                // Display alert
                const errMessage = this.platformSvc.getErrorMessageFromException(response.error);
                this.displayAlert(errMessage.title, errMessage.message);
              }
            },
            false
          );
        });
      });
    });
  }

  checkForNewVersion() {
    this.utilitySvc.checkForNewVersion().then((newVersion) => {
      if (!newVersion) {
        return;
      }

      this.displayAlert(
        this.platformSvc.getConstant(Strings.appUpdateAvailable_Title),
        this.platformSvc.getConstant(Strings.appUpdateAvailable_Message).replace('{version}', newVersion),
        Globals.ReleaseNotesUrlStem + newVersion.replace(/^v/, '')
      );
    });
  }

  checkForUpdatesOnStartup() {
    return this.$q((resolve, reject) => {
      // If network disconnected, skip update check
      if (!this.utilitySvc.isNetworkConnected()) {
        this.utilitySvc.logInfo('Couldn’t check for updates on startup: network offline');
        return resolve(false);
      }

      // Check for updates to synced bookmarks
      this.bookmarkSvc
        .checkForUpdates()
        .then(resolve)
        .catch((err) => {
          // If request failed, retry once
          if (err.code !== Globals.ErrorCodes.HttpRequestFailed) {
            return reject(err);
          }

          this.utilitySvc.logInfo('Connection to API failed, retrying check for sync updates momentarily');
          this.$timeout(() => {
            this.storeSvc
              .get(Globals.CacheKeys.SyncEnabled)
              .then((syncEnabled) => {
                if (!syncEnabled) {
                  this.utilitySvc.logInfo('Sync was disabled before retry attempted');
                  return reject({ code: Globals.ErrorCodes.HttpRequestCancelled });
                }

                this.bookmarkSvc.checkForUpdates().then(resolve).catch(reject);
              })
              .catch(reject);
          }, 5000);
        });
    }).then((updatesAvailable) => {
      if (!updatesAvailable) {
        return;
      }

      // Queue sync
      return this.$q((resolve, reject) => {
        this.queueBookmarksSync(
          {
            type: Globals.SyncType.Pull
          },
          (response) => {
            if (response.success) {
              resolve();
            } else {
              reject(response.error);
            }
          }
        );
      });
    });
  }

  checkPermsAndGetPageMetadata() {
    return this.platformSvc.permissions_Check().then((hasPermissions) => {
      if (!hasPermissions) {
        this.utilitySvc.logInfo('Do not have permission to read active tab content');
      }

      // Depending on current perms, get full or partial page metadata
      return hasPermissions ? this.platformSvc.getPageMetadata(true) : this.platformSvc.getPageMetadata(false);
    });
  }

  convertLocalBookmarkToSeparator(bookmark) {
    // Check if bookmark is in toolbar
    return this.platformSvc.bookmarks_LocalBookmarkInToolbar(bookmark).then((inToolbar) => {
      // Skip process if bookmark is not in toolbar and already local separator
      if (
        (bookmark.url === this.platformSvc.getNewTabUrl() &&
          !inToolbar &&
          bookmark.title === Globals.Bookmarks.HorizontalSeparatorTitle) ||
        (inToolbar && bookmark.title === Globals.Bookmarks.VerticalSeparatorTitle)
      ) {
        return bookmark;
      }

      // Disable event listeners and process conversion
      return this.$q((resolve) => {
        this.disableEventListeners(resolve);
      })
        .then(() => {
          const title = inToolbar
            ? Globals.Bookmarks.VerticalSeparatorTitle
            : Globals.Bookmarks.HorizontalSeparatorTitle;

          // If already a separator just update the title
          if (
            (!inToolbar && bookmark.title === Globals.Bookmarks.VerticalSeparatorTitle) ||
            (inToolbar && bookmark.title === Globals.Bookmarks.HorizontalSeparatorTitle)
          ) {
            return browser.bookmarks.update(bookmark.id, { title });
          }

          // Remove and recreate bookmark as a separator
          const separator = {
            index: bookmark.index,
            parentId: bookmark.parentId,
            title,
            url: this.platformSvc.getNewTabUrl()
          };
          return browser.bookmarks.remove(bookmark.id).then(() => {
            return browser.bookmarks.create(separator);
          });
        })
        .finally(() => {
          return this.$q((resolve) => {
            this.enableEventListeners(resolve);
          });
        });
    });
  }

  createBookmark(id, createdBookmark) {
    // If bookmark is separator update local bookmark properties
    return (this.bookmarkSvc.isSeparator(createdBookmark)
      ? this.convertLocalBookmarkToSeparator(createdBookmark)
      : this.$q.resolve(createdBookmark)
    ).then((bookmarkNode) => {
      // Create change info
      const changeInfo = {
        bookmark: bookmarkNode,
        type: Globals.UpdateType.Create
      };

      // If bookmark is not folder or separator, get page metadata from current tab
      return (bookmarkNode.url && !this.bookmarkSvc.isSeparator(bookmarkNode)
        ? this.checkPermsAndGetPageMetadata()
        : this.$q.resolve()
      ).then((metadata) => {
        // Add metadata if bookmark is current tab location
        if (metadata && bookmarkNode.url === metadata.url) {
          changeInfo.bookmark.title = this.utilitySvc.stripTags(metadata.title);
          changeInfo.bookmark.description = this.utilitySvc.stripTags(metadata.description);
          changeInfo.bookmark.tags = this.utilitySvc.getTagArrayFromText(metadata.tags);
        }

        // Queue sync
        this.queueBookmarksSync(
          {
            changeInfo,
            type: Globals.SyncType.Push
          },
          (response) => {
            if (!response.success) {
              // Display alert
              const errMessage = this.platformSvc.getErrorMessageFromException(response.error);
              this.displayAlert(errMessage.title, errMessage.message);
            }
          },
          false
        );
      });
    });
  }

  disableEventListeners(sendResponse) {
    sendResponse = sendResponse || (() => {});
    const response = {
      success: true
    };

    this.$q
      .all([
        browser.bookmarks.onCreated.removeListener(this.onCreatedHandler),
        browser.bookmarks.onRemoved.removeListener(this.onRemovedHandler),
        browser.bookmarks.onChanged.removeListener(this.onChangedHandler),
        browser.bookmarks.onMoved.removeListener(this.onMovedHandler)
      ])
      .catch((err) => {
        this.utilitySvc.logInfo('Failed to disable event listeners');
        (response as any).error = err;
        (response as any).success = false;
      })
      .finally(() => {
        sendResponse(response);
      });
  }

  disableSync(sendResponse) {
    this.bookmarkSvc.disableSync().then(() => {
      sendResponse({
        success: true
      });
    });
  }

  displayAlert(title, message, url?) {
    // Strip html tags from message
    const urlRegex = new RegExp(Globals.URL.ValidUrlRegex);
    const matches = message.match(urlRegex);
    const messageToDisplay =
      !matches || matches.length === 0
        ? message
        : new DOMParser().parseFromString(`<span>${message}</span>`, 'text/xml').firstElementChild.textContent;

    const options = {
      type: 'basic',
      title,
      message: messageToDisplay,
      iconUrl: `${Globals.PathToAssets}/notification.svg`
    };

    // Display notification
    browser.notifications.create(this.utilitySvc.getUniqueishId(), options as any).then((notificationId) => {
      // Add a click handler to open url if provided or if the message contains a url
      let urlToOpenOnClick = url;
      if (matches && matches.length > 0) {
        urlToOpenOnClick = matches[0];
      }

      if (urlToOpenOnClick) {
        const openUrlInNewTab = () => {
          this.platformSvc.openUrl(urlToOpenOnClick);
        };
        this.notificationClickHandlers.push({
          id: notificationId,
          eventHandler: openUrlInNewTab
        });
      }
    });
  }

  enableEventListeners(sendResponse) {
    sendResponse = sendResponse || (() => {});
    const response = {
      success: true
    };

    this.$q((resolve, reject) => {
      this.disableEventListeners((disableResponse) => {
        if (disableResponse.success) {
          resolve();
        } else {
          reject(disableResponse.error);
        }
      });
    })
      .then(() => {
        browser.bookmarks.onCreated.addListener(this.onCreatedHandler);
        browser.bookmarks.onRemoved.addListener(this.onRemovedHandler);
        browser.bookmarks.onChanged.addListener(this.onChangedHandler);
        browser.bookmarks.onMoved.addListener(this.onMovedHandler);
      })
      .catch((err) => {
        this.utilitySvc.logInfo('Failed to enable event listeners');
        (response as any).error = err;
        (response as any).success = false;
      })
      .finally(() => {
        sendResponse(response);
      });
  }

  getCurrentSync(sendResponse) {
    try {
      sendResponse({
        currentSync: this.bookmarkSvc.getCurrentSync(),
        success: true
      });
    } catch (err) {}
  }

  getLatestUpdates() {
    // Exit if currently syncing
    const currentSync = this.bookmarkSvc.getCurrentSync();
    if (currentSync) {
      return this.$q.resolve();
    }

    // Exit if sync not enabled
    return this.storeSvc
      .get(Globals.CacheKeys.SyncEnabled)
      .then((syncEnabled) => {
        if (!syncEnabled) {
          return;
        }

        return this.bookmarkSvc.checkForUpdates().then((updatesAvailable) => {
          if (!updatesAvailable) {
            return;
          }

          // Queue sync
          return this.$q((resolve, reject) => {
            this.queueBookmarksSync(
              {
                type: Globals.SyncType.Pull
              },
              (response) => {
                if (response.success) {
                  resolve();
                } else {
                  reject(response.error);
                }
              }
            );
          });
        });
      })
      .catch((err) => {
        // Don't display alert if sync failed due to network connection
        if (this.utilitySvc.isNetworkConnectionError(err)) {
          this.utilitySvc.logInfo('Could not check for updates, no connection');
          return;
        }

        this.utilitySvc.logError(err, 'background.onAlarmHandler');

        // If ID was removed disable sync
        if (err.code === Globals.ErrorCodes.NoDataFound) {
          err.code = Globals.ErrorCodes.SyncRemoved;
          this.bookmarkSvc.disableSync();
        }

        // Display alert
        const errMessage = this.platformSvc.getErrorMessageFromException(err);
        this.displayAlert(errMessage.title, errMessage.message);
      });
  }

  getSyncQueueLength(sendResponse) {
    try {
      sendResponse({
        syncQueueLength: this.bookmarkSvc.getSyncQueueLength(),
        success: true
      });
    } catch (err) {}
  }

  init() {
    this.startupInitiated = true;
    let syncEnabled;
    this.utilitySvc.logInfo('Starting up');

    this.storeSvc
      .get([
        Globals.CacheKeys.CheckForAppUpdates,
        Globals.CacheKeys.LastUpdated,
        Globals.CacheKeys.ServiceUrl,
        Globals.CacheKeys.SyncBookmarksToolbar,
        Globals.CacheKeys.SyncEnabled,
        Globals.CacheKeys.SyncId,
        Globals.CacheKeys.SyncVersion
      ])
      .then((cachedData) => {
        syncEnabled = cachedData[Globals.CacheKeys.SyncEnabled];
        const checkForAppUpdates = cachedData[Globals.CacheKeys.CheckForAppUpdates];

        // Add useful debug info to beginning of trace log
        cachedData.appVersion = Globals.AppVersion;
        cachedData.platform = _.omit(browserDetect(), 'versionNumber');
        this.utilitySvc.logInfo(
          Object.keys(cachedData)
            .filter((e) => {
              return cachedData[e] != null;
            })
            .reduce((o, e) => {
              o[e] = cachedData[e];
              return o;
            }, {})
        );

        // Update browser action icon
        this.platformSvc.interface_Refresh(syncEnabled);

        // Check for new app version after a delay
        if (checkForAppUpdates) {
          this.$timeout(this.checkForNewVersion, 5e3);
        }

        // Exit if sync not enabled
        if (!syncEnabled) {
          return;
        }

        // Enable sync
        return this.bookmarkSvc.enableSync().then(() => {
          // Check for updates after a slight delay to allow for initialising network connection
          this.$timeout(() => {
            this.checkForUpdatesOnStartup().catch((err) => {
              // If check for updates was cancelled don't continue
              if (err.code === Globals.ErrorCodes.HttpRequestCancelled) {
                return;
              }

              // Display alert
              const errMessage = this.platformSvc.getErrorMessageFromException(err);
              this.displayAlert(errMessage.title, errMessage.message);
              this.utilitySvc.logError(err, 'background.init');
            });
          }, 1e3);
        });
      });
  }

  installExtension(currentVersion) {
    // Initialise data storage
    return this.storeSvc
      .clear()
      .then(() => {
        return this.$q.all([
          this.storeSvc.set(Globals.CacheKeys.CheckForAppUpdates, true),
          this.storeSvc.set(Globals.CacheKeys.DisplayHelp, true),
          this.storeSvc.set(Globals.CacheKeys.SyncBookmarksToolbar, true),
          this.storeSvc.set(Globals.CacheKeys.DisplayPermissions, true)
        ]);
      })
      .then(() => {
        // Get local bookmarks and save data state at install to local storage
        return this.platformSvc.bookmarks_Get().then((localBookmarks) => {
          const data = {
            bookmarks: localBookmarks,
            date: new Date().toISOString()
          };
          return this.storeSvc.set(Globals.CacheKeys.InstallBackup, JSON.stringify(data));
        });
      })
      .then(() => {
        this.utilitySvc.logInfo(`Installed v${currentVersion}`);
      });
  }

  moveBookmark(id, moveInfo) {
    browser.bookmarks.get(id).then((results) => {
      const movedBookmark = results[0];

      // If bookmark is separator update local bookmark properties
      return (this.bookmarkSvc.isSeparator(movedBookmark)
        ? this.convertLocalBookmarkToSeparator(movedBookmark)
        : this.$q.resolve(movedBookmark)
      ).then((bookmarkNode) => {
        // If the bookmark was converted to a separator, update id mapping
        let updateMappingPromise;
        if (bookmarkNode.id !== id) {
          updateMappingPromise = this.bookmarkIdMapperSvc.get(id).then((idMapping) => {
            if (!idMapping) {
              return this.$q.reject({ code: Globals.ErrorCodes.BookmarkMappingNotFound });
            }

            return this.bookmarkIdMapperSvc.remove(idMapping.syncedId).then(() => {
              const newMapping = this.bookmarkIdMapperSvc.createMapping(idMapping.syncedId, bookmarkNode.id);
              return this.bookmarkIdMapperSvc.add(newMapping);
            });
          });
        } else {
          updateMappingPromise = this.$q.resolve();
        }
        return updateMappingPromise.then(() => {
          // Create change info
          const changeInfo = {
            bookmark: angular.copy(moveInfo),
            type: Globals.UpdateType.Move
          };
          changeInfo.bookmark.id = id;

          // Queue sync
          this.queueBookmarksSync(
            {
              changeInfo,
              type: Globals.SyncType.Push
            },
            (response) => {
              if (!response.success) {
                // Display alert
                const errMessage = this.platformSvc.getErrorMessageFromException(response.error);
                this.displayAlert(errMessage.title, errMessage.message);
              }
            },
            false
          );
        });
      });
    });
  }

  onAlarmHandler(alarm) {
    // When alarm fires check for sync updates
    if (alarm && alarm.name === Globals.Alarm.Name) {
      this.getLatestUpdates();
    }
  }

  onBookmarkEventHandler(...args) {
    // Clear timeout
    if (this.processBookmarkEventsTimeout) {
      this.$timeout.cancel(this.processBookmarkEventsTimeout);
    }

    // Add event to the queue and trigger processing after a delay
    this.bookmarkEventsQueue.push(args);
    this.processBookmarkEventsTimeout = this.$timeout(this.processBookmarkEventsQueue, 200);
  }

  onChangedHandler(...args) {
    this.utilitySvc.logInfo('onChanged event detected');
    this.onBookmarkEventHandler(this.changeBookmark, args);
  }

  onCreatedHandler(...args) {
    this.utilitySvc.logInfo('onCreated event detected');
    this.onBookmarkEventHandler(this.createBookmark, args);
  }

  onInstallHandler(event) {
    if (this.startupInitiated) {
      return;
    }

    this.startupInitiated = true;
    const currentVersion = browser.runtime.getManifest().version;
    let installOrUpgrade = this.$q.resolve();

    // Check for upgrade or do fresh install
    const details = angular.element(event.currentTarget).data('details');
    if (details && details.reason === 'install') {
      installOrUpgrade = this.installExtension(currentVersion);
    } else if (
      details &&
      details.reason === 'update' &&
      details.previousVersion &&
      compareVersions.compare(details.previousVersion, currentVersion, '<')
    ) {
      installOrUpgrade = this.upgradeExtension(details.previousVersion, currentVersion);
    }

    // Run startup process after install/upgrade
    installOrUpgrade.then(this.init);
  }

  onMessageHandler(message, sender, sendResponse) {
    const mapIdsBeforeSendResponse = (callbackInfo) => {
      if (message.type === Globals.SyncType.Push && callbackInfo && callbackInfo.success === true) {
        return this.bookmarkSvc
          .getCachedBookmarks()
          .then((syncedBookmarks) => {
            return this.platformSvc.bookmarks_BuildIdMappings(syncedBookmarks);
          })
          .catch((err) => {
            return this.bookmarkSvc.disableSync().then(() => {
              callbackInfo = { error: err, success: false };
            });
          })
          .finally(() => {
            sendResponse(callbackInfo);
          });
      }

      sendResponse(callbackInfo);
    };

    switch (message.command) {
      // Queue bookmarks sync
      case Globals.Commands.SyncBookmarks:
        this.queueBookmarksSync(message, mapIdsBeforeSendResponse);
        break;
      // Trigger bookmarks restore
      case Globals.Commands.RestoreBookmarks:
        this.restoreBookmarks(message, sendResponse);
        break;
      // Get current sync in progress
      case Globals.Commands.GetCurrentSync:
        this.getCurrentSync(sendResponse);
        break;
      // Get current number of syncs on the queue
      case Globals.Commands.GetSyncQueueLength:
        this.getSyncQueueLength(sendResponse);
        break;
      // Disable sync
      case Globals.Commands.DisableSync:
        this.disableSync(sendResponse);
        break;
      // Enable event listeners
      case Globals.Commands.EnableEventListeners:
        this.enableEventListeners(sendResponse);
        break;
      // Disable event listeners
      case Globals.Commands.DisableEventListeners:
        this.disableEventListeners(sendResponse);
        break;
      // Unknown command
      default:
        const err = new Error(`Unknown command: ${message.command}`);
        this.utilitySvc.logError(err, 'background.onMessageHandler');
        sendResponse({ error: err, success: false });
    }

    // Enable async response
    return true;
  }

  onMovedHandler(...args) {
    this.utilitySvc.logInfo('onMoved event detected');
    this.onBookmarkEventHandler(this.moveBookmark, args);
  }

  onNotificationClicked(notificationId) {
    // Execute the event handler if one exists and then remove
    const notificationClickHandler = this.notificationClickHandlers.find((x) => {
      return x.id === notificationId;
    });
    if (notificationClickHandler != null) {
      notificationClickHandler.eventHandler();
      browser.notifications.clear(notificationId);
    }
  }

  onNotificationClosed(notificationId) {
    // Remove the handler for this notification if one exists
    const index = this.notificationClickHandlers.findIndex((x) => {
      return x.id === notificationId;
    });
    if (index >= 0) {
      this.notificationClickHandlers.splice(index, 1);
    }
  }

  onRemovedHandler(...args) {
    this.utilitySvc.logInfo('onRemoved event detected');
    this.onBookmarkEventHandler(this.removeBookmark, args);
  }

  onStartupHandler() {
    if (this.startupInitiated) {
      return;
    }

    this.init();
  }

  processBookmarkEventsQueue() {
    const doActionUntil = () => {
      return this.$q.resolve(this.bookmarkEventsQueue.length === 0);
    };

    const action = () => {
      // Get first event in the queue
      const currentEvent = this.bookmarkEventsQueue.shift();
      return currentEvent[0].apply(this, currentEvent[1]);
    };

    // Iterate through the queue and process the events
    this.utilitySvc.promiseWhile(this.bookmarkEventsQueue, doActionUntil, action).then(() => {
      this.$timeout(() => {
        this.bookmarkSvc
          .executeSync()
          .then((syncSuccess) => {
            if (!syncSuccess) {
              return;
            }

            // Move local containers into the correct order
            return this.platformSvc
              .eventListeners_Disable()
              .then(this.platformSvc.bookmarks_ReorderContainers)
              .then(this.platformSvc.eventListeners_Enable);
          })
          .catch((err) => {
            // If local data out of sync, queue refresh sync
            let errToDisplay = err;
            return (this.bookmarkSvc.checkIfRefreshSyncedDataOnError(err)
              ? this.refreshLocalSyncData()
              : this.$q.resolve()
            )
              .catch((refreshErr) => {
                errToDisplay = refreshErr;
              })
              .finally(() => {
                // Display alert
                const errMessage = this.platformSvc.getErrorMessageFromException(errToDisplay);
                this.displayAlert(errMessage.title, errMessage.message);
              });
          });
      }, 100);
    });
  }

  queueBookmarksSync(syncData, callback, runSync?) {
    runSync = runSync === undefined ? true : runSync;
    callback = callback || (() => {});

    // Queue sync
    return this.bookmarkSvc
      .queueSync(syncData, runSync)
      .then(() => {
        callback({ success: true });
      })
      .catch((err) => {
        // If local data out of sync, queue refresh sync
        return (this.bookmarkSvc.checkIfRefreshSyncedDataOnError(err)
          ? this.refreshLocalSyncData()
          : this.$q.resolve()
        ).then(() => {
          callback({ error: err, success: false });
        });
      });
  }

  refreshLocalSyncData() {
    return this.bookmarkSvc.queueSync({ type: Globals.SyncType.Pull }).then(() => {
      this.utilitySvc.logInfo('Local sync data refreshed');
    });
  }

  removeBookmark(id, removeInfo) {
    // Create change info
    const changeInfo = {
      bookmark: removeInfo.node,
      type: Globals.UpdateType.Delete
    };

    // Queue sync
    this.queueBookmarksSync(
      {
        changeInfo,
        type: Globals.SyncType.Push
      },
      (response) => {
        if (!response.success) {
          // Display alert
          const errMessage = this.platformSvc.getErrorMessageFromException(response.error);
          this.displayAlert(errMessage.title, errMessage.message);
        }
      },
      false
    );

    return this.$q.resolve();
  }

  restoreBookmarks(restoreData, sendResponse) {
    sendResponse = sendResponse || (() => {});

    return this.$q((resolve, reject) => {
      this.disableEventListeners((response) => {
        if (response.success) {
          resolve();
        } else {
          reject(response.error);
        }
      });
    })
      .then(() => {
        // Upgrade containers to use current container names
        return this.bookmarkSvc.upgradeContainers(restoreData.bookmarks || []);
      })
      .then((bookmarksToRestore) => {
        // Queue sync
        restoreData.bookmarks = bookmarksToRestore;
        return this.queueBookmarksSync(restoreData, sendResponse);
      });
  }

  upgradeExtension(oldVersion, newVersion) {
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
        // Display alert and set update panel to show
        this.displayAlert(
          this.platformSvc.getConstant(Strings.appUpdated_Title) + Globals.AppVersion,
          this.platformSvc.getConstant(Strings.appUpdated_Message),
          Globals.ReleaseNotesUrlStem + Globals.AppVersion
        );
        return this.storeSvc.set(Globals.CacheKeys.DisplayUpdated, true);
      })
      .catch((err) => {
        this.utilitySvc.logError(err, 'background.upgradeExtension');

        // Display alert
        const errMessage = this.platformSvc.getErrorMessageFromException(err);
        this.displayAlert(errMessage.title, errMessage.message);
      });
  }

  upgradeTo153() {
    // Convert local storage items to IndexedDB
    return browser.storage.local
      .get()
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
        return browser.storage.local.clear();
      })
      .then(() => {
        // If sync enabled, create id mappings
        return this.storeSvc.get(Globals.CacheKeys.SyncEnabled).then((syncEnabled) => {
          if (!syncEnabled) {
            return;
          }
          return this.bookmarkSvc.getCachedBookmarks().then((cachedBookmarks) => {
            return this.platformSvc.bookmarks_BuildIdMappings(cachedBookmarks);
          });
        });
      });
  }
}
