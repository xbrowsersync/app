import './app-search.component.scss';
import { OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AndroidAppHelperService from '../../android/android-app/shared/android-app-helper/android-app-helper.service';
import AlertService from '../../shared/alert/alert.service';
import { Bookmark } from '../../shared/bookmark/bookmark.interface';
import BookmarkHelperService from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { ExceptionHandler } from '../../shared/exception/exception.interface';
import Globals from '../../shared/global-shared.constants';
import { PlatformService } from '../../shared/global-shared.interface';
import SettingsService from '../../shared/settings/settings.service';
import UtilityService from '../../shared/utility/utility.service';
import WorkingService from '../../shared/working/working.service';
import { AppViewType, KeyCode } from '../app.enum';
import AppHelperService from '../shared/app-helper/app-helper.service';
import { BookmarkSearchResult, BookmarkTreeItem } from './app-search.interface';

@autobind
export default abstract class AppSearchComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  alternateSearchBarPosition: boolean;
  AppViewType = AppViewType;
  batchResultsNum = 10;
  bookmarkTree: BookmarkTreeItem[];
  cancelGetBookmarksRequest: any;
  currentUrlBookmarked: boolean;
  displayFolderView: boolean;
  getLookaheadTimeout: any;
  getSearchResultsTimeout: any;
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
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }

  addBookmark(): void {
    this.appHelperSvc.switchView({
      view: AppViewType.Bookmark
    });
  }

  clearSearch(): void {
    this.displayDefaultSearchState().then(() => {
      // Display default search results and focus on search box
      this.searchBookmarks();
      this.appHelperSvc.focusOnElement('input[name=txtSearch]');
    });
  }

  displayDefaultSearchState(): ng.IPromise<void> {
    // Clear search and results
    this.query = null;
    this.queryMeasure = null;
    this.lookahead = null;
    this.results = null;

    if (this.displayFolderView) {
      // Initialise bookmark tree
      this.bookmarkTree = null;
      this.bookmarkHelperSvc.getCachedBookmarks().then((results) => {
        // Display bookmark tree view, sort containers by display title
        this.bookmarkTree = results.sort((x, y) => {
          return this.bookmarkHelperSvc
            .getBookmarkTitleForDisplay(x)
            .localeCompare(this.bookmarkHelperSvc.getBookmarkTitleForDisplay(y));
        }) as BookmarkTreeItem[];
      });
    }

    return this.$q.resolve();
  }

  displayMoreSearchResults(): void {
    if (this.results?.length && this.scrollDisplayMoreEnabled) {
      // Display next batch of results
      this.resultsDisplayed += this.batchResultsNum;
    }
  }

  editBookmark(event: Event, bookmarkToUpdate: Bookmark): void {
    // Stop event propogation
    this.utilitySvc.stopEventPropagation(event);

    // On mobiles, display bookmark panel with slight delay to avoid focussing on description field
    if (this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
      this.$timeout(() => {
        this.appHelperSvc.switchView({ data: { bookmark: bookmarkToUpdate }, view: AppViewType.Bookmark });
      }, 500);
    } else {
      this.appHelperSvc.switchView({ data: { bookmark: bookmarkToUpdate }, view: AppViewType.Bookmark });
    }
  }

  getKeywords(text: string): string[] {
    return this.utilitySvc.splitTextIntoWords(text).filter((x) => x.length > Globals.LookaheadMinChars);
  }

  ngOnInit(): ng.IPromise<void> {
    return this.settingsSvc.all().then((settings) => {
      this.alternateSearchBarPosition = settings.alternateSearchBarPosition;
      this.displayFolderView = settings.defaultToFolderView;
      this.bookmarkTree = undefined;
      this.selectedBookmarkId = undefined;
      this.displayDefaultSearchState();
    });
  }

  searchBookmarks(): ng.IPromise<void> {
    const queryData = {
      url: undefined,
      keywords: []
    };
    const urlRegex = new RegExp(`^${Globals.URL.ValidUrlRegex}$`, 'i');

    if (this.query) {
      // Add query word as url if query is in url format, otherwise add to keywords
      if (!queryData.url && urlRegex.test(this.query.trim())) {
        queryData.url = this.query.trim();
      } else {
        // Iterate query words to form query data object
        queryData.keywords = this.getKeywords(this.query);
      }
    }

    return this.bookmarkHelperSvc.searchBookmarks(queryData).then((results) => {
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
    });
  }

  searchBoxKeyDown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case KeyCode.Enter:
        (document.activeElement as HTMLInputElement).blur();

        if (this.getSearchResultsTimeout) {
          this.$timeout.cancel(this.getSearchResultsTimeout);
          this.getSearchResultsTimeout = null;
        }

        // Get search results
        this.displayFolderView = false;
        this.searchBookmarks();

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
    }
  }

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

    // Cancel existing timeout
    if (this.getSearchResultsTimeout) {
      this.$timeout.cancel(this.getSearchResultsTimeout);
      this.getSearchResultsTimeout = null;
    }

    // No query, clear results
    if (!this.query?.trim()) {
      this.displayDefaultSearchState();
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

    // Get lookahead
    this.bookmarkHelperSvc
      .getLookahead(lastWord.toLowerCase(), this.results)
      .then((results) => {
        if (!results) {
          this.lookahead = null;
          return;
        }

        let lookahead = results[0];
        const word = results[1];

        if (lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
          // Set lookahead after trimming word
          lookahead = lookahead ? lookahead.substring(word.length) : undefined;
          this.queryMeasure = this.query.replace(/\s/g, '&nbsp;');
          this.lookahead = lookahead.replace(/\s/g, '&nbsp;');
        }

        this.cancelGetBookmarksRequest = null;
      })
      .then(() => {
        this.displayFolderView = false;
        return this.searchBookmarks();
      });
  }

  selectBookmark(event: Event, bookmarkId: number): void {
    // Stop event propogation
    this.utilitySvc.stopEventPropagation(event);

    if (!this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
      return;
    }

    // Display menu for selected bookmark
    this.selectedBookmarkId = bookmarkId;
  }

  selectLookahead(): void {
    this.query = `${this.query}${this.lookahead}`;
    this.searchTextChanged();
    this.appHelperSvc.focusOnElement('input[name=txtSearch]');
  }

  shareBookmark(event: Event, bookmarkToShare: Bookmark) {
    // Stop event propogation
    this.utilitySvc.stopEventPropagation(event);

    // Trigger native share functionality
    (this.appHelperSvc as AndroidAppHelperService).shareBookmark(bookmarkToShare);
  }

  switchToBookmarkView(): void {
    // Display bookmark panel
    this.appHelperSvc.switchView({ view: AppViewType.Bookmark });
  }

  toggleBookmarkTreeView(): ng.IPromise<void> {
    this.displayFolderView = !this.displayFolderView;
    return this.displayDefaultSearchState().then(() => {
      // Display default search results
      if (!this.displayFolderView) {
        this.searchBookmarks();
      }
    });
  }
}
