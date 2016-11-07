var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.Controller 
 * Description: Main angular controller class for the app.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Controller = function($scope, $q, $timeout, complexify, platform, global, api, utility, bookmarks, platformImplementation) { 
	'use strict';    
    var vm, moduleName = 'xBrowserSync.App.Controller';
    
/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
 
    var BrowserAction = function() {
        vm = this;
        vm.global = global;
        vm.platform = platform; 
        vm.scope = $scope;
		
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
            displayUpdateForm : false,
            tagText: null,
            descriptionFieldOriginalHeight: null
        };
        
        vm.domElements = {
            btnRestoreData: function() {
                if (!vm.settings.dataToRestore) {
                    return platform.GetConstant(global.Constants.Button_RestoreData_Label);
                }
                
                if (!vm.settings.dataToRestoreIsValid()) {
                    return platform.GetConstant(global.Constants.Button_RestoreData_Invalid_Label);
                }
                
                return platform.GetConstant(global.Constants.Button_RestoreData_Ready_Label);
            }
        };
        
        vm.events = {
            aboutPanel_Back_Click: aboutPanel_Back_Click,
            backupRestoreForm_Backup_Click: backupRestoreForm_Backup_Click,
            backupRestoreForm_DisplayRestoreForm_Click: backupRestoreForm_DisplayRestoreForm_Click,
            backupRestoreForm_DisplayRestoreConfirmation_Click: backupRestoreForm_DisplayRestoreConfirmation_Click,
            backupRestoreForm_Restore_Click: backupRestoreForm_Restore_Click,
            backupRestoreForm_SelectBackupFile_Click: backupRestoreForm_SelectBackupFile_Click,
            bookmarkForm_BookmarkDescription_Change: bookmarkForm_BookmarkDescription_Change,
            bookmarkForm_BookmarkTags_Autocomplete: bookmarkForm_BookmarkTags_Autocomplete,
            bookmarkForm_BookmarkTags_Change: bookmarkForm_BookmarkTags_Change,
            bookmarkForm_BookmarkTags_KeyDown: bookmarkForm_BookmarkTags_KeyDown,
            bookmarkForm_BookmarkUrl_Change: bookmarkForm_BookmarkUrl_Change,
            bookmarkForm_CreateBookmark_Click: bookmarkForm_CreateBookmark_Click,
            bookmarkForm_CreateTags_Click: bookmarkForm_CreateTags_Click,
            bookmarkForm_DeleteBookmark_Click: bookmarkForm_DeleteBookmark_Click,
            bookmarkForm_RemoveTag_Click: bookmarkForm_RemoveTag_Click,
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
            searchForm_SelectBookmark_Press: searchForm_SelectBookmark_Press,
            searchForm_ShareBookmark_Click: searchForm_ShareBookmark_Click,
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
                    global.DisplayIntro.Set(value) : 
                    global.DisplayIntro.Get();
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
            getLookaheadTimeout: null,
            getResultsTimeout: null,
            lastWord: null,
            lookahead: null,
            query: null,
            results: null
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
            getResultsTimeout: 250,
			id: function(value) {
                return arguments.length ? 
                    global.Id.Set(value) : 
                    global.Id.Get();
            },
            syncBookmarksToolbar: function(value) {
                return arguments.length ? 
                    global.SyncBookmarksToolbar.Set(value) : 
                    global.SyncBookmarksToolbar.Get();
            },
			secret: function(value) {
                return arguments.length ? 
                    global.ClientSecret.Set(value) : 
                    global.ClientSecret.Get();
            },
            secretComplexity: null,
            service: {
                displayUpdateServiceUrlConfirmation: false,
                displayUpdateServiceUrlForm: false,
                newServiceUrl: '',
                status: global.ServiceStatus.Online,
                statusMessage: '',
                url: function(value) {
                    return arguments.length ? 
                        global.URL.Host.Set(value) : 
                        global.URL.Host.Get();
                }
            },
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
                    global.SyncEnabled.Set(value) : 
                    global.SyncEnabled.Get();
            },
            inProgress: function(value) {
                return arguments.length ? 
                    global.IsSyncing.Set(value) : 
                    global.IsSyncing.Get();
            },
            validateLogin: function() {
                return !!vm.settings.secret();
            }
		};

		vm.view = {
			current: (function() {
                if (global.DisplayAboutOnStartup.Get()) {
                    return 4;
                }

                return global.SyncEnabled.Get() ? 1 : 0;
            }()),
            change: changeView,
            displayMainView: function() {
                if (!!global.SyncEnabled.Get()) {
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
	
	var aboutPanel_Back_Click = function() {
        // Turn off display about on startup
        global.DisplayAboutOnStartup.Set(false);
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
                platform.GetConstant(global.Constants.Error_NoDataToRestore_Title),
                platform.GetConstant(global.Constants.Error_NoDataToRestore_Message), 
                'danger');
            
            return;
        }
        
        // Display loading overlay
        platform.Interface.Loading.Show();
        
        // Start restore
        restoreData(JSON.parse(data));
	};

    var backupRestoreForm_SelectBackupFile_Click = function() {
        platform.SelectFile();
    }; 
    
    var bookmarkForm_BookmarkDescription_Change = function() {
        // Limit the bookmark description to the max length
        if (!!vm.bookmark.current.description && vm.bookmark.current.description.length > global.Bookmarks.DescriptionMaxLength) {
            vm.bookmark.current.description = vm.bookmark.current.description.substring(0, global.Bookmarks.DescriptionMaxLength);
        }
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
        if (!!lastWord && lastWord.length > global.LookaheadMinChars) {
            // Get tags lookahead
            bookmarks.GetLookahead(lastWord.toLowerCase(), null, true)
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
    
    var bookmarkForm_BookmarkTags_KeyDown = function($event) {
        switch (true) {
            // If user pressed Enter
            case ($event.keyCode === 13):
                // Add new tags
                $event.preventDefault();
                bookmarkForm_CreateTags_Click();
                break;
            // If user pressed tab or right arrow key and lookahead present
            case (($event.keyCode === 9 || $event.keyCode === 39) && !!vm.bookmark.tagLookahead):
                // Add lookahead to search query
                $event.preventDefault();
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
            type: global.SyncType.Both,
            changeInfo: { 
                type: global.UpdateType.Create, 
                bookmark: vm.bookmark.current 
            }
        });
        
        vm.bookmark.active = true;
        vm.view.change(vm.view.views.search);
    };
    
    var bookmarkForm_CreateTags_Click = function() {
        // Clean and sort tags and add them to tag array
        var newTags = getTagArrayFromText(vm.bookmark.tagText);        
        vm.bookmark.current.tags = _.sortBy(_.union(newTags, vm.bookmark.current.tags), function(tag) {
            return tag;
        });

        bookmarkForm_ResizeDescriptionField();
        vm.bookmark.tagText = '';
        vm.bookmark.tagLookahead = '';
        document.querySelector('input[name="bookmarkTags"]').focus();
    };
    
    var bookmarkForm_DeleteBookmark_Click = function() {
        // Get current page url
		platform.GetCurrentUrl()
            .then(function(currentUrl) {
                // Delete the bookmark
                platform.Sync(vm.sync.asyncChannel, {
                    type: global.SyncType.Both,
                    changeInfo: { 
                        type: global.UpdateType.Delete, 
                        url: vm.bookmark.current.originalUrl
                    }
                });
                
                // Set bookmark active status if current bookmark is current page 
                if (!!currentUrl && currentUrl.toLowerCase() === vm.bookmark.current.originalUrl.toLowerCase()) {
                    vm.bookmark.active = false;
                }
                
                // Display the search panel
                vm.view.change(vm.view.views.search);
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
            vm.bookmark.current.originalUrl = vm.bookmark.current.url;
            vm.bookmark.displayUpdateForm = true;
            return $q.resolve();
        }
        
        var deferred = $q.defer();
        
        // Display loading overlay 
        platform.Interface.Loading.Show();

        // Check if current url is a bookmark
        bookmarks.IncludesCurrentPage()
            .then(function(result) {
				if (!!result) {
                    // Set form properties to current bookmark
                    var bookmark = new utility.XBookmark(
                        result.title, 
                        result.url,
                        result.description,
                        result.tags);
                    bookmark.originalUrl = result.url;
                    vm.bookmark.current = bookmark;
                    
                    // Display update form
                    vm.bookmark.displayUpdateForm = true;

                    return deferred.resolve();
                }
                
                // Get page metadata for current url
                return platform.GetPageMetadata();
            })
            .then(function(metadata) {
                    if (!metadata) {
                        return;
                    }
                    
                    // Set form properties to url metadata
                    var bookmark = new utility.XBookmark(
                        metadata.title, 
                        metadata.url, 
                        metadata.description,
                        getTagArrayFromText(metadata.tags));
                    bookmark.originalUrl = metadata.url;
                    vm.bookmark.current = bookmark;
                    
                    // Display add form
                    vm.bookmark.displayUpdateForm = false;

                    return deferred.resolve();
            })
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'bookmarkForm_Init', utility.LogType.Error,
                    JSON.stringify(err));
                
                // Display alert
                var errMessage = utility.GetErrorMessageFromException(err);
                vm.alert.display(errMessage.title, errMessage.message, 'danger');
            })
            .finally(function() {
                platform.Interface.Loading.Hide();
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
                    type: global.SyncType.Both,
                    changeInfo: { 
                        type: global.UpdateType.Update, 
                        url: vm.bookmark.current.originalUrl, 
                        bookmark: vm.bookmark.current
                    }
                });

                // Set bookmark active status if current bookmark is current page 
                if (!!currentUrl && currentUrl.toLowerCase() === vm.bookmark.current.originalUrl.toLowerCase()) {
                    vm.bookmark.active = (currentUrl.toLowerCase() === vm.bookmark.current.url.toLowerCase());
                }
                
                // Display the search panel
                vm.view.change(vm.view.views.search);
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
            case vm.view.views.search:
                vm.search.lookahead = null;
                vm.search.query = null;
                vm.search.results = null;
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
        
        // Initialise new view
        switch(view) {
            case vm.view.views.search:
                $timeout(function() {
                    platform.Interface.Refresh();
                    document.querySelector('input[name=txtSearch]').focus();
                });
                break;
            case vm.view.views.bookmark:
                // Set bookmark form properties
                bookmarkForm_Init()
                    .then(function() {
                        // Resize description field to account for tags
                        bookmarkForm_ResizeDescriptionField();
                        $timeout(function() {
                            bookmarkForm_ResizeDescriptionField();
                            document.querySelector('input[name="bookmarkTitle"]').focus();
                        }, 100);
                    });
                break;
            case vm.view.views.settings:
                vm.settings.displaySyncOptions = !global.SyncEnabled.Get();
                
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
                        
                        vm.settings.service.status = global.ServiceStatus.Offline;
                    });
                
                // Set new service form url default value to current service url
                vm.settings.service.newServiceUrl = vm.settings.service.url();
                break;
        }
        
        vm.view.current = view;
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
    
    var displayQRCode_Click = function() {
        // Generate new QR code
        qr.canvas({
            canvas: document.getElementById('qr'),
            value: vm.settings.id()
        });

        vm.settings.displayQRCode = true;
    };
    
    var getTagArrayFromText = function(tagText) {
        if (!tagText) {
            return null;
        }
        
        // Conver to lowercase and split tags into array
        var tags = tagText.toLowerCase().replace(/['"]/g, '').split(',');
        
        // Clean and sort tags
        tags = _.chain(tags)
            .map(function(tag) {
                return tag.trim();
            })
            .compact()
            .sortBy(function(tag) {
                return tag;
            })
            .value();
        
        return tags;
    };
    
    var handleSyncResponse = function(response) {
        var errMessage;
        
        switch(response.command) {
            // After syncing bookmarks
            case global.Commands.SyncBookmarks:
                if (response.success) {
                    // Enable sync
                    if (!global.SyncEnabled.Get()) {
                        global.SyncEnabled.Set(true);
                    }

                    // Disable the intro animation
                    vm.introduction.displayIntro(false);
                    
                    // If initial sync, switch to search panel
                    if (vm.view.current === vm.view.views.login) {
                    	vm.view.change(vm.view.views.search);
                    }

                    setBookmarkStatus();
                }
                else {
                    errMessage = utility.GetErrorMessageFromException(response.error);
                    vm.alert.display(errMessage.title, errMessage.message, 'danger');

                    // If data out of sync, refresh sync
                    if (!!response.error && !!response.error.code && response.error.code === global.ErrorCodes.DataOutOfSync) {
                        platform.Sync(vm.sync.asyncChannel, { type: global.SyncType.Pull });
                    }
                }

                platform.Interface.Loading.Hide();
                break;
            // After restoring bookmarks
            case global.Commands.RestoreBookmarks:
                if (response.success) {
                    setBookmarkStatus();
                    
                    vm.settings.displayRestoreForm = false;
                    vm.settings.displayRestoreConfirmation = false;
                    vm.settings.dataToRestore = '';
                    vm.settings.backupRestoreResult = platform.GetConstant(global.Constants.RestoreSuccess_Message);
                    
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
            case global.Commands.NoCallback:
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
        // Platform-specific initation
        platform.Init(vm, $scope);
        
        // Display contents
        document.querySelector('.container').classList.remove('loading');
        
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
        syncData.type = (!global.Id.Get()) ? global.SyncType.Push : global.SyncType.Pull; 

        // Start sync
        platform.Sync(vm.sync.asyncChannel, syncData);
    };
	
	var restoreData = function(data, restoreCallback) {
		// Set ID and client secret if sync not enabled
        if (!global.SyncEnabled.Get()) {
            global.ClientSecret.Set('');
            vm.settings.secretComplexity = null;
            
            if (!!data.xBrowserSync.id) {
                global.Id.Set(data.xBrowserSync.id);
            }
		}
        
        var bookmarksToRestore = data.xBrowserSync.bookmarks;
        
		// Return if no bookmarks found
		if (!bookmarksToRestore) {
            return restoreCallback();
        }
        
        var syncData = {};
        syncData.type = (!global.SyncEnabled.Get()) ? global.SyncType.Pull : global.SyncType.Both;
        syncData.bookmarks = bookmarksToRestore;
        
        // Display loading overlay 
        platform.Interface.Loading.Show();
        
        // Start restore
        platform.Sync(vm.sync.asyncChannel, syncData, global.Commands.RestoreBookmarks);
	};
    
    var searchBookmarks = function() {
        var queryData;

        searchForm_ToggleSearchingAnimation(true);
        
        var urlRegex = /^(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]+\.[a-z]+\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;
        if (!!vm.search.query.trim().match(urlRegex)) {
            queryData = { url: vm.search.query.trim() };
        }
        else {
            queryData = { keywords: vm.search.query.trim() };
        }
        
        bookmarks.Search(queryData)
            .then(function(results) {
                vm.search.results = results;

                // Scroll to top of search results
                $timeout(function() {
                    document.querySelector('.search-results-panel').scrollTop = 0;
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
            })
            .finally(function() {
                searchForm_ToggleSearchingAnimation(false);
            });
    };

    var searchForm_SearchText_Autocomplete = function() {
        vm.search.query += vm.search.lookahead;
        searchForm_SearchText_Change();
        document.querySelector('input[name=txtSearch]').focus();
    };

    var searchForm_Clear_Click = function() {
        vm.search.query = null;
        vm.search.lookahead = null;
        vm.search.results = null;
        document.querySelector('input[name=txtSearch]').focus();
    };

    var searchForm_DeleteBookmark_Click = function(event, bookmark) {
        var bookmarkItem = event.target.parentNode.parentNode.parentNode.parentNode;
        bookmarkItem.classList.add('deleted');
        
        $timeout(function() {
            bookmarkItem.remove();

            // Delete the bookmark
            platform.Sync(vm.sync.asyncChannel, {
                type: global.SyncType.Both,
                changeInfo: { 
                    type: global.UpdateType.Delete, 
                    url: bookmark.url
                }
            });
        }, 500);
    };

    var searchForm_ScanCode_Click = function() {
        platform.ScanID();
    };
    
    var searchForm_SearchText_Change = function() {
        vm.alert.show = false;
        vm.search.lookahead = null;
        
        // Clear timeout
        if (!!vm.search.getResultsTimeout) {
            $timeout.cancel(vm.search.getResultsTimeout);
            vm.search.getResultsTimeout = null;
        }
        
        // No query, clear results
        if (!vm.search.query.trim()) {
            vm.search.results = null;
            return;
        }

        // Get last word of search query
        var matches = vm.search.query.match(/[\S]+$/);
        var lastWord = (!!matches) ? matches[0] : null;
        
        // Display lookahead if word length exceed minimum
        if (!!lastWord && lastWord.length > global.LookaheadMinChars) {
            // Get lookahead
            bookmarks.GetLookahead(lastWord.toLowerCase(), vm.search.results)
                .then(function(results) {
                    if (!results) {
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
                });
            
            // Execute search after timeout
            vm.search.getResultsTimeout = $timeout(function() {
                searchBookmarks();
            }, vm.settings.getResultsTimeout);
        }
    };
    
    var searchForm_SearchText_KeyDown = function($event) {
        // If user pressed enter and search text present
        if ($event.keyCode === 13 && !!vm.search.query) {
            if (!!vm.search.getResultsTimeout) {
                $timeout.cancel(vm.search.getResultsTimeout);
                vm.search.getResultsTimeout = null;
            }
            
            searchBookmarks();
            return;
        }
        
        // If user pressed down arrow and search results present
        if ($event.keyCode === 40 && !!vm.search.results && vm.search.results.length > 0) {
            // Focus on first search result
            $event.preventDefault();
            document.querySelector('.search-results-panel .list-group').firstElementChild.children[2].focus();
            return;
        }
        
        // If user pressed tab or right arrow key and lookahead present
        if (($event.keyCode === 9 || $event.keyCode === 39) && !!vm.search.lookahead) {
            // Add lookahead to search query
            $event.preventDefault();
            searchForm_SearchText_Autocomplete();
            return;
        }
    };
    
    var searchForm_SearchResult_KeyDown = function($event) {
        var currentIndex, newIndex;
        
        switch (true) {
            // Up arrow
            case ($event.keyCode === 38):
                $event.preventDefault();
            
                if (!!$event.target.parentElement.previousElementSibling) {
                    // Focus on previous result
                    $event.target.parentElement.previousElementSibling.children[2].focus();
                }
                else {
                    // Focus on search box
                    document.querySelector('input[name=txtSearch]').focus();
                }
                
                break;
            // Down arrow
            case ($event.keyCode === 40):
                $event.preventDefault();
            
                if (!!$event.target.parentElement.nextElementSibling) {
                    // Focus on next result
                    $event.target.parentElement.nextElementSibling.children[2].focus();
                }
                
                break;
            // Page up
            case ($event.keyCode === 33):
                $event.preventDefault();
            
                // Focus on result 6 down from current
                currentIndex = _.indexOf($event.target.parentElement.parentElement.children, $event.target.parentElement);
                newIndex = currentIndex - 6;
                
                if (newIndex < 0) {
                    $event.target.parentElement.parentElement.firstElementChild.children[2].focus();
                }
                else {
                    $event.target.parentElement.parentElement.children[newIndex].children[2].focus();
                }
                
                break;
            // Page down
            case ($event.keyCode === 34):
                $event.preventDefault();
                
                // Focus on result 6 down from current
                currentIndex = _.indexOf($event.target.parentElement.parentElement.children, $event.target.parentElement);
                newIndex = currentIndex + 6;
                
                if ($event.target.parentElement.parentElement.children.length < newIndex) {
                    $event.target.parentElement.parentElement.lastElementChild.children[2].focus();
                }
                else {
                    $event.target.parentElement.parentElement.children[newIndex].children[2].focus();
                }
                
                break;
            // Home
            case ($event.keyCode === 36):
                $event.preventDefault();
            
                // Focus on first result
                $event.target.parentElement.parentElement.firstElementChild.children[2].focus();
                
                break;
            // End
            case ($event.keyCode === 35):
                $event.preventDefault();
            
                // Focus on last result
                $event.target.parentElement.parentElement.lastElementChild.children[2].focus();
                
                break;
            // Backspace
            case ($event.keyCode === 8):
            // Space
            case ($event.keyCode === 32):
            // Numbers and letters
            case ($event.keyCode > 47 && $event.keyCode < 112):
                // Focus on search box
                document.querySelector('input[name=txtSearch]').focus();
                break;
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

    var searchForm_ShareBookmark_Click = function(event, result) {
        platform.Bookmarks.Share(event, result);
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
        if (!global.SyncEnabled.Get()) {
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
        global.IsSyncing.Set(false);
        global.SyncEnabled.Set(false);
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
        if (!!global.IsSyncing.Get()) {
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
        if (!!global.Id.Get()) {
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

                // Display new chart
                new CircleChart({
                    $container: document.querySelector('#chart'),
                    ringProportion: 0.39,
                    staticTotal: true,
                    total: 100,
                    middleCircleColor: '#EDFEFF',
                    background: '#083039',
                    definition: [{
                        color: '#35C6E8', 
                        value: percentUsed
                    }]
                });
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
        
        // Remove old chart
        var chart = document.querySelector('#chart > svg');
        if (!!chart) {
            chart.remove();
        }

        vm.settings.syncDataUsed = null;
        vm.settings.syncDataMax = null;
        vm.settings.displaySyncDataUsage = true;

        $timeout(function() {
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
        if (!global.SyncEnabled.Get() || !global.SyncBookmarksToolbar.Get()) {
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
        if (!global.SyncEnabled.Get()) {
            return;
        }
        
        var syncData = {};
        syncData.type = (!global.Id.Get()) ? global.SyncType.Push : global.SyncType.Pull;
        
        // Hide sync confirmation
        vm.settings.service.displaySyncBookmarksToolbarConfirmation = false;
        
        // Display loading overlay
        platform.Interface.Loading.Show();
        
        // Start sync with no callback action
        platform.Sync(vm.sync.asyncChannel, syncData, global.Commands.NoCallback);
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
        global.ClientSecret.Set('');
        vm.settings.secretComplexity = null;
        global.Id.Set('');
        
        // Update service status
        api.CheckServiceStatus()
            .then(setServiceInformation)
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'updateServiceUrlForm_Confirm_Click', utility.LogType.Error,
                    JSON.stringify(err));
                
                vm.settings.service.status = global.ServiceStatus.Offline;
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
            if (!!global.SyncEnabled.Get()) {
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

    var updateServiceUrlForm_Update_KeyPress = function($event) {
        updateServiceUrlForm_SetValidity(true);
    };
	
	// Call constructor
    return new BrowserAction();
};