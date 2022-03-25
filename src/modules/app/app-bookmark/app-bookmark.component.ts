import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { AndroidAppHelperService } from '../../android/android-app/shared/android-app-helper/android-app-helper.service';
import { AlertType } from '../../shared/alert/alert.enum';
import { AlertService } from '../../shared/alert/alert.service';
import { BookmarkChangeType } from '../../shared/bookmark/bookmark.enum';
import {
  AddBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  BookmarkMetadata,
  ModifyBookmarkChangeData,
  RemoveBookmarkChangeData
} from '../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { ExceptionHandler } from '../../shared/errors/errors.interface';
import Globals from '../../shared/global-shared.constants';
import { PlatformService, WebpageMetadata } from '../../shared/global-shared.interface';
import { SyncType } from '../../shared/sync/sync.enum';
import { UtilityService } from '../../shared/utility/utility.service';
import { WorkingService } from '../../shared/working/working.service';
import { KeyCode, RoutePath } from '../app.enum';
import { AppHelperService } from '../shared/app-helper/app-helper.service';
import { BookmarkRouteParams } from './app-bookmark.interface';

@Component({
  controllerAs: 'vm',
  selector: 'appBookmark',
  styles: [require('./app-bookmark.component.scss')],
  template: require('./app-bookmark.component.html')
})
export class AppBookmarkComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $routeParams: ng.route.IRouteParamsService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  addButtonDisabledUntilEditForm = false;
  RoutePath = RoutePath;
  bookmarkForm: ng.IFormController;
  bookmarkFormData: BookmarkMetadata;
  currentBookmarkId: number;
  defaultProtocol = 'https://';
  descriptionFieldOriginalHeight: string;
  displayUpdatePropertiesButton = false;
  editMode = false;
  globals = Globals;
  originalUrl: string;
  tagLookahead: string;
  tagText: string;
  tagTextMeasure: string;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$routeParams',
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'BookmarkHelperService',
    'PlatformService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $q: ng.IQService,
    $routeParams: ng.route.IRouteParamsService,
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$q = $q;
    this.$routeParams = $routeParams;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    $scope.$watch(
      () => this.tagText,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.tagsTextChanged();
        }
      }
    );
  }

  changesSynced(): ng.IPromise<void> {
    return this.appHelperSvc.syncBookmarksSuccess();
  }

  @boundMethod
  clearExistingTags(): void {
    this.bookmarkFormData.tags = [];
    this.bookmarkForm.$setDirty();
    this.appHelperSvc.focusOnElement('input[name="bookmarkTags"]');
  }

  @boundMethod
  close(): void {
    this.appHelperSvc.switchView();
  }

  @boundMethod
  createBookmark(): ng.IPromise<void> {
    // Add tags if tag text present
    if (this.tagText?.length) {
      this.createTags();
    }

    // Clone current bookmark object
    const bookmarkToAdd = this.bookmarkHelperSvc.cleanBookmark(this.bookmarkFormData);

    // Check for protocol
    if (!new RegExp(Globals.URL.ProtocolRegex).test(bookmarkToAdd.url ?? '')) {
      bookmarkToAdd.url = `${this.defaultProtocol}${bookmarkToAdd.url}`;
    }

    // Validate the new bookmark
    return this.validateBookmark(bookmarkToAdd).then((isValid) => {
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
      return this.queueSync(changeInfo).then(() => this.changesSynced());
    });
  }

  createTags(): void {
    if (!this.tagText) {
      return;
    }

    this.platformSvc.getCurrentLocale().then((currentLocale) => {
      // Clean and sort tags and add them to tag array
      const newTags = this.utilitySvc.getTagArrayFromText(this.tagText.toLocaleLowerCase(currentLocale));
      this.bookmarkFormData.tags = this.utilitySvc.sortWords([...newTags, ...(this.bookmarkFormData.tags ?? [])]);
      this.bookmarkForm.$setDirty();
      this.tagText = undefined;
      this.tagLookahead = undefined;
      this.appHelperSvc.focusOnElement('input[name="bookmarkTags"]');
    });
  }

  @boundMethod
  deleteBookmark(): ng.IPromise<void> {
    // Display loading overlay
    this.workingSvc.show();

    // Create change info and sync changes
    const data: RemoveBookmarkChangeData = {
      id: this.currentBookmarkId
    };
    const changeInfo: BookmarkChange = {
      changeData: data,
      type: BookmarkChangeType.Remove
    };
    return this.queueSync(changeInfo).then(() => this.changesSynced());
  }

  @boundMethod
  descriptionChanged(): void {
    // Limit the bookmark description to the max length
    this.$timeout(() => {
      this.bookmarkFormData.description = this.utilitySvc.trimToNearestWord(
        this.bookmarkFormData.description,
        Globals.Bookmarks.DescriptionMaxLength
      );
    });
  }

  getMetadataForCurrentPage(): ng.IPromise<Boolean | BookmarkMetadata> {
    return this.platformSvc.getPageMetadata(true).then((metadata) => this.getPageMetadataAsBookmarkMetadata(metadata));
  }

  getMetadataForUrl(url: string): ng.IPromise<BookmarkMetadata> {
    return this.$q<BookmarkMetadata>((resolve, reject) => {
      if (angular.isUndefined(url ?? undefined)) {
        return resolve();
      }
      return this.platformSvc
        .getPageMetadata(true, url)
        .then((metadata) => this.getPageMetadataAsBookmarkMetadata(metadata))
        .then(resolve)
        .catch(reject);
    });
  }

  getPageMetadataAsBookmarkMetadata(metadata: WebpageMetadata): BookmarkMetadata {
    if (angular.isUndefined(metadata ?? undefined)) {
      return;
    }

    return {
      description: this.utilitySvc.trimToNearestWord(metadata.description, Globals.Bookmarks.DescriptionMaxLength),
      tags: this.utilitySvc.getTagArrayFromText(metadata.tags),
      title: metadata.title,
      url: metadata.url
    };
  }

  ngOnInit(): ng.IPromise<void> {
    return (
      this.$q<Bookmark>((resolve) => {
        // Get bookmark if specified in route
        const bookmarkId = (this.$routeParams as BookmarkRouteParams).id;
        if (bookmarkId) {
          this.editMode = true;
          return this.bookmarkHelperSvc.getBookmarkById(parseInt(bookmarkId, 10)).then(resolve);
        }

        // Check if current url is a bookmark
        return this.bookmarkHelperSvc.findCurrentUrlInBookmarks().then((existingBookmark) => {
          if (existingBookmark) {
            return resolve(existingBookmark);
          }
          resolve();
        });
      })
        .then((bookmark) => {
          // If bookmark was found, set view model for edit
          if (!angular.isUndefined(bookmark ?? undefined)) {
            this.bookmarkFormData = this.bookmarkHelperSvc.extractBookmarkMetadata(bookmark);
            this.currentBookmarkId = bookmark.id;
            this.editMode = angular.isNumber(this.currentBookmarkId);
            this.originalUrl = this.bookmarkFormData.url;
            return true;
          }

          // Set default bookmark form values
          this.bookmarkFormData = { url: this.defaultProtocol };
          this.originalUrl = this.bookmarkFormData.url;
          this.addButtonDisabledUntilEditForm = true;

          // Get current page metadata as bookmark
          return this.getMetadataForCurrentPage()
            .then((currentPageMetadata) => {
              if (currentPageMetadata === false) {
                return false;
              }
              if (!angular.isUndefined(currentPageMetadata)) {
                this.bookmarkFormData = currentPageMetadata as BookmarkMetadata;
              }
              return true;
            })
            .catch((err) => this.$exceptionHandler(err))
            .finally(() => {
              this.addButtonDisabledUntilEditForm = false;
            });
        })
        // Set initial focus
        .then((setFocus) => {
          if (setFocus) {
            this.$timeout(() => this.appHelperSvc.focusOnElement('.focused'));
          }
        })
        .catch((err) => {
          if (err.url) {
            // Set bookmark url
            this.bookmarkFormData = {
              url: err.url
            } as BookmarkMetadata;
          }
          throw err;
        })
    );
  }

  @boundMethod
  populateFromUrlMetadata(): void {
    this.getMetadataForUrl(this.bookmarkFormData.url).then((metadata) => {
      this.displayUpdatePropertiesButton = false;
      if (!metadata?.title && !metadata?.description && !metadata?.tags) {
        return;
      }

      // Update bookmark metadata and set url field as pristine
      this.bookmarkFormData.title = metadata.title ?? this.bookmarkFormData.title;
      this.bookmarkFormData.description = metadata.description ?? this.bookmarkFormData.description;
      this.bookmarkFormData.tags = metadata.tags ?? this.bookmarkFormData.tags;
      this.bookmarkForm.bookmarkUrl.$setPristine();

      // Display alert
      this.alertSvc.currentAlert = {
        message: this.platformSvc.getI18nString(this.Strings.Alert.GetMetadata.Success),
        type: AlertType.Information
      };
    });
  }

  queueSync(changeInfo: BookmarkChange): ng.IPromise<void> {
    return this.platformSvc
      .queueSync({
        changeInfo,
        type: SyncType.LocalAndRemote
      })
      .catch((err) =>
        this.appHelperSvc.syncBookmarksFailed(err).then(() => {
          throw err;
        })
      );
  }

  @boundMethod
  removeTag(tag: string): void {
    this.bookmarkFormData.tags = this.bookmarkFormData.tags.filter((x) => x !== tag);
    this.bookmarkForm.$setDirty();
    this.appHelperSvc.focusOnElement('#bookmarkForm input[name="bookmarkTags"]');
  }

  @boundMethod
  selectTagsLookahead(): void {
    this.tagText += this.tagLookahead.replace(/&nbsp;/g, ' ');
    this.createTags();
    this.appHelperSvc.focusOnElement('input[name="bookmarkTags"]');
  }

  @boundMethod
  shareBookmark(event: Event, bookmarkToShare: Bookmark) {
    // Stop event propogation
    this.utilitySvc.stopEventPropagation(event);

    // Trigger native share functionality
    (this.appHelperSvc as AndroidAppHelperService).shareBookmark(bookmarkToShare);
  }

  tagsTextChanged(): void {
    if (!this.tagText?.trim()) {
      return;
    }

    // Get last word of tag text
    this.platformSvc.getCurrentLocale().then((currentLocale) => {
      const words = this.utilitySvc.splitTextIntoWords(this.tagText, currentLocale);
      let lastWord = words.slice(-1).find(Boolean);
      if (!angular.isUndefined(lastWord)) {
        lastWord = lastWord.trimLeft();
      }

      // Display lookahead if word length exceeds minimum
      if (!(lastWord?.length >= Globals.LookaheadMinChars)) {
        this.tagLookahead = undefined;
        return;
      }
      return this.bookmarkHelperSvc
        .getLookahead(lastWord.toLocaleLowerCase(currentLocale), null, true, this.bookmarkFormData.tags)
        .then((results) => {
          if (!results) {
            this.tagLookahead = undefined;
            return;
          }

          let lookahead = results[0];
          const word = results[1];

          if (lookahead && this.utilitySvc.stringsAreEquivalent(word, lastWord, currentLocale)) {
            // Set lookahead after trimming word
            lookahead = lookahead ? lookahead.substring(word.length) : undefined;
            this.tagTextMeasure = this.tagText.replace(/\s/g, '&nbsp;');
            this.tagLookahead = lookahead.replace(/\s/g, '&nbsp;');
          }
        });
    });
  }

  @boundMethod
  tagsTextKeyDown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case KeyCode.Enter:
        // Add new tags
        event.preventDefault();
        this.$timeout(() => this.createTags(), Globals.Debounce);
        break;
      case KeyCode.Tab:
      case KeyCode.ArrowRight:
        if (!this.tagLookahead) {
          break;
        }
        // Add lookahead to tag text
        event.preventDefault();
        this.tagText += this.tagLookahead.replace(/&nbsp;/g, ' ');
        this.tagsTextChanged();
        this.appHelperSvc.focusOnElement('input[name="bookmarkTags"]');
        break;
      default:
        // Clear lookahead if any other key was pressed
        this.tagLookahead = null;
    }
  }

  @boundMethod
  updateBookmark(): ng.IPromise<void> {
    // Add tags if tag text present
    if (this.tagText?.length) {
      this.createTags();
    }

    // Validate update info
    const bookmarkToModify = this.bookmarkHelperSvc.cleanBookmark(this.bookmarkFormData);
    bookmarkToModify.id = this.currentBookmarkId;
    if (!new RegExp(Globals.URL.ProtocolRegex).test(bookmarkToModify.url ?? '')) {
      bookmarkToModify.url = `${this.defaultProtocol}${bookmarkToModify.url}`;
    }
    return this.validateBookmark(bookmarkToModify, this.originalUrl).then((isValid) => {
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
      return this.queueSync(changeInfo).then(() => {
        return this.changesSynced();
      });
    });
  }

  @boundMethod
  urlChanged(): void {
    // Reset form if field is invalid
    if (this.bookmarkForm.bookmarkUrl.$invalid) {
      this.bookmarkForm.bookmarkUrl.$setValidity('Exists', true);
      this.bookmarkForm.bookmarkUrl.$setValidity('Invalid', true);
      this.displayUpdatePropertiesButton = false;
    }

    if ((this.bookmarkFormData.url ?? undefined) === undefined) {
      return;
    }

    // Check url is valid
    if (!new RegExp(`^${Globals.URL.ValidUrlRegex}$`, 'i').test(this.bookmarkFormData.url)) {
      this.bookmarkForm.bookmarkUrl.$setValidity('Invalid', false);
      return;
    }

    // Display update properties button if url is valid
    this.displayUpdatePropertiesButton =
      this.bookmarkForm.bookmarkUrl.$dirty && !this.bookmarkForm.bookmarkUrl.$invalid;
  }

  validateBookmark(bookmarkToValidate: BookmarkMetadata, originalUrl?: string): ng.IPromise<boolean> {
    return this.platformSvc.getCurrentLocale().then((currentLocale) => {
      // Skip validation if URL is unmodified
      if (this.utilitySvc.stringsAreEquivalent(bookmarkToValidate.url, originalUrl, currentLocale)) {
        return true;
      }

      // Check if bookmark url already exists
      return this.bookmarkHelperSvc
        .searchBookmarks({
          url: bookmarkToValidate.url
        })
        .then((results) => {
          // Filter search results for bookmarks with matching urls
          const duplicateBookmarks = results.filter((b) => {
            return this.utilitySvc.stringsAreEquivalent(b.url, bookmarkToValidate.url, currentLocale);
          });

          return duplicateBookmarks.length === 0;
        });
    });
  }
}
