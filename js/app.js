var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.Controller 
 * Description: Main angular controller class for the app.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Controller = function($scope, $q, $timeout, complexify, platform, globals, api, utility, bookmarks, platformImplementation) { 
	'use strict';    
    var vm, moduleName = 'xBrowserSync.App.Controller';
    
/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
 
    var BrowserAction = function() {
        vm = this;
        vm.globals = globals;
        vm.platform = platform; 
        vm.scope = $scope;

        vm.loading = true;
        vm.working = false;
		
		vm.alert = {
			show: false,
			title: '',
			message: '',
			type: '',
			display: function(title, message, alertType) {
				vm.alert.title = title;
				vm.alert.message = message;
				vm.alert.type = alertType;
				vm.alert.show = true;
			}
		};
        
        vm.bookmark = {
            active: false,
            current: null,
            currentUrl: null,
            descriptionFieldOriginalHeight: null,
            displayUpdateForm : false,
            originalUrl: null,
            tagText: null
        };
        
        vm.domElements = {
            btnRestoreData: function() {
                if (!vm.settings.dataToRestore) {
                    return platform.GetConstant(globals.Constants.Button_RestoreData_Label);
                }
                
                if (!vm.settings.dataToRestoreIsValid()) {
                    return platform.GetConstant(globals.Constants.Button_RestoreData_Invalid_Label);
                }
                
                return platform.GetConstant(globals.Constants.Button_RestoreData_Ready_Label);
            }
        };
        
        vm.events = {
            aboutPanel_Close_Click: aboutPanel_Close_Click,
            backupRestoreForm_Backup_Click: backupRestoreForm_Backup_Click,
            backupRestoreForm_DisplayRestoreForm_Click: backupRestoreForm_DisplayRestoreForm_Click,
            backupRestoreForm_DisplayRestoreConfirmation_Click: backupRestoreForm_DisplayRestoreConfirmation_Click,
            backupRestoreForm_Restore_Click: backupRestoreForm_Restore_Click,
            backupRestoreForm_SelectBackupFile_Click: backupRestoreForm_SelectBackupFile_Click,
            bookmarkForm_BookmarkDescription_Change: bookmarkForm_BookmarkDescription_Change,
            bookmarkForm_BookmarkTags_Autocomplete: bookmarkForm_BookmarkTags_Autocomplete,
            bookmarkForm_BookmarkTags_Change: bookmarkForm_BookmarkTags_Change,
            bookmarkForm_BookmarkTags_Click: bookmarkForm_BookmarkTags_Click,
            bookmarkForm_BookmarkTags_KeyDown: bookmarkForm_BookmarkTags_KeyDown,
            bookmarkForm_BookmarkUrl_Change: bookmarkForm_BookmarkUrl_Change,
            bookmarkForm_CreateBookmark_Click: bookmarkForm_CreateBookmark_Click,
            bookmarkForm_CreateTags_Click: bookmarkForm_CreateTags_Click,
            bookmarkForm_DeleteBookmark_Click: bookmarkForm_DeleteBookmark_Click,
            bookmarkForm_RemoveTag_Click: bookmarkForm_RemoveTag_Click,
            bookmarkForm_ShareBookmark_Click: platform.Bookmarks.Share,
            bookmarkForm_UpdateBookmark_Click: bookmarkForm_UpdateBookmark_Click,
            displayQRCode_Click: displayQRCode_Click,
            handleSyncResponse: handleSyncResponse,
            introPanel_ShowHelp_Click: introPanel_ShowHelp_Click,
            introPanel1_Next_Click: introPanel1_Next_Click,
            introPanel2_Next_Click: introPanel2_Next_Click,
            introPanel2_Prev_Click: introPanel2_Prev_Click,
            introPanel3_Next_Click: introPanel3_Next_Click,
            introPanel3_Prev_Click: introPanel3_Prev_Click,
            introPanel4_Next_Click: introPanel4_Next_Click,
            introPanel4_Prev_Click: introPanel4_Prev_Click,
            introPanel5_Next_Click: introPanel5_Next_Click,
            introPanel5_Prev_Click: introPanel5_Prev_Click,
            introPanel6_Next_Click: introPanel6_Next_Click,
            introPanel6_Prev_Click: introPanel6_Prev_Click,
            introPanel7_Next_Click: introPanel7_Next_Click,
            introPanel7_Prev_Click: introPanel7_Prev_Click,
            introPanel8_Next_Click: introPanel8_Next_Click,
            introPanel8_Prev_Click: introPanel8_Prev_Click,
            introPanel9_Next_Click: introPanel9_Next_Click,
            introPanel9_Prev_Click: introPanel9_Prev_Click,
            introPanel10_Next_Click: introPanel10_Next_Click,
            introPanel10_Prev_Click: introPanel10_Prev_Click,
            introPanel11_Next_Click: introPanel11_Next_Click,
            introPanel11_Prev_Click: introPanel11_Prev_Click,
            introPanel12_Next_Click: introPanel12_Next_Click,
            introPanel12_Prev_Click: introPanel12_Prev_Click,
            introPanel13_Next_Click: introPanel13_Next_Click,
            introPanel13_Prev_Click: introPanel13_Prev_Click,
            introPanel14_Prev_Click: introPanel14_Prev_Click,
            openUrl: openUrl,
            queueSync: queueSync,
            searchForm_Clear_Click: searchForm_Clear_Click,
            searchForm_DeleteBookmark_Click: searchForm_DeleteBookmark_Click,
            searchForm_ScanCode_Click: searchForm_ScanCode_Click,
            searchForm_SearchText_Autocomplete: searchForm_SearchText_Autocomplete,
            searchForm_SearchText_Change: searchForm_SearchText_Change,
            searchForm_SearchText_KeyDown: searchForm_SearchText_KeyDown,
            searchForm_SearchResult_KeyDown: searchForm_SearchResult_KeyDown,
            searchForm_SearchResults_Scroll: searchForm_SearchResults_Scroll,
            searchForm_SelectBookmark_Press: searchForm_SelectBookmark_Press,
            searchForm_ShareBookmark_Click: platform.Bookmarks.Share,
            searchForm_UpdateBookmark_Click: searchForm_UpdateBookmark_Click,
            syncPanel_SyncBookmarksToolbar_Click: syncPanel_SyncBookmarksToolbar_Click,
            syncPanel_SyncBookmarksToolbar_Confirm: syncPanel_SyncBookmarksToolbar_Confirm,
            syncForm_CancelSyncConfirmation_Click: syncForm_CancelSyncConfirmation_Click,
            syncForm_ClientSecret_Change: syncForm_ClientSecret_Change,
            syncForm_ConfirmSync_Click: startSyncing,
            syncForm_DisableSync_Click: syncForm_DisableSync_Click,
            syncForm_EnableSync_Click: syncForm_EnableSync_Click,
            syncPanel_DisplayDataUsage_Click: syncPanel_DisplayDataUsage_Click,
            syncPanel_DisplaySyncOptions_Click: syncPanel_DisplaySyncOptions_Click,
            searchForm_ToggleBookmark_Click: searchForm_ToggleBookmark_Click,
            updateServiceUrlForm_Cancel_Click: updateServiceUrlForm_Cancel_Click,
            updateServiceUrlForm_Confirm_Click: updateServiceUrlForm_Confirm_Click,
            updateServiceUrlForm_Display_Click: updateServiceUrlForm_Display_Click,
            updateServiceUrlForm_Update_Click: updateServiceUrlForm_Update_Click,
            updateServiceUrlForm_Update_KeyPress: updateServiceUrlForm_Update_KeyPress
        };

        vm.introduction = {
            displayIntro: function(value) {
                return arguments.length ? 
                    globals.DisplayIntro.Set(value) : 
                    globals.DisplayIntro.Get();
            },
            displayPanel: function(panelToDisplay) {
                if (!panelToDisplay || panelToDisplay > vm.introduction.currentPanel) {
                    var panels = document.querySelectorAll('.intro-panel > div');

                    for (var i = 0; i < panels.length; i++) {
                        panels[i].classList.remove('reverse');
                    }
                }
                else if (panelToDisplay < vm.introduction.currentPanel) {
                    document.querySelector('#intro-panel-' + vm.introduction.currentPanel).classList.add('reverse');
                    document.querySelector('#intro-panel-' + panelToDisplay).classList.add('reverse');
                }
                
                vm.introduction.showLogo = (!panelToDisplay) ? true : false;                
                vm.introduction.currentPanel = (!panelToDisplay) ? 0 : panelToDisplay;
            },
            showLogo: true,
            currentPanel: 0
        };

        vm.platformName = null;
        
        vm.search = {
            batchResultsNum: 10,
            cancelGetBookmarksRequest: null,
            displayDefaultState: displayDefaultSearchState,
            execute: searchBookmarks,
            getLookaheadTimeout: null,
            getSearchLookaheadTimeout: null,
            getSearchResultsTimeout: null,
            lastWord: null,
            lookahead: null,
            query: null,
            results: null,
            resultsDisplayed: 10,
            scrollDisplayMoreEnabled: true
        };
        
		vm.settings = {
            backupFileName: null,
			backupRestoreResult: null,
            dataToRestore: null,
            dataToRestoreIsValid: function() {
                return checkRestoreData(vm.settings.dataToRestore);
            },
            displayCancelSyncConfirmation: false,
			displayQRCode: false,
            displayRestoreConfirmation: false,
            displayRestoreForm: false,
            displaySyncBookmarksToolbarConfirmation: false,
            displaySyncDataUsage: false,
            displaySyncOptions: true,
            getSearchLookaheadDelay: 50,
            getSearchResultsDelay: 250,
			id: function(value) {
                return arguments.length ? 
                    globals.Id.Set(value) : 
                    globals.Id.Get();
            },
            syncBookmarksToolbar: function(value) {
                return arguments.length ? 
                    globals.SyncBookmarksToolbar.Set(value) : 
                    globals.SyncBookmarksToolbar.Get();
            },
			secret: function(value) {
                return arguments.length ? 
                    globals.ClientSecret.Set(value) : 
                    globals.ClientSecret.Get();
            },
            secretComplexity: null,
            service: {
                displayUpdateServiceUrlConfirmation: false,
                displayUpdateServiceUrlForm: false,
                newServiceUrl: '',
                status: globals.ServiceStatus.Online,
                statusMessage: '',
                url: function(value) {
                    return arguments.length ? 
                        globals.URL.Host.Set(value) : 
                        globals.URL.Host.Get();
                }
            },
            syncDataChart: null,
            syncDataMax: null,
            syncDataUsed: null,
            panels: { sync: 0, serviceStatus: 1, backupRestore: 2 },
            visiblePanel: 0
		};
		
		vm.sync = {
			asyncChannel: undefined,
            displaySyncConfirmation: false,
            enabled: function(value) {
                return arguments.length ? 
                    globals.SyncEnabled.Set(value) : 
                    globals.SyncEnabled.Get();
            },
            inProgress: function(value) {
                return arguments.length ? 
                    globals.IsSyncing.Set(value) : 
                    globals.IsSyncing.Get();
            },
            validateLogin: function() {
                return !!vm.settings.secret();
            }
		};

		vm.view = {
			current: (function() {
                if (!!globals.DisplayAboutOnStartup.Get()) {
                    return 4;
                }

                return globals.SyncEnabled.Get() ? 1 : 0;
            }()),
            change: changeView,
            displayMainView: function() {
                if (!!globals.SyncEnabled.Get()) {
                    vm.view.change(vm.view.views.search);
                }
                else {
                    vm.view.change(vm.view.views.login);
                }
            },
            views: { login: 0, search: 1, bookmark: 2, settings: 3, about: 4 }
		};
        
        // Initialise the app
        init();
    };
        
        
/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
	
	var aboutPanel_Close_Click = function() {
        // Turn off display about on startup
        globals.DisplayAboutOnStartup.Set(false);
        vm.view.displayMainView();
    };
    
    var backupRestoreForm_Backup_Click = function() {
		// Display loading overlay
        platform.Interface.Loading.Show();
        
        platform.BackupData()
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'backupRestoreForm_Backup_Click', utility.LogType.Error,
                    JSON.stringify(err));
                
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            })
            .finally(function() {
                platform.Interface.Loading.Hide();
            });
	};
    
    var backupRestoreForm_DisplayRestoreForm_Click = function() {
        // Display restore form 
        document.querySelector('#backupFile').value = null;
        vm.settings.backupFileName = null;
        vm.settings.backupRestoreResult = null;
        vm.settings.displayRestoreConfirmation = false;
        vm.settings.dataToRestore = '';
        vm.settings.displayRestoreForm = true;
        
        // Focus in restore textarea
        $timeout(function() {
            document.querySelector('#restoreForm textarea').select();
        });
    };
    
    var backupRestoreForm_DisplayRestoreConfirmation_Click = function() {
        // Display restore confirmation 
        vm.settings.displayRestoreConfirmation = true;
        
        // Focus on confirm button
        $timeout(function() {
            document.querySelector('#btn_ConfirmRestore').focus();
        });
    };
	
	var backupRestoreForm_Restore_Click = function(data) {
		if (!data) {
            // Display alert
            vm.alert.display(
                platform.GetConstant(globals.Constants.Error_NoDataToRestore_Title),
                platform.GetConstant(globals.Constants.Error_NoDataToRestore_Message), 
                'danger');
            
            return;
        }
        
        // Start restore
        restoreData(JSON.parse(data));
	};

    var backupRestoreForm_SelectBackupFile_Click = function() {
        platform.SelectFile();
    }; 
    
    var bookmarkForm_BookmarkDescription_Change = function() {
        // Limit the bookmark description to the max length
        vm.bookmark.current.description = utility.TrimToNearestWord(vm.bookmark.current.description, globals.Bookmarks.DescriptionMaxLength);
    };

    var bookmarkForm_BookmarkTags_Autocomplete = function() {
        vm.bookmark.tagText += vm.bookmark.tagLookahead.replace(/&nbsp;/g, ' ');
        bookmarkForm_BookmarkTags_Change();
        document.querySelector('input[name="bookmarkTags"]').focus();
    };
    
    var bookmarkForm_BookmarkTags_Change = function() {
        vm.alert.show = false;
        vm.bookmark.tagLookahead = null;

        if (!vm.bookmark.tagText || !vm.bookmark.tagText.trim()) {
            return;
        }

        // Get last word of tag text
        var matches = vm.bookmark.tagText.match(/[^,]+$/);
        var lastWord = (!!matches) ? matches[0].trimLeft() : null;

        // Display lookahead if word length exceeds minimum
        if (!!lastWord && lastWord.length > globals.LookaheadMinChars) {
            // Get tags lookahead
            bookmarks.GetLookahead(lastWord.toLowerCase(), null, null, true)
                .then(function(results) {
                    if (!results) {
                        return;
                    }
                    
                    var lookahead = results[0];
                    var word =  results[1];
                    
                    // Display lookahead
                    if (!!lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
                        // Trim word from lookahead
                        lookahead = (!!lookahead) ? lookahead.substring(word.length) : null;
                        vm.bookmark.tagLookahead = lookahead.replace(/\s/g, '&nbsp;');
                        vm.bookmark.tagTextMeasure = vm.bookmark.tagText.replace(/\s/g, '&nbsp;');
                    }
                });
        }
    };

    var bookmarkForm_BookmarkTags_Click = function() {
        vm.bookmark.tagText += vm.bookmark.tagLookahead.replace(/&nbsp;/g, ' ');
        bookmarkForm_CreateTags_Click();
        document.querySelector('input[name="bookmarkTags"]').focus();
    };
    
    var bookmarkForm_BookmarkTags_KeyDown = function(event) {
        switch (true) {
            // If user pressed Enter
            case (event.keyCode === 13):
                // Add new tags
                event.preventDefault();
                bookmarkForm_CreateTags_Click();
                break;
            // If user pressed tab or right arrow key and lookahead present
            case ((event.keyCode === 9 || event.keyCode === 39) && !!vm.bookmark.tagLookahead):
                // Add lookahead to search query
                event.preventDefault();
                bookmarkForm_BookmarkTags_Autocomplete();
                break;
        }
    };
    
    var bookmarkForm_BookmarkUrl_Change = function() {
        // Reset invalid service validator
        vm.bookmarkForm.bookmarkUrl.$setValidity('InvalidUrl', true);

        var isValid = true;
        
        if (!vm.bookmark.current.url) {
            isValid = false;
        }
        else {
            if (vm.bookmark.current.url.toLowerCase()[0] !== 'h') {
                vm.bookmark.current.url = 'http://' + vm.bookmark.current.url;
            }
            
            // Check url is valid
            var matches = vm.bookmark.current.url.match(/^https?:\/\/\w+/i);        
            if (!matches || matches.length <= 0) {
                isValid = false;
            }
        }

        if (!isValid) {
            vm.bookmarkForm.bookmarkUrl.$setValidity('InvalidUrl', false);
        }
    };
    
    var bookmarkForm_CreateBookmark_Click = function() {
        var bookmarkToCreate = vm.bookmark.current;
        
        // Validate url
        bookmarkForm_BookmarkUrl_Change();
        
        if (!vm.bookmarkForm.$valid) {
			document.querySelector('#bookmarkForm .ng-invalid').focus();
            return;
		}

        // Add tags if tag text present
        if (!!vm.bookmark.tagText && vm.bookmark.tagText.length > 0) {
            bookmarkForm_CreateTags_Click();
        }
        
        // Add the new bookmark and sync
        platform.Sync(vm.sync.asyncChannel, {
            type: globals.SyncType.Both,
            changeInfo: { 
                type: globals.UpdateType.Create, 
                bookmark: bookmarkToCreate
            }
        });
        
        vm.view.change(vm.view.views.search)
            .then(function() {
                // Add new bookmark into search results on mobile apps
                if (vm.platformName === vm.globals.Platforms.Android ||
                    vm.platformName === vm.globals.Platforms.IOS) {
                    bookmarkToCreate.class = 'added';
                    $timeout(function() {
                        vm.search.results.unshift(bookmarkToCreate);
                    });
                }
            });
    };
    
    var bookmarkForm_CreateTags_Click = function() {
        // Clean and sort tags and add them to tag array
        var newTags = utility.GetTagArrayFromText(vm.bookmark.tagText);        
        vm.bookmark.current.tags = _.sortBy(_.union(newTags, vm.bookmark.current.tags), function(tag) {
            return tag;
        });

        bookmarkForm_ResizeDescriptionField();
        vm.bookmark.tagText = '';
        vm.bookmark.tagLookahead = '';
        document.querySelector('input[name="bookmarkTags"]').focus();
    };
    
    var bookmarkForm_DeleteBookmark_Click = function() {
        var bookmarkToDelete = vm.bookmark.current;
        
        // Get current page url
		platform.GetCurrentUrl()
            .then(function(currentUrl) {
                // Delete the bookmark
                platform.Sync(vm.sync.asyncChannel, {
                    type: globals.SyncType.Both,
                    changeInfo: { 
                        type: globals.UpdateType.Delete, 
                        id: bookmarkToDelete.id
                    }
                });
                
                // Set bookmark active status if current bookmark is current page 
                if (!!currentUrl && currentUrl.toUpperCase() === vm.bookmark.originalUrl.toUpperCase()) {
                    vm.bookmark.active = false;
                }
                
                // Display the search panel
                return vm.view.change(vm.view.views.search);
            })
            .then(function() {
                // Find and delete the deleted bookmark element in the search results on mobile apps
                if (vm.platformName === vm.globals.Platforms.Android ||
                    vm.platformName === vm.globals.Platforms.IOS) {
                    if (!!vm.search.results && vm.search.results.length >= 0) {
                        var deletedBookmarkIndex = _.findIndex(vm.search.results, function(result) { 
                            return result.id === bookmarkToDelete.id; 
                        });

                        if (deletedBookmarkIndex >= 0) {
                            vm.search.results[deletedBookmarkIndex].class = 'deleted';
                            $timeout(function() {
                                vm.search.results.splice(deletedBookmarkIndex, 1);
                            });
                        }
                    }
                }
            })
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'bookmarkForm_DeleteBookmark_Click', utility.LogType.Error,
                    JSON.stringify(err));
                
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            });
    };

    var bookmarkForm_Init = function() {
        // If form properties already set, return 
        if (!!vm.bookmark.current) {
            vm.bookmark.displayUpdateForm = true;
            return $q.resolve();
        }
        
        var deferred = $q.defer();
        
        // Display loading overlay 
        var displayLoadingPanelTimeout = platform.Interface.Loading.Show(true);

        // Check if current url is a bookmark
        bookmarks.IncludesCurrentPage()
            .then(function(result) {
				if (!!result) {
                    // Remove search score and set current bookmark to result
                    delete result.score;
                    vm.bookmark.current = result;
                    
                    // Display update bookmark form and return
                    vm.bookmark.displayUpdateForm = true;
                    return deferred.resolve();
                }
                else {
                    // Otherwise get page metadata for current url
                    return platform.GetPageMetadata();
                }
            })
            .then(function(metadata) {
                    if (!metadata) {
                        return;
                    }
                    
                    // Set form properties to url metadata
                    var bookmark = new bookmarks.XBookmark(
                        metadata.title, 
                        metadata.url, 
                        metadata.description,
                        utility.GetTagArrayFromText(metadata.tags));
                    vm.bookmark.current = bookmark;
                    
                    // Display add bookmark form
                    vm.bookmark.displayUpdateForm = false;
                    return deferred.resolve();
            })
            .catch(function(err) {
                // Set bookmark url
                if (!!err && !!err.url) {
                    var bookmark = new bookmarks.XBookmark(
                        '', 
                        err.url);
                    vm.bookmark.current = bookmark;
                }
                
                // Log error
                utility.LogMessage(
                    moduleName, 'bookmarkForm_Init', utility.LogType.Error,
                    JSON.stringify(err));
                
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');

                return deferred.resolve();
            })
            .finally(function() {
                platform.Interface.Loading.Hide(displayLoadingPanelTimeout);
            });
        
        return deferred.promise;
    };
    
    var bookmarkForm_RemoveTag_Click = function(tag) {
        vm.bookmark.current.tags = _.without(vm.bookmark.current.tags, tag);
        bookmarkForm_ResizeDescriptionField();
        document.querySelector('#bookmarkForm input[name="bookmarkTags"]').focus();
    };

    var bookmarkForm_ResizeDescriptionField = function() {
        $timeout(function() {
            var descriptionField = document.querySelector('textarea[name="bookmarkDescription"]');
            var container = document.querySelector('.container');
            var lessHeight = container.scrollHeight - container.offsetHeight;

            if (lessHeight > 0) {
                // Remove the height of the tags area container the description field
                var newHeight = descriptionField.offsetHeight - lessHeight - 15;
                descriptionField.style.height = newHeight + 'px';
            }
        });
    };
    
    var bookmarkForm_UpdateBookmark_Click = function() {
        var bookmarkToUpdate = vm.bookmark.current;
        
        // Validate url
        bookmarkForm_BookmarkUrl_Change();
        
        // Return if the form is not valid
		if (!vm.bookmarkForm.$valid) {
			document.querySelector('#bookmarkForm .ng-invalid').focus();
            return;
		}

        // Add tags if tag text present
        if (!!vm.bookmark.tagText && vm.bookmark.tagText.length > 0) {
            bookmarkForm_CreateTags_Click();
        }
        
        // Get current page url
		platform.GetCurrentUrl()
            .then(function(currentUrl) {
                // Update the bookmark
                platform.Sync(vm.sync.asyncChannel, {
                    type: globals.SyncType.Both,
                    changeInfo: { 
                        type: globals.UpdateType.Update, 
                        bookmark: bookmarkToUpdate
                    }
                });

                // Set bookmark active status if current bookmark is current page 
                if (!!currentUrl && currentUrl.toUpperCase() === vm.bookmark.originalUrl.toUpperCase()) {
                    vm.bookmark.active = (currentUrl.toUpperCase() === bookmarkToUpdate.url.toUpperCase());
                }
                
                // Display the search panel
                return vm.view.change(vm.view.views.search);
            })
            .then(function() {
                // Find and update the updated bookmark element in the search results on mobile apps
                if (vm.platformName === vm.globals.Platforms.Android ||
                    vm.platformName === vm.globals.Platforms.IOS) {
                    if (!!vm.search.results && vm.search.results.length >= 0) {
                        var updatedBookmarkIndex = _.findIndex(vm.search.results, function(result) { 
                            return result.id === bookmarkToUpdate.id;
                        });

                        if (updatedBookmarkIndex >= 0) {
                            // Add host if bookmark has no title
                            if (!bookmarkToUpdate.title) { 
                                var hyperlinkElement = document.createElement('a');                        
                                hyperlinkElement.href = bookmarkToUpdate.url;
                                bookmarkToUpdate.host = hyperlinkElement.host;
                            }
                            else if (!!bookmarkToUpdate.host) {
                                delete bookmarkToUpdate.host;
                            }

                            $timeout(function() {
                                vm.search.results[updatedBookmarkIndex] = bookmarkToUpdate;
                            });
                        }
                    }
                }
            })
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'bookmarkForm_UpdateBookmark_Click', utility.LogType.Error,
                    JSON.stringify(err));
                
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            });
    };

    var changeView = function(view) {
        var deferred = $q.defer();
        vm.alert.show = false;
        platform.Interface.Loading.Hide();
        
        // Reset current view
        switch(vm.view.current) {
            case vm.view.views.bookmark:
                vm.bookmarkForm.$setPristine();
                vm.bookmarkForm.$setUntouched();
                vm.bookmarkForm.bookmarkUrl.$setValidity('InvalidUrl', true);
                vm.bookmark.current = null;
                vm.bookmark.tagText = null;
                vm.bookmark.tagTextMeasure = null;
                vm.bookmark.tagLookahead = null;
                document.querySelector('textarea[name="bookmarkDescription"]').style.height = null;
                vm.bookmark.displayUpdateForm = false;
                break;
            case vm.view.views.settings:
                vm.settings.visiblePanel = vm.settings.panels.sync;
                vm.settings.displayCancelSyncConfirmation = false;
                vm.settings.displayQRCode = false;
                vm.settings.displaySyncDataUsage = false;
                vm.settings.displayRestoreConfirmation = false;
                vm.settings.displayRestoreForm = false;
                vm.settings.displaySyncBookmarksToolbarConfirmation = false;  
                vm.settings.service.displayUpdateServiceUrlConfirmation = false;
                vm.settings.service.displayUpdateServiceUrlForm = false;
                updateServiceUrlForm_SetValidity(true);
                document.querySelector('#backupFile').value = null;
                vm.settings.backupFileName = null;
                vm.settings.backupRestoreResult = null;
                vm.settings.dataToRestore = '';
                break;
            case vm.view.views.login:
                if (!vm.introduction.displayIntro()) {
                    vm.introduction.displayPanel();
                }
                
                vm.sync.displaySyncConfirmation = false;
                if (vm.syncForm) {
                    vm.syncForm.$setPristine();
                    vm.syncForm.$setUntouched();
                }
                break;
        }

        vm.view.current = view;           
        
        // Initialise new view
        switch(view) {
            case vm.view.views.search:
                vm.search.displayDefaultState();
                $timeout(function() {
                    platform.Interface.Refresh();
                    $timeout(function() {
                        deferred.resolve();
                    }, 100);
                });
                break;
            case vm.view.views.bookmark:
                // Set bookmark form properties
                bookmarkForm_Init()
                    .then(function() {
                        // Save url to compare for changes
                        vm.bookmark.originalUrl = vm.bookmark.current.url;

                        // Resize description field to account for tags
                        bookmarkForm_ResizeDescriptionField();
                        $timeout(function() {
                            bookmarkForm_ResizeDescriptionField();
                            
                            // Don't focus on title field for mobile apps unless not sharing a bookmark
                            if ((vm.platformName !== vm.globals.Platforms.Android &&
                                vm.platformName !== vm.globals.Platforms.IOS) ||
                                vm.bookmark.current.url === 'http://') {
                                document.querySelector('input[name="bookmarkTitle"]').focus();
                            }
                            return deferred.resolve();
                        }, 100);
                    });
                break;
            case vm.view.views.settings:
                vm.settings.displaySyncOptions = !globals.SyncEnabled.Get();
                
                // Get service status
                api.CheckServiceStatus()
                    .then(function(serviceInfo) {
                        // Set service info
                        setServiceInformation(serviceInfo);
                    })
                    .catch(function(err) {
                        // Log error
                        utility.LogMessage(
                            moduleName, 'changeView', utility.LogType.Error,
                            JSON.stringify(err));
                        
                        vm.settings.service.status = globals.ServiceStatus.Offline;
                    })
                    .finally(deferred.resolve);
                
                // Set new service form url default value to current service url
                vm.settings.service.newServiceUrl = vm.settings.service.url();
                break;
        }
        
        return deferred.promise;
    };
	
	var checkRestoreData = function(data) {
		var validData = false;
		
		if (!!data) {
			try {
				data = JSON.parse(data);
				
				if (!!data.xBrowserSync && !!data.xBrowserSync.bookmarks) {
					validData = true;
				}
			}
			catch(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'checkRestoreData', utility.LogType.Error,
                    JSON.stringify(err));
            }
		}
		
		return validData;
	};

    var displayDefaultSearchState = function() {
        // Clear search and results
        vm.search.query = null;
        vm.search.lookahead = null;
        vm.search.results = null;

        // Focus on search box
        $timeout(function() {
            document.querySelector('input[name=txtSearch]').focus();
        }, 100);
    };
    
    var displayQRCode_Click = function() {
        // Generate new QR code
        new QRious({
            element: document.getElementById('qr'),
            value: vm.settings.id()
        });

        vm.settings.displayQRCode = true;
    };
    
    var handleSyncResponse = function(response) {
        var errMessage;
        
        switch(response.command) {
            // After syncing bookmarks
            case globals.Commands.SyncBookmarks:
                if (response.success) {
                    // Enable sync
                    if (!globals.SyncEnabled.Get()) {
                        globals.SyncEnabled.Set(true);
                    }

                    // Disable the intro animation
                    vm.introduction.displayIntro(false);
                    
                    // If initial sync, switch to search panel
                    if (vm.view.current === vm.view.views.login) {
                    	vm.view.change(vm.view.views.search);
                    }

                    // Update bookmark icon
                    setBookmarkStatus();
                }
                else {
                    errMessage = utility.GetErrorMessageFromException(response.error);
                    vm.alert.display(errMessage.title, errMessage.message, 'danger');

                    // If data out of sync, refresh sync
                    if (!!response.error && !!response.error.code && response.error.code === globals.ErrorCodes.DataOutOfSync) {
                        platform.Sync(vm.sync.asyncChannel, { type: globals.SyncType.Pull });
                    }
                }

                platform.Interface.Loading.Hide();
                break;
            // After restoring bookmarks
            case globals.Commands.RestoreBookmarks:
                if (response.success) {
                    setBookmarkStatus();
                    
                    vm.settings.displayRestoreForm = false;
                    vm.settings.displayRestoreConfirmation = false;
                    vm.settings.dataToRestore = '';
                    vm.settings.backupRestoreResult = platform.GetConstant(globals.Constants.RestoreSuccess_Message);
                    
                    $timeout(function() {
                        document.querySelector('#btn_RestoreComplete').focus();
                    });
                }
                else {
                    errMessage = utility.GetErrorMessageFromException(response.error);
                    vm.alert.display(errMessage.title, errMessage.message, 'danger');
                }
                
                platform.Interface.Loading.Hide();
                break;
            case globals.Commands.NoCallback:
                /* falls through */
            default:
                if (!response.success) {
                    errMessage = utility.GetErrorMessageFromException(response.error);
                    vm.alert.display(errMessage.title, errMessage.message, 'danger');
                }
                
                platform.Interface.Loading.Hide();
                break;
        }
    };

    var init = function() {
        // Reset network disconnected flag
        globals.Network.Disconnected.Set(false);

        // Platform-specific initation
        platform.Init(vm, $scope);
        
        // Display intro animation if required
        if (vm.view.current === vm.view.views.login && !!vm.introduction.displayIntro()) {
            introPanel_DisplayIntro();
        }
        
        // Attach events to new tab links
        $timeout(function() {
            setNewTabLinks();
        });

        // Check if current page is a bookmark
        setBookmarkStatus();
    };

    var introPanel_DisplayIntro = function() {
        vm.introduction.showLogo = false;

        $timeout(function() {
            vm.introduction.showLogo = true;

            $timeout(function() {
                vm.introduction.showLogo = false;

                $timeout(function() {
                    vm.introduction.displayPanel(1);
                }, 1000);
            }, 3000);
        }, 1000);
    };

    var introPanel_ShowHelp_Click = function() {
        vm.introduction.showLogo = false;
        
        $timeout(function() {
            vm.introduction.displayPanel(1);
        }, 500);
    };

    var introPanel1_Next_Click = function() {
        vm.introduction.displayPanel(2);
    };

    var introPanel2_Next_Click = function() {
        vm.introduction.displayPanel(3);
    };

    var introPanel2_Prev_Click = function() {
        vm.introduction.displayPanel(1);
    };

    var introPanel3_Next_Click = function() {
        vm.introduction.displayPanel(4);
    };

    var introPanel3_Prev_Click = function() {
        vm.introduction.displayPanel(2);
    };

    var introPanel4_Next_Click = function() {
        vm.introduction.displayPanel(5);
    };

    var introPanel4_Prev_Click = function() {
        vm.introduction.displayPanel(3);
    };

    var introPanel5_Next_Click = function() {
        vm.introduction.displayPanel(6);
    };

    var introPanel5_Prev_Click = function() {
        vm.introduction.displayPanel(4);
    };

    var introPanel6_Next_Click = function() {
        vm.introduction.displayPanel(7);
    };

    var introPanel6_Prev_Click = function() {
        vm.introduction.displayPanel(5);
    };

    var introPanel7_Next_Click = function() {
        vm.introduction.displayPanel(8);
    };

    var introPanel7_Prev_Click = function() {
        vm.introduction.displayPanel(6);
    };

    var introPanel8_Next_Click = function() {
        vm.introduction.displayPanel(9);
    };

    var introPanel8_Prev_Click = function() {
        vm.introduction.displayPanel(7);
    };

    var introPanel9_Next_Click = function() {
        vm.introduction.displayPanel(10);
    };

    var introPanel9_Prev_Click = function() {
        vm.introduction.displayPanel(8);
    };

    var introPanel10_Next_Click = function() {
        vm.introduction.displayPanel(11);
    };

    var introPanel10_Prev_Click = function() {
        vm.introduction.displayPanel(9);
    };

    var introPanel11_Next_Click = function() {
        vm.introduction.displayPanel(12);
    };

    var introPanel11_Prev_Click = function() {
        vm.introduction.displayPanel(10);
    };

    var introPanel12_Next_Click = function() {
        vm.introduction.displayPanel(13);
    };

    var introPanel12_Prev_Click = function() {
        vm.introduction.displayPanel(11);
    };

    var introPanel13_Next_Click = function() {
        vm.introduction.displayPanel(14);
    };

    var introPanel13_Prev_Click = function() {
        vm.introduction.displayPanel(12);
    };

    var introPanel14_Prev_Click = function() {
        vm.introduction.displayPanel(13);
    };
    
    var openUrl = function(event, url) {
        if (!!event.preventDefault) { 
            event.preventDefault();
        }

        if (!!url) {
            platform.OpenUrl(url);
        }
        else {
            platform.OpenUrl(event.currentTarget.href);
        }

        return false;
    };
	
	var queueSync = function() {
        var syncData = {};
        syncData.type = (!globals.Id.Get()) ? globals.SyncType.Push : globals.SyncType.Pull; 

        // Start sync
        platform.Sync(vm.sync.asyncChannel, syncData);
    };
	
	var restoreData = function(data, restoreCallback) {
		// Set ID and client secret if sync not enabled
        if (!globals.SyncEnabled.Get()) {
            globals.ClientSecret.Set('');
            vm.settings.secretComplexity = null;
            
            if (!!data.xBrowserSync.id) {
                globals.Id.Set(data.xBrowserSync.id);
            }
		}
        
        var bookmarksToRestore = data.xBrowserSync.bookmarks;
        
		// Return if no bookmarks found
		if (!bookmarksToRestore) {
            return restoreCallback();
        }

        // Display loading overlay 
        platform.Interface.Loading.Show();

        var syncData = {};
        syncData.type = (!globals.SyncEnabled.Get()) ? globals.SyncType.Pull : globals.SyncType.Both;
        syncData.bookmarks = bookmarksToRestore;
        
        // Start restore
        platform.Sync(vm.sync.asyncChannel, syncData, globals.Commands.RestoreBookmarks);
	};
    
    var searchBookmarks = function() {
        var queryData = {
            url: null,
            keywords: []
        };
        var urlRegex = /^(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]+\.[a-z]+\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;

        if (!!vm.search.query) {
            // Iterate query words to form query data object
            _.each(vm.search.query.split(/[\s]+/), function (queryWord) {
                // Add query word as url if query is in url format, otherwise add to keywords
                if (!queryData.url && queryWord.trim().match(urlRegex)) {
                    queryData.url = queryWord.trim();
                }
                else {
                    var keyword = queryWord.trim().replace("'", '').replace(/\W$/, '').toLowerCase();
                    if (!!keyword) {
                        queryData.keywords.push(queryWord.trim());
                    }
                }
            });
        }
        
        bookmarks.Search(queryData)
            .then(function(results) {
                // Add host to any bookmarks without titles
                var hyperlinkElement = document.createElement('a');
                _.chain(results)
                    .filter(function(result) { return !result.title; })
                    .each(function(result) { 
                        hyperlinkElement.href = result.url;
                        result.host = hyperlinkElement.host;
                    });
                
                vm.search.scrollDisplayMoreEnabled = false;
                vm.search.resultsDisplayed = vm.search.batchResultsNum;
                vm.search.results = results;

                // Scroll to top of search results
                $timeout(function() {
                    document.querySelector('.search-results-panel').scrollTop = 0;
                    vm.search.scrollDisplayMoreEnabled = true;
                });
            })
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'searchBookmarks', utility.LogType.Error,
                    JSON.stringify(err));
                
                vm.search.results = null;

                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            });
    };

    var searchForm_SearchText_Autocomplete = function() {
        vm.search.query += vm.search.lookahead;
        searchForm_SearchText_Change();
        $timeout(function() {
            document.querySelector('input[name=txtSearch]').focus();
        });
    };

    var searchForm_Clear_Click = function() {
        vm.search.displayDefaultState();
    };

    var searchForm_DeleteBookmark_Click = function(event, bookmark) {
        // Delete the bookmark
        platform.Sync(vm.sync.asyncChannel, {
            type: globals.SyncType.Both,
            changeInfo: { 
                type: globals.UpdateType.Delete, 
                id: bookmark.id
            }
        });
        
        // Find and remove the deleted bookmark element in the search results
        if (!!vm.search.results && vm.search.results.length > 0) {
            var deletedBookmarkIndex = _.findIndex(vm.search.results, function(result) { return result.id === bookmark.id; });
            if (deletedBookmarkIndex >= 0) {
                vm.search.results[deletedBookmarkIndex].class = 'deleted';
                $timeout(function() {
                    vm.search.results.splice(deletedBookmarkIndex, 1);
                });
            }
        }
    };

    var searchForm_ScanCode_Click = function() {
        platform.ScanID();
    };
    
    var searchForm_SearchText_Change = function() {
        vm.alert.show = false;
        
        // Clear timeouts
        if (!!vm.search.getSearchLookaheadTimeout) {
            $timeout.cancel(vm.search.getSearchLookaheadTimeout);
            vm.search.getSearchLookaheadTimeout = null;
        }

        if (!!vm.search.getSearchResultsTimeout) {
            $timeout.cancel(vm.search.getSearchResultsTimeout);
            vm.search.getSearchResultsTimeout = null;
        }
        
        // No query, clear results
        if (!vm.search.query.trim()) {
            vm.search.displayDefaultState();
            return;
        }

        // Get last word of search query
        var queryWords = vm.search.query.split(/[\s]+/);
        var lastWord = _.last(queryWords);
        var getLookahead;
        
        // Display lookahead if word length exceed minimum
        if (!!lastWord && lastWord.length > globals.LookaheadMinChars) {
            // Get lookahead after delay
            vm.search.getSearchLookaheadTimeout = $timeout(function() {
                // Enable searching animation if bookmark cache is empty
                if (!globals.Cache.Bookmarks.Get()) {
                    searchForm_ToggleSearchingAnimation(true);
                }
                
                // Cancel any exist http request to get bookmarks and refresh deferred
                if (!!vm.search.cancelGetBookmarksRequest && 
                    vm.search.cancelGetBookmarksRequest.promise.$$state.status === 0) {
                    vm.search.cancelGetBookmarksRequest.resolve();
                }
                vm.search.cancelGetBookmarksRequest = $q.defer();
                
                getLookahead = bookmarks.GetLookahead(lastWord.toLowerCase(), vm.search.results, vm.search.cancelGetBookmarksRequest.promise)
                    .then(function(results) {
                        if (!results) {
                            vm.search.lookahead = null;
                            return;
                        }

                        var lookahead = results[0];
                        var word =  results[1];
                        
                        if (!!lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
                            // Trim word from lookahead
                            lookahead = (!!lookahead) ? lookahead.substring(word.length) : null;
                            vm.search.lookahead = lookahead.replace(/\s/g, '&nbsp;');
                            vm.search.queryMeasure = vm.search.query.replace(/\s/g, '&nbsp;');
                        }

                        vm.search.cancelGetBookmarksRequest = null;
                    })
                    .catch(function(err) {
                        // Log error
                        utility.LogMessage(
                            moduleName, 'searchForm_SearchText_Change', utility.LogType.Error,
                            JSON.stringify(err));
                        
                        // Display alert
                        var errMessage = utility.GetErrorMessageFromException(err);
                        vm.alert.display(errMessage.title, errMessage.message, 'danger');
                    })
                    .finally(function() {
                        searchForm_ToggleSearchingAnimation(false);
                    });
            }, vm.settings.getSearchLookaheadDelay);
            
            // Execute search after timeout and once lookahead request is finished
            vm.search.getSearchResultsTimeout = $timeout(function() {
                getLookahead.then(searchBookmarks);
            }, vm.settings.getSearchResultsDelay);
        }
        else {
            vm.search.lookahead = null;
        }
    };
    
    var searchForm_SearchText_KeyDown = function(event) {
        // If user pressed enter and search text present
        if (event.keyCode === 13) {
            if (!!vm.search.getSearchResultsTimeout) {
                $timeout.cancel(vm.search.getSearchResultsTimeout);
                vm.search.getSearchResultsTimeout = null;
            }
            
            searchBookmarks();
            return;
        }
        
        // If user pressed down arrow and search results present
        if (event.keyCode === 40 && !!vm.search.results && vm.search.results.length > 0) {
            // Focus on first search result
            event.preventDefault();
            document.querySelector('.search-results-panel .list-group').firstElementChild.children[2].focus();
            return;
        }
        
        // If user pressed tab or right arrow key and lookahead present
        if ((event.keyCode === 9 || event.keyCode === 39) && !!vm.search.lookahead) {
            // Add lookahead to search query
            event.preventDefault();
            searchForm_SearchText_Autocomplete();
            return;
        }
    };
    
    var searchForm_SearchResult_KeyDown = function(event) {
        var currentIndex, newIndex;
        
        switch (true) {
            // Up arrow
            case (event.keyCode === 38):
                event.preventDefault();
            
                if (!!event.target.parentElement.previousElementSibling) {
                    // Focus on previous result
                    event.target.parentElement.previousElementSibling.children[2].focus();
                }
                else {
                    // Focus on search box
                    document.querySelector('input[name=txtSearch]').focus();
                }
                
                break;
            // Down arrow
            case (event.keyCode === 40):
                event.preventDefault();
            
                if (!!event.target.parentElement.nextElementSibling) {
                    // Focus on next result
                    event.target.parentElement.nextElementSibling.children[2].focus();
                }
                
                break;
            // Page up
            case (event.keyCode === 33):
                event.preventDefault();
            
                // Focus on result 6 down from current
                currentIndex = _.indexOf(event.target.parentElement.parentElement.children, event.target.parentElement);
                newIndex = currentIndex - 6;
                
                if (newIndex < 0) {
                    event.target.parentElement.parentElement.firstElementChild.children[2].focus();
                }
                else {
                    event.target.parentElement.parentElement.children[newIndex].children[2].focus();
                }
                
                break;
            // Page down
            case (event.keyCode === 34):
                event.preventDefault();
                
                // Focus on result 6 down from current
                currentIndex = _.indexOf(event.target.parentElement.parentElement.children, event.target.parentElement);
                newIndex = currentIndex + 6;
                
                if (event.target.parentElement.parentElement.children.length < newIndex) {
                    event.target.parentElement.parentElement.lastElementChild.children[2].focus();
                }
                else {
                    event.target.parentElement.parentElement.children[newIndex].children[2].focus();
                }
                
                break;
            // Home
            case (event.keyCode === 36):
                event.preventDefault();
            
                // Focus on first result
                event.target.parentElement.parentElement.firstElementChild.children[2].focus();
                
                break;
            // End
            case (event.keyCode === 35):
                event.preventDefault();
            
                // Focus on last result
                event.target.parentElement.parentElement.lastElementChild.children[2].focus();
                
                break;
            // Backspace
            case (event.keyCode === 8):
            // Space
            case (event.keyCode === 32):
            // Numbers and letters
            case (event.keyCode > 47 && event.keyCode < 112):
                // Focus on search box
                document.querySelector('input[name=txtSearch]').focus();
                break;
        }
    };

    var searchForm_SearchResults_Scroll = function() {
        if (!!vm.search.results && vm.search.results.length > 0 && !!vm.search.scrollDisplayMoreEnabled) {
            // Display next batch of results
            vm.search.resultsDisplayed += vm.search.batchResultsNum;
            vm.search.results = vm.search.results;
        } 
    };
    
    var searchForm_SelectBookmark_Press = function(event) {
        event.preventDefault();

        var bookmarkItem = event.target.parentNode;
        var isActive = _.contains(bookmarkItem.classList, 'active');

        _.each(document.querySelectorAll('.list-group-item.active'), function(obj) { 
            obj.classList.remove('active');
        });

        if (!isActive) {
            bookmarkItem.classList.add('active');
        }
    };
    
    var searchForm_ToggleBookmark_Click = function() {
        // Display bookmark panel
        vm.view.change(vm.view.views.bookmark);
    };
    
    var searchForm_ToggleSearchingAnimation = function(active) {
        var searchIcon = document.querySelector('.search-form i');
        
        if (active) {
            searchIcon.classList.add("animate-flash");
        }
        else {
            searchIcon.classList.remove("animate-flash");
        }
    };
    
    var searchForm_UpdateBookmark_Click = function(bookmark) {
        // Set bookmark form properties to selected bookmark
        vm.bookmark.current = bookmark;
        
        // Display update bookmark panel
        vm.view.change(vm.view.views.bookmark);
    };
    
    var setBookmarkStatus = function() {
        if (!globals.SyncEnabled.Get()) {
            return $q.resolve();
        }

        // If current page is a bookmark, actvate bookmark icon
        bookmarks.IncludesCurrentPage()
            .then(function(result) {
				vm.bookmark.active = !!result;
            })
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'setBookmarkStatus', utility.LogType.Error,
                    JSON.stringify(err));
                
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            });
    };

    var setNewTabLinks = function() {
        var links = document.querySelectorAll('a.new-tab');
        var onClickEvent = function() {
            return openUrl({ currentTarget: { href: this.href } });
        };
        
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            link.onclick = onClickEvent;
        }
    };

    var setServiceInformation = function(serviceInfo) {
        vm.settings.service.status = serviceInfo.status;
        vm.settings.service.statusMessage = serviceInfo.message;
    };

    var startSyncing = function() {
        vm.sync.displaySyncConfirmation = false;
        platform.Interface.Loading.Show();
        queueSync();
    };

    var syncForm_CancelSyncConfirmation_Click = function() {
        // TODO: Ensure any sync messaging or process is cancelled also
        globals.IsSyncing.Set(false);
        globals.SyncEnabled.Set(false);
        vm.view.change(vm.view.views.login);
    };

    var syncForm_ClientSecret_Change = function() {
        // Update client secret complexity value
    	if (!!vm.settings.secret()) {
        	vm.settings.secretComplexity = complexify(vm.settings.secret());
    	}
    	else {
    		vm.settings.secretComplexity = null;
    	}
    };

    var syncForm_DisableSync_Click = function() {
        // If sync is in progress, display confirmation
        if (!!globals.IsSyncing.Get()) {
            vm.settings.service.displayCancelSyncConfirmation = true;
            $timeout(function() {
                document.querySelector('#btnCancelSync_Confirm').focus();
            });
            return;
        }
        
        syncForm_CancelSyncConfirmation_Click();
    };
    
    var syncForm_EnableSync_Click = function() {
		// If ID provided, display confirmation panel
        if (!!globals.Id.Get()) {
            vm.sync.displaySyncConfirmation = true;
            $timeout(function() {
                document.querySelector('#btnSync_Confirm').focus();
            });
        }
        else {
            // Otherwise start syncing
            startSyncing();
        }
	};

    var syncPanel_DisplayDataUsage_Click = function() {
        // Reset values
        vm.settings.syncDataUsed = null;
        vm.settings.syncDataMax = null;
        vm.settings.displaySyncDataUsage = true;

        if (!!vm.settings.syncDataChart) {
            vm.settings.syncDataChart.update({ dataUsed: 0 });
        }

        $timeout(function() {
            if (!vm.settings.syncDataChart) {
                // Display new chart
                vm.settings.syncDataChart = new CircleChart({
                    $container: document.querySelector('#chart'),
                    ringProportion: 0.39,
                    staticTotal: true,
                    total: 100,
                    middleCircleColor: '#EDFEFF',
                    background: '#083039',
                    definition: [{
                        name: 'dataUsed',
                        value: 0,
                        color: '#35C6E8'
                    }]
                });
            }
            
            // Get service info and bookmarks sync size
            $q.all([
                api.CheckServiceStatus(),
                bookmarks.SyncSize()
            ])
                .then(function(result) {
                    var serviceInfo = result[0];
                    var bookmarksSyncSize = result[1];
                    
                    // Calculate sync data percentage used and display chart 
                    var percentUsed = (bookmarksSyncSize / serviceInfo.maxSyncSize) * 100;

                    // Set view model values
                    vm.settings.syncDataUsed = (percentUsed > 100) ? 100 : Math.round(percentUsed);
                    vm.settings.syncDataMax = Math.round(serviceInfo.maxSyncSize / 1024);

                    // Update chart
                    vm.settings.syncDataChart.update({ dataUsed: percentUsed });
                })
                .catch(function(err) {
                    // Log error
                    utility.LogMessage(
                        moduleName, 'syncPanel_DisplayDataUsage_Click', utility.LogType.Error,
                        JSON.stringify(err));
                    
                    // Display alert
                    var errMessage = utility.GetErrorMessageFromException(err);
                    vm.alert.display(errMessage.title, errMessage.message, 'danger');
                });
            
            document.querySelector('#syncDataUsage-Panel .btn-back').focus();
        });
    };

    var syncPanel_DisplaySyncOptions_Click = function() {
        vm.settings.displaySyncOptions = true;

        $timeout(function() {
            document.querySelector('#syncOptions-Panel .btn-back').focus();
        });
    };
    
    var syncPanel_SyncBookmarksToolbar_Click = function() {
        // If sync not enabled or user just clicked to disable toolbar sync, return
        if (!globals.SyncEnabled.Get() || !globals.SyncBookmarksToolbar.Get()) {
            return;
        }
        
        // Otherwise, display sync confirmation
        vm.settings.service.displaySyncBookmarksToolbarConfirmation = true;
        $timeout(function() {
            document.querySelector('#btnSyncBookmarksToolbar_Confirm').focus();
        });
    };
    
    var syncPanel_SyncBookmarksToolbar_Confirm = function() {
        // If sync not enabled, return
        if (!globals.SyncEnabled.Get()) {
            return;
        }
        
        var syncData = {};
        syncData.type = (!globals.Id.Get()) ? globals.SyncType.Push : globals.SyncType.Pull;
        
        // Hide sync confirmation
        vm.settings.service.displaySyncBookmarksToolbarConfirmation = false;
        
        // Display loading overlay
        platform.Interface.Loading.Show();
        
        // Start sync with no callback action
        platform.Sync(vm.sync.asyncChannel, syncData, globals.Commands.NoCallback);
    };

    var updateServiceUrlForm_Cancel_Click = function() {
        vm.settings.service.displayUpdateServiceUrlForm = false;
        vm.settings.service.newServiceUrl = vm.settings.service.url();
        updateServiceUrlForm_SetValidity(true);
    };

    var updateServiceUrlForm_CheckServiceUrl = function(url, callback) {
        url = url.replace(/\/$/, '');
        return api.CheckServiceStatus(url)
            .then(callback)
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'updateServiceUrlForm_CheckServiceUrl', utility.LogType.Error,
                    JSON.stringify(err));
                
                // Set form as invalid and focus on url field
                updateServiceUrlForm_SetValidity(false);
                document.querySelector('[name=txtServiceUrl]').focus();
            })
            .finally(function() {
                platform.Interface.Loading.Hide();
            });
    };
    
    var updateServiceUrlForm_Confirm_Click = function() {
        // Check service url
        var url = vm.settings.service.newServiceUrl.replace(/\/$/, '');
        
        // Disable sync
        vm.sync.enabled(false);
        
        // Update the service URL
        vm.settings.service.url(url);
        
        // Remove saved client secret and ID
        globals.ClientSecret.Set('');
        vm.settings.secretComplexity = null;
        globals.Id.Set('');
        
        // Update service status
        api.CheckServiceStatus()
            .then(setServiceInformation)
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'updateServiceUrlForm_Confirm_Click', utility.LogType.Error,
                    JSON.stringify(err));
                
                vm.settings.service.status = globals.ServiceStatus.Offline;
            });
        
        // Reset view
        vm.settings.service.displayCancelSyncConfirmation = false;
        vm.settings.service.displayUpdateServiceUrlConfirmation = false;
        vm.settings.service.displayUpdateServiceUrlForm = false;
        vm.settings.service.newServiceUrl = vm.settings.service.url();
        updateServiceUrlForm_SetValidity(true);
    };
    
    var updateServiceUrlForm_Display_Click = function() {
        // Display update form panel
        vm.settings.service.displayUpdateServiceUrlForm = true;

        // Check service url
        updateServiceUrlForm_CheckServiceUrl(vm.settings.service.newServiceUrl);
        
        // Focus on url field
        $timeout(function() {
            document.querySelector('input[name="txtServiceUrl"]').focus();            
        });
    };

    var updateServiceUrlForm_SetValidity = function(isValid) {
        vm.updateServiceUrlForm.txtServiceUrl.$setValidity('InvalidService', isValid);
    };
	
	var updateServiceUrlForm_Update_Click = function() {
        updateServiceUrlForm_SetValidity(true);
        
        // Return if the form is not valid
		if (!vm.updateServiceUrlForm.txtServiceUrl.$valid) {
			document.querySelector('[name=txtServiceUrl]').focus();
            return;
		}

        // Display loading overlay
        platform.Interface.Loading.Show();
        
        // Check service url
        updateServiceUrlForm_CheckServiceUrl(vm.settings.service.newServiceUrl, function(response) {
            if (!!globals.SyncEnabled.Get()) {
                // Display confirmation panel
                vm.settings.service.displayUpdateServiceUrlConfirmation = true;
                $timeout(function() {
                    document.querySelector('#btnUpdateServiceUrl_Confirm').focus();
                });
            }
            else {
                // Update service status and message
                setServiceInformation(response);
                
                // Update service url
                updateServiceUrlForm_Confirm_Click();
            }
        });
    };

    var updateServiceUrlForm_Update_KeyPress = function(event) {
        updateServiceUrlForm_SetValidity(true);
    };
	
	// Call constructor
    return new BrowserAction();
};