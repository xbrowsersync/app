import './app-search.component.scss';
import angular, { IScope } from 'angular';
import { OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { AndroidAppHelperService } from '../../android/android-app/shared/android-app-helper/android-app-helper.service';
import { AlertService } from '../../shared/alert/alert.service';
import { Bookmark, BookmarkSearchQuery } from '../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { ExceptionHandler } from '../../shared/errors/errors.interface';
import Globals from '../../shared/global-shared.constants';
import { PlatformService } from '../../shared/global-shared.interface';
import { SettingsService } from '../../shared/settings/settings.service';
import { UtilityService } from '../../shared/utility/utility.service';
import { WorkingService } from '../../shared/working/working.service';
import { KeyCode, RoutePath } from '../app.enum';
import { AppHelperService } from '../shared/app-helper/app-helper.service';
import { BookmarkSearchResult, BookmarkTreeItem } from './app-search.interface';

export abstract class AppSearchComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $scope: IScope;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  alternateSearchBarPosition: boolean;
  RoutePath = RoutePath;
  batchResultsNum = 10;
  bookmarkTree: BookmarkTreeItem[];
  cachedBookmarks: Bookmark[];
  currentUrlBookmarked: boolean;
  disableQueryWatch: () => void;
  displayFolderView: boolean;
  globals = Globals;
  lastWord: string;
  lookahead: string;
  query: string;
  queryMeasure: string;
  results: BookmarkSearchResult[];
  resultsDisplayed = 10;
  selectedBookmarkId: number;
  scrollDisplayMoreEnabled = true;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'BookmarkHelperService',
    'PlatformService',
    'SettingsService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $q: ng.IQService,
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$q = $q;
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    this.enableQueryWatch();
  }

  @boundMethod
  addBookmark(): void {
    this.appHelperSvc.switchView(RoutePath.Bookmark);
  }

  bookmarksAreEquivalent(b1: Bookmark[], b2: Bookmark[]): boolean {
    const getAllBookmarkProps = (bookmarks: Bookmark[]) => {
      // Convert bookmarks
      const allProps = [];
      this.bookmarkHelperSvc.eachBookmark((bookmark) => {
        const props = Object.entries(bookmark).filter((resultProps) => {
          const [propertyName] = resultProps;
          return (
            propertyName !== '$$hashKey' &&
            propertyName !== 'children' &&
            propertyName !== 'displayChildren' &&
            propertyName !== 'open'
          );
        });
        allProps.push(props);
      }, bookmarks);
      return allProps;
    };

    // Iterate
    const b1Props = getAllBookmarkProps(b1);
    const b2Props = getAllBookmarkProps(b2);
    return angular.equals(b1Props, b2Props);
  }

  @boundMethod
  clearSearch(): void {
    this.resetSearch();
    this.displayFolderView = false;
    this.appHelperSvc.focusOnElement('input[name=txtSearch]');
  }

  displayMoreSearchResults(): void {
    if (this.results?.length && this.scrollDisplayMoreEnabled) {
      // Display next batch of results
      this.resultsDisplayed += this.batchResultsNum;
    }
  }

  displaySearchResults(results: Bookmark[]): void {
    this.scrollDisplayMoreEnabled = false;
    this.resultsDisplayed = this.batchResultsNum;
    this.results = results;

    // Scroll to top of search results
    this.$timeout(() => {
      this.scrollDisplayMoreEnabled = true;
      const resultsPanel = document.querySelector('.search-results-container');
      if (resultsPanel) {
        resultsPanel.scrollTop = 0;
      }
    }, Globals.InterfaceReadyTimeout);
  }

  @boundMethod
  editBookmark(event: Event, bookmarkToUpdate: Bookmark): void {
    // Stop event propogation
    this.utilitySvc.stopEventPropagation(event);

    // On mobiles, display bookmark panel with slight delay to avoid focussing on description field
    if (this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
      this.$timeout(() => {
        this.appHelperSvc.switchView(`${RoutePath.Bookmark}/${bookmarkToUpdate.id}`);
      }, 500);
    } else {
      this.appHelperSvc.switchView(`${RoutePath.Bookmark}/${bookmarkToUpdate.id}`);
    }
  }

  enableQueryWatch(): void {
    this.disableQueryWatch = this.$scope.$watch(
      () => this.query,
      (newVal, oldVal) => {
        if ((newVal ?? null) !== (oldVal ?? null)) {
          this.searchTextChanged();
        }
      }
    );
  }

  getKeywords(text: string): ng.IPromise<string[]> {
    return this.platformSvc
      .getCurrentLocale()
      .then((currentLocale) => this.utilitySvc.splitTextIntoWords(text, currentLocale))
      .then((words) => words.filter((x) => x.length > Globals.LookaheadMinChars));
  }

  getSearchResults(): ng.IPromise<Bookmark[]> {
    let queryText = this.query;
    return (
      this.$q
        .resolve()
        .then(() => {
          const searchQuery: BookmarkSearchQuery = {
            url: undefined,
            keywords: []
          };
          if (!queryText) {
            return searchQuery;
          }
          // Match url in query
          const urlRegex = new RegExp(`^${Globals.URL.ValidUrlRegex}`, 'i');
          const url = queryText.match(urlRegex)?.find(Boolean);
          if (url) {
            searchQuery.url = url;
            queryText = queryText.replace(urlRegex, '').trim();
          }

          // Iterate query words to form query data object
          return this.getKeywords(queryText).then((keywords) => {
            searchQuery.keywords = keywords;
            return searchQuery;
          });
        })
        // Execute search and return results
        .then((searchQuery) => this.bookmarkHelperSvc.searchBookmarks(searchQuery))
    );
  }

  ngOnInit(): ng.IPromise<void> {
    return this.settingsSvc.all().then((settings) => {
      this.alternateSearchBarPosition = settings.alternateSearchBarPosition;
      this.displayFolderView = settings.defaultToFolderView;
      this.refreshBookmarks();
    });
  }

  refreshBookmarks(): ng.IPromise<boolean> {
    return this.bookmarkHelperSvc.getCachedBookmarks().then((cachedBookmarks) => {
      // Update bookmark tree only if bookmarks have changed or if visible bookmarks not set
      const doRefresh =
        !angular.equals(cachedBookmarks, this.cachedBookmarks) ||
        (this.displayFolderView ? !this.bookmarkTree : !this.results);
      if (doRefresh) {
        this.selectedBookmarkId = undefined;
        this.cachedBookmarks = cachedBookmarks;

        if (this.displayFolderView) {
          // When in folder view, sort containers by display title
          const bookmarkTreeItems = angular
            .copy(cachedBookmarks)
            .sort((x, y) =>
              this.bookmarkHelperSvc
                .getBookmarkTitleForDisplay(x)
                .localeCompare(this.bookmarkHelperSvc.getBookmarkTitleForDisplay(y))
            ) as BookmarkTreeItem[];

          this.bookmarkTree = bookmarkTreeItems;
        }
      }
      return doRefresh;
    });
  }

  resetSearch(): void {
    // Clear current query and display default search results
    this.disableQueryWatch();
    this.query = null;
    this.queryMeasure = null;
    this.lookahead = null;
    this.enableQueryWatch();
    this.results = undefined;
  }

  searchBookmarks(): ng.IPromise<void> {
    return this.getSearchResults().then((results) => this.displaySearchResults(results));
  }

  @boundMethod
  searchBoxKeyDown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case KeyCode.Enter:
        (document.activeElement as HTMLInputElement).blur();

        // Get search results
        this.displayFolderView = false;
        this.$timeout(() => this.searchBookmarks(), Globals.Debounce);

        // Return focus to search box
        this.appHelperSvc.focusOnElement('input[name=txtSearch]');
        break;

      case KeyCode.ArrowDown:
        if (!this.results?.length) {
          break;
        }

        // Focus on first search result
        event.preventDefault();
        Array.prototype.slice
          .call(document.querySelectorAll('.search-results-container bookmark'))
          .every((searchResult: HTMLDivElement) => {
            searchResult.focus();
            return false;
          });
        break;

      case KeyCode.Tab:
      case KeyCode.ArrowRight:
        if (!this.lookahead) {
          break;
        }
        // Add lookahead to search query
        event.preventDefault();
        this.selectLookahead();
        break;
      default:
        // Clear lookahead if any other key was pressed
        this.lookahead = null;
    }
  }

  @boundMethod
  searchResultsKeyDown(event: KeyboardEvent): void {
    let currentIndex: number;
    let newIndex: number;
    let elementToFocus: Element;

    const target = event.target as HTMLDivElement;

    switch (event.keyCode) {
      case KeyCode.Enter:
        (target.querySelector('.bookmark-content') as HTMLDivElement).click();
        break;
      case KeyCode.ArrowUp:
        if (target.previousElementSibling) {
          // Focus on previous result
          elementToFocus = target.previousElementSibling;
        } else {
          // Focus on search box
          elementToFocus = document.querySelector('input[name=txtSearch]');
        }
        break;
      case KeyCode.ArrowDown:
        if (target.nextElementSibling) {
          // Focus on next result
          elementToFocus = target.nextElementSibling;
        }
        break;
      case KeyCode.PageUp:
        // Focus on result 10 up from current
        currentIndex = [...target.parentElement.children].indexOf(target);
        newIndex = currentIndex - 10;
        if (newIndex < 0) {
          elementToFocus = target.parentElement.firstElementChild;
        } else {
          elementToFocus = target.parentElement.children[newIndex];
        }
        break;
      case KeyCode.PageDown:
        // Focus on result 10 down from current
        currentIndex = [...target.parentElement.children].indexOf(target);
        newIndex = currentIndex + 10;
        if (target.parentElement.children.length <= newIndex) {
          elementToFocus = target.parentElement.lastElementChild;
        } else {
          elementToFocus = target.parentElement.children[newIndex];
        }
        break;
      case KeyCode.Home:
        // Focus on first result
        elementToFocus = target.parentElement.firstElementChild;
        break;
      case KeyCode.End:
        // Focus on last result
        elementToFocus = target.parentElement.lastElementChild;
        break;
      case KeyCode.Backspace:
      case KeyCode.Space:
        // Focus on search box
        elementToFocus = document.querySelector('input[name=txtSearch]');
        break;
      default:
        // Numbers and letters
        if (event.keyCode > 47 && event.keyCode < 106) {
          // Focus on search box
          elementToFocus = document.querySelector('input[name=txtSearch]');
        }
    }

    if (elementToFocus) {
      event.preventDefault();
      (elementToFocus as HTMLDivElement).focus();
    }
  }

  searchTextChanged(): void {
    // Hide alerts
    this.alertSvc.clearCurrentAlert();

    // No query, clear results
    if (!this.query?.trim()) {
      this.resetSearch();
      return;
    }

    // Get last word of search query
    const queryWords = this.query.split(/[\s]+/);
    const lastWord = queryWords.slice(-1).find(Boolean);

    // Display lookahead only if word length exceed minimum
    if ((lastWord ?? []).length < Globals.LookaheadMinChars) {
      this.lookahead = null;
      return;
    }

    // Get lookahead, use current results only if multiple query words are present
    this.platformSvc.getCurrentLocale().then((currentLocale) => {
      return this.bookmarkHelperSvc
        .getLookahead(lastWord.toLocaleLowerCase(currentLocale), queryWords.length > 1 ? this.results : undefined)
        .then((results) => {
          if (!results) {
            this.lookahead = null;
            return;
          }

          let lookahead = results[0];
          const word = results[1];

          // If lookahead is already in query, ignore
          if (queryWords.findIndex((x) => this.utilitySvc.stringsAreEquivalent(x, lookahead, currentLocale)) >= 0) {
            this.lookahead = null;
            return;
          }

          if (lookahead && this.utilitySvc.stringsAreEquivalent(word, lastWord, currentLocale)) {
            // Set lookahead after trimming word
            lookahead = lookahead ? lookahead.substring(word.length) : undefined;
            this.queryMeasure = this.query.replace(/\s/g, '&nbsp;');
            this.lookahead = lookahead.replace(/\s/g, '&nbsp;');
          }
        })
        .then(() => {
          this.displayFolderView = false;
          return this.searchBookmarks();
        });
    });
  }

  @boundMethod
  selectBookmark(event: Event, bookmarkId: number): void {
    this.utilitySvc.stopEventPropagation(event);
    if (!this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
      return;
    }

    // Display menu for selected bookmark
    this.selectedBookmarkId = bookmarkId;
  }

  @boundMethod
  selectLookahead(): void {
    this.query = `${this.query}${this.lookahead}`;
    this.lookahead = null;
    this.searchTextChanged();
    this.appHelperSvc.focusOnElement('input[name=txtSearch]');
  }

  @boundMethod
  shareBookmark(event: Event, bookmarkToShare: Bookmark) {
    // Stop event propogation
    this.utilitySvc.stopEventPropagation(event);

    // Trigger native share functionality
    (this.appHelperSvc as AndroidAppHelperService).shareBookmark(bookmarkToShare);
  }

  @boundMethod
  switchToBookmarkView(): void {
    this.appHelperSvc.switchView(RoutePath.Bookmark);
  }

  @boundMethod
  switchToSettingsView(): void {
    this.appHelperSvc.switchView(RoutePath.Settings);
  }

  @boundMethod
  toggleBookmarkTreeView(): ng.IPromise<void> {
    // Clear current query and switch view
    this.resetSearch();
    this.displayFolderView = !this.displayFolderView;
    return this.refreshBookmarks().then(() => {
      // Ensure search results are displayed in results view
      if (!this.displayFolderView) {
        return this.getSearchResults().then((results) => this.displaySearchResults(results));
      }
    });
  }
}
