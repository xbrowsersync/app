## v1.6.0

### General improvements

- Complete re-write and re-architecture of code base in Typescript to improve maintainability and extensibility
- Added support for the following non-English locales (via [Crowdin](https://crowdin.com/project/xbrowsersync-app)):
  - Arabic
  - Chinese (simplified)
  - Dutch
  - Finnish
  - French
  - Galician
  - German
  - Indonesian
  - Italian
  - Japanese
  - Polish
  - Portuguese (Brazilian)
  - Russian
  - Spanish
  - Swedish
- Updated sync engine to improve handling of syncing when offline
- Overhauled app upgrade process to be more robust; sync data must now be upgraded in web extension
- Added preference to enable dark mode and support for following platform light/dark theme (#182)
- Added preference to display bookmark folders by default (#178)
- Added optional anonymous telemetry submission to improve ability to support xBrowserSync
- Added last synced date to Sync panel in Settings view
- Added bookmark URL validation check (#305)
- Added debounce to search box and bookmark tags field to resolve autocompletion issues
- Fixed bug where incorrect title and description are retrieved when adding youtube videos as bookmarks
- Fixed display bug where elements visibly resize on app load
- Fixed bug where HTTP request errors are incorrectly treated as network connection errors
- Removed support for "Mobile" bookmarks container; previously synced mobile bookmarks are moved to "Other bookmarks" > "Mobile bookmarks" folder
- Refactored metadata collection to use common collection process across all platforms (#298)
- When a sync error occurs that results in sync being disabled, app now switches back to the Login view
- Supported containers are now always added to synced bookmarks whenever a sync is performed, if they don't already exist
- Manual sync now syncs offline changes in addition to pulling down updates
- Improved handling for when sync is not found or has been removed; added interface for user to back up their data before creating a new sync
- Shortened search input placeholder text to support lower screen resolutions (#230)
- Improved Search view so that view only refreshes if bookmarks data has changed
- Refactored searching/bookmark/metadata code to account for locale when converting to lowercase (#357)
- Removed capitalization style from buttons (#355)
- Improved logging and error reporting
- Added font preloading to improve app loading experience
- Changed icon library to [Lucide icons](https://lucide.dev/)
- Mininum supported xBrowserSync API version updated to 1.1.9
- Many, many more minor enhancements and bug fixes

### Web extensions

- Brave and Edge (Chromium) browsers now supported (#100,#31)
- Sync engine now uses ID map instead of index paths making sync much more robust (#120,#158)
- Switched storage API from localStorage to IndexedDB to improve support for syncing large amounts of data
- Added auto back up functionality to Back up and restore panel in Settings view (#15)
- Improved how separators are handled to prevent sync conflicts
- Support for browser incognito mode has been disabled due to required APIs not available in incognito mode (#123)
- Increased height of extension window to maximum allowed when in Search view to display more bookmarks at once (#362)
- Using native "Sort by Name" browser function now triggers sync (Chromium browsers only)  (#233)
- Restore panel in Settings view now uses file selection for providing backup data (not currently supported in Firefox or Linux Chromium builds)
- Firefox now supports optional "read and change all website data" permissions (#43)
- Updated login form to support Firefox native password features
- Updated minimum supported Firefox version to 75

### Android

- Updated target SDK version to 30 (Android 11) and minimum supported version to 26 (Android Oreo)
- Switched storage API from WebView localStorage to combination of native storage and SQLLite to resolve data persistance issues and to improve support for syncing large amounts of data (#384)
- Added ability to bypass QR code scanning and enter sync info manually (#209)
- Added undo functionality when deleting or modifying a bookmark
- Added "pull to refresh" functionality in Search view
- Added preference to toggle auto-fetching of bookmark metadata (#231)
- Android app now supports syncing to xBrowserSync services over HTTP, and over HTTPS when the service uses a self-signed SSL certificate or custom Certificate Authorities (#234,#228,#356)
- Updated Cordova plugins to resolve a number of issues and improve device support

### Contributors

Special thanks to the following people for contributing their time and effort to this release!

- **PRs:** shunf4; taivlam
- **Translations:** alexandregz; Amolith; CharlesDeJager; coka4you; darqmoon; wizzdom; xDonatello; honchar; matabulan; ilyonfly; bohden; jules.seigneur77; julien.quievreux; korbendallas; LandyLERThERmfLOpi; leeo97one; maraven2001; fringoo

## v1.5.2

- Fixed bug where startup process can be triggered twice in some instances which can cause data loss/corruption (#171)
- Fixed bug where checking for updates whilst syncs are being processed can trigger a local refresh whilst event listeners are enabled (#133)
- Fixed bug when checking network connection status (#161)
- Fixed Firefox bug where moving multiple bookmarks results in corrupt sync data
- Fixed Firefox bug where sync data is corrupted when creating new folders via native bookmarking functionality
- Fixed Firefox bug where sync is executed twice when moving bookmarks
- Improved sync engine handling of large amounts of simultaneous changes
- Updated sync engine so that remote data is only updated once after all queued syncs have been processed
- Fixed Android bug when retrieving metadata fails with an error and Bookmark view does not display
- Fixed Android bug where loading dialog displays before form is shown when adding bookmark by sharing to app
- Fixed Android bug where status bar disappears when loading metadata
- Fixed Android bug where error message not displaying when retrieving metadata for shared bookmark fails
- Added ability to cancel sync when extension window is opened during push sync
- Added a delay on checking for sync updates on startup to allow browser to init connection
- Changed check for updates period back to 15 minutes
- Fixed bug where disabling sync from extension window doesn't disable properly in background
- Fixed potential messaging bugs when extension window is opened during sync
- Fixed bug in metadata collection where description displays encoded characters
- Fixed bug where encoded characters are displayed in tags after getting bookmark metadata
- Fixed bug where password fields highlight spelling issues when set to show password
- Fixed bug where sync id is not displayed when disabling sync just after creating a new sync
- Fixed bug when disabling sync, Settings view flickers and Login view displays after slight delay
- Fixed bug where only first bookmark tag in field shows autocomplete
- Improved sync UI by adding ability to update service URL when creating a new sync/entering sync credentials (#45)
- Added confirmation panel displaying service info when updating service URL
- Updated Sync ID QR code to now also include service URL and updated Android scanning functionality to read new QR code format
- Improved handling of syncing when offline for desktop platforms
- Added option of checking for app updates to Preferences section in Settings view
- Added ability to click native alerts to open links
- Moved sync bookmarks toolbar setting to Preferences panel
- Updated layout CSS to improve handling of browser page zoom (#173)
- Many, many more minor enhancements and bug fixes

## v1.5.1

- Updated Android platform to include v1.5.0 changes (#139,#146), and:
	- Fixed responsive mobile styles to support all mobile device screen sizes and support landscape orientation (#47)
	- Fixed bug when fetching metadata for new bookmark by switching cordova-plugin-inappbrowser to xbs repo which includes PR to fix executeScript failing for large return values (#78,#125)
	- Added get metadata button to bookmark panel
	- If bookmark metadata isn't retrieved, shared title is now used
	- Reduced start up time to two secs (#25)
	- Added preferences section to Settings view and added preference to display search bar beneath search results (#143)
	- Replaced local storage with native storage so cache is no longer subject to WebView local storage limits
	- Updated download functionality to download backup and log files to Download folder
	- Added new scan interface with sync ID validation
	- Updated offline functionality to better handle changes made when offline
	- Fixed bug when back button does not cause the correct action for certain screens
	- Changed add bookmark button to floating action button
	- Fixed button styles to display correct styling when pressed
	- Alerts now display in native snackbar
	- Added install/upgrade functionality
	- Added adaptive icons
	- Added swipe to close on Help view
	- Updated delete bookmark animation
	- Added validating spinner to restore file field
	- Fixed background linear gradient to match other platforms
- Added bookmark folder view to Search view (#16)
- Added install backup point which allows user to restore bookmarks to the same state as when extension was installed
- Added reveal password functionality on Login view
- Implemented background syncing to replace checking for uncommitted syncs
- Refactored syncing logic to support separate queuing and execution
- Added sync ID validation to login and scan views
- Fixed bookmark id handling validation during sync/restore
- Fixed bug with sync bookmarks toolbar toggle switch not hiding confirmation message when switched off
- Fixed flickering on autocomplete text when search text changes
- Fixed bug where service panels are displayed before service status is retrieved
- Add bookmark button on Bookmark view is now disabled until empty form is changed
- Shortened log and backup file names
- Updated HTTP error codes to correspond to changes in API v1.1.11
- Changed background clouds from png to svg image for better resolution on high pixel density displays
- Updated help page content
- Updated close link label on Help view
- Updated logo image
- Removed deprecated crypto-js dependency
- Many, many more minor enhancements and bug fixes

## v1.5.0

- Huge improvements to syncing engine:
	- Updated sync process to be more reliable and less prone to issues
	- Fixed issues when changing local bookmarks using native tools that can cause sync failures/duplication/corruption
	- Population of local bookmarks takes much less time in Chrome (unfortunately Firefox is excluded for now due to a Mozilla [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1533061))
	- UI updated to display syncing animation when syncs are in progress
	- Browser icons updated to reflect sync status and direction (uploading/downloading)
- Sync is no longer disabled when clearing local browser cache or by third-party privacy plugins (#38)
- Bookmarking Chrome-specific URLs (i.e. chrome://...) no longer breaks sync in Firefox (#58)
- Many more bookmark URL protocols now supported
- Added support for syncing Firefox native separators (#64)
- Added button to manually update sync with latest changes (#21)
- Updated required permissions, "read and change all website data" is now optional and added options to Settings view (Chrome only, Firefox implementation is currently blocked due to a Mozilla [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1432083)) (#43)
- Much improved password validation when creating new syncs: more accurate password strength meter, warnings and suggestions displayed to help user choose a more effective password and relaxed validation rules to allow users more freedom in choosing a password (#42,#48)
- Bookmarking of non-HTML web pages such as PDFs now supported (#66)
- Very large sync data sizes now supported (#20)
- Extension icons updated to make current sync status clearer (#77)
- Bookmark URL validation improved (#62)
- Sync ID field value now saved whenever it is updated resolving issues when pasting values from a password manager (#86,#101)
- Default keyboard shortcut now included (#98)
- Added button for easily copying sync ID (#102)
- Added retry after delay when checking for sync updates at startup, avoids "Connection lost" warnings when using proxied connections for example
- Added button to clear existing tags, useful when pages contain many irrelevant tags
- Removed debug mode, added better logging and ability to download log file to provide when logging issues
- Improved code security: more restrictive content security policy, removed all references to `innerHTML`, removed references to `eval` (javascript bookmarklets no longer supported)
- Updated donation options, Liberapay and better crypto donation process added
- User interface updates and improvements
- Prettier backup file JSON data
- Many, many more minor enhancements and bug fixes

## v1.4.0

- Added [Firefox](https://www.mozilla.org/firefox/) support, download the add-on here: https://addons.mozilla.org/en-GB/firefox/addon/xbs/
- Huge improvements to encryption: now uses native [Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/) rather than external cryptography library, key derivation uses PBKDF2 with 250,000 rounds of SHA-256, encryption uses AES-GCM with a random 16 byte IV and the user's random 32 char sync ID as a salt. For comparison, [LastPass' key derivation](https://support.logmeininc.com/lastpass/help/about-password-iterations-lp030027) uses a similar approach but with only 100,100 rounds by default
- Existing syncs will be automatically upgraded to use the latest encryption. Upgraded syncs cannot sync to older version of xBrowserSync
- Data is now compressed before being encrypted reducing sync size by up to 60%
- When adding or modifying a bookmark using the xBrowserSync interface, local bookmarks are no longer removed and re-added - only the target bookmark is affected
- xBrowserSync now adds bookmarks by default directly to Other Bookmarks, the `_xBrowserSync_` folder is no longer used and is renamed to `Legacy xBrowserSync bookmarks` on upgrade
- When creating a new sync, password must now be confirmed and required password complexity has been increased to ensure stronger encryption
- Updated to use smaller font files for faster more responsive experience
- Page metadata collection method improved, content scripts no longer run automatically when a page is loaded and page metadata no longer needs to be stored in browser's local storage cache
- Latest sync changes now pulled down on browser start up
- Ability to create new sync remove from mobile apps to prevent user deleting all local bookmarks inadvertently
- Sync confirmation text updated to clearly inform user that local bookmarks data will be deleted
- Login view fields now use monospace font
- Bookmark and Change Service panels now display validation messages
- Bookmark view URL field now much less restrictive to allow for different bookmark formats. 
- Bookmark view URL field validation now checks if URL already exists
- Bookmark view tags now respect maximum width by displaying ellipses if tag text too long to show
- Bookmark view tags field no longer suggest tags that have already been added
- Change Service panel now allows IP addresses as well as host names
- Service panel now displays loading text when retrieving service status
- Service panel now displays data usage in most relevant unit
- Panel styling updated to include drop shadows
- About panel cleaned up to display only relevant information
- Message now displayed when app is updated with link to release notes
- Dependencies updated
- Many, many more minor enhancements and bug fixes

## v1.3.1

- Android and iOS apps released
- Redesigned, more intuitive sync/Login view and Settings view
- Cleaned up extension dependencies for smaller footprint and faster loading
- Added support for bookmarklets
- Search queries now allow commas between keywords
- Titleless bookmarks now display their URL host as a title
- Bookmark descriptions are now shortened to 300 characters to the nearest word
- “Connection Lost” warnings are no longer shown when checking for updates in the background
- Many, many more minor enhancements and bug fixes

## v1.2.1

- Search results are now sorted in order of highest score _and_ date bookmark added. Note: for existing syncs, only bookmarks added after v1.2.1 was installed will be sorted by date added
- Searching with no search terms entered displays bookmarks in order of date bookmark added. Note: for existing syncs, only bookmarks added after v1.2.1 was installed will be sorted by date added
- Added support for Twitter meta page tags
- Can now handle bookmarks without titles
- Searching for "un" no longer displays "undefined" as a suggestion
- Page meta tag detection no longer case sensitive

## v1.2.0

- Added mobile apps support. Expect releases for Android and iOS very soon
- Added Firefox support. xBrowserSync now works with Firefox's new WebExtensions browser extension API. However, Mozilla are still in the process of implementing the full API used by Chrome and currently there are gaps, some of which xBrowserSync depends on. Once support has been added xBrowserSync will be released for Firefox
- Added data usage chart. Check how much of your allocated sync data you are currently using in Settings > Sync > Data Usage
- Adding a bookmark via native browser bookmark button now adds description and tags metadata automatically
- Bookmark updates made whilst offline will now be synced automatically when connection is restored
- Added About view
- Synced data is now left encrypted before being cached locally, for extra security
- QR code now displayed using canvas, much clearer at higher resolutions
- Bookmark searches no longer match partial words to improve results relevance
- Suppressed the frequency of alerts if unable to connect to the xBrowserSync service when syncing in background
- Numerous other minor enhancements and bug fixes

## v1.1.1

- Updated website links to https
- Stopped punctuation appearing in search lookahead
- Fixed change conflict when data out of sync
- Fixed issue with browser action icon sometimes not updating correctly

## v1.0.0

Initial release