import './app-bookmark.component.scss';
import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import _ from 'underscore';
import Strings from '../../../../res/strings/en.json';
import { AlertType } from '../../shared/alert/alert.enum';
import AlertService from '../../shared/alert/alert.service';
import BookmarkHelperService from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { BookmarkChangeType } from '../../shared/bookmark/bookmark.enum';
import {
  AddBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  BookmarkMetadata,
  ModifyBookmarkChangeData,
  RemoveBookmarkChangeData
} from '../../shared/bookmark/bookmark.interface';
import { ExceptionHandler } from '../../shared/exception/exception.interface';
import Globals from '../../shared/global-shared.constants';
import { PlatformService, WebpageMetadata } from '../../shared/global-shared.interface';
import { SyncType } from '../../shared/sync/sync.enum';
import UtilityService from '../../shared/utility/utility.service';
import WorkingService from '../../shared/working/working.service';
import { AppViewType, KeyCode } from '../app.enum';
import { AppHelperService } from '../app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appBookmark',
  template: require('./app-bookmark.component.html')
})
export default class AppBookmarkComponent implements OnInit {
  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  addButtonDisabledUntilEditForm = false;
  AppViewType = AppViewType;
  bookmarkForm: ng.IFormController;
  bookmarkFormData: BookmarkMetadata;
  currentBookmarkId: number;
  defaultProtocol = 'https://';
  descriptionFieldOriginalHeight: string;
  editMode = false;
  originalUrl: string;
  strings = Strings;
  tagLookahead: string;
  tagText: string;
  tagTextMeasure: string;

  static $inject = [
    '$exceptionHandler',
    '$q',
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
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }

  changesSynced(): ng.IPromise<void> {
    return this.appHelperSvc.syncBookmarksSuccess();
  }

  clearExistingTags(): void {
    this.bookmarkFormData.tags = [];
    this.bookmarkForm.$setDirty();
    this.appHelperSvc.focusOnElement('input[name="bookmarkTags"]');
  }

  close(): void {
    this.appHelperSvc.switchView();
  }

  createBookmark(): void {
    // Add tags if tag text present
    if (this.tagText?.length > 0) {
      this.createTags();
    }

    // Clone current bookmark object
    const bookmarkToAdd = this.bookmarkHelperSvc.cleanBookmark(this.bookmarkFormData);

    // Check for protocol
    if (!new RegExp(Globals.URL.ProtocolRegex).test(bookmarkToAdd.url ?? '')) {
      bookmarkToAdd.url = `${this.defaultProtocol}${bookmarkToAdd.url}`;
    }

    // Validate the new bookmark
    this.validateBookmark(bookmarkToAdd).then((isValid) => {
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
      return this.queueSync(changeInfo).then(this.changesSynced);
    });
  }

  createTags(): void {
    // Clean and sort tags and add them to tag array
    const newTags = this.utilitySvc.getTagArrayFromText(this.tagText);
    this.bookmarkFormData.tags = _.sortBy(_.union(newTags, this.bookmarkFormData.tags), (tag) => {
      return tag;
    });

    this.bookmarkForm.$setDirty();
    this.tagText = undefined;
    this.tagLookahead = undefined;
    this.appHelperSvc.focusOnElement('input[name="bookmarkTags"]');
  }

  deleteBookmark(): void {
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
    this.queueSync(changeInfo).then(this.changesSynced);
  }

  descriptionChanged(): void {
    // Limit the bookmark description to the max length
    this.$timeout(() => {
      this.bookmarkFormData.description = this.utilitySvc.trimToNearestWord(
        this.bookmarkFormData.description,
        Globals.Bookmarks.DescriptionMaxLength
      );
    });
  }

  getMetadataForCurrentPage(): ng.IPromise<BookmarkMetadata> {
    return this.platformSvc.getPageMetadata(true).then(this.getPageMetadataAsBookmarkMetadata);
  }

  getMetadataForUrl(url: string): ng.IPromise<BookmarkMetadata> {
    return this.$q<BookmarkMetadata>((resolve, reject) => {
      if (angular.isUndefined(url ?? undefined)) {
        return resolve();
      }
      return this.platformSvc
        .getPageMetadata(true, url)
        .then(this.getPageMetadataAsBookmarkMetadata)
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
        // Check if bookmark data provided via view
        const bookmarkViewData = this.appHelperSvc.getCurrentView().data?.bookmark;
        if (bookmarkViewData?.id) {
          this.editMode = true;
          return resolve(bookmarkViewData);
        }

        // Check if current url is a bookmark
        return this.bookmarkHelperSvc.findCurrentUrlInBookmarks().then((existingBookmark) => {
          if (existingBookmark) {
            return resolve(existingBookmark);
          }
          resolve(bookmarkViewData);
        });
      })
        .then((bookmark) => {
          // If bookmark was found, set view model for edit
          if (!angular.isUndefined(bookmark ?? undefined)) {
            this.bookmarkFormData = this.bookmarkHelperSvc.extractBookmarkMetadata(bookmark);
            this.currentBookmarkId = bookmark.id;
            this.editMode = angular.isNumber(this.currentBookmarkId);
            this.originalUrl = this.bookmarkFormData.url;
            return;
          }

          // Set default bookmark form values
          this.bookmarkFormData = { url: this.defaultProtocol };
          this.originalUrl = this.bookmarkFormData.url;
          this.addButtonDisabledUntilEditForm = true;

          // Get current page metadata as bookmark
          return this.getMetadataForCurrentPage()
            .then((currentPageMetadata) => {
              if (currentPageMetadata) {
                this.bookmarkFormData = currentPageMetadata;
                this.originalUrl = currentPageMetadata.url;
                this.addButtonDisabledUntilEditForm = false;
              }
            })
            .catch(this.$exceptionHandler);
        })
        // Set initial focus
        .then(() => this.$timeout(() => this.appHelperSvc.focusOnElement('.focused')))
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

  populateFromUrlMetadata(): void {
    this.getMetadataForUrl(this.bookmarkFormData.url).then((metadata) => {
      if (!metadata?.title && !metadata?.description && !metadata?.tags) {
        return;
      }

      // Update bookmark metadata and set url field as pristine
      this.bookmarkFormData.title = metadata.title ?? this.bookmarkFormData.title;
      this.bookmarkFormData.description = metadata.description ?? this.bookmarkFormData.description;
      this.bookmarkFormData.tags = metadata.tags ?? this.bookmarkFormData.tags;
      this.bookmarkForm.bookmarkUrl.$setPristine();

      // Display alert
      this.alertSvc.setCurrentAlert({
        message: this.platformSvc.getI18nString(Strings.getMetadata_Success_Message),
        type: AlertType.Information
      });
    });
  }

  queueSync(changeInfo: BookmarkChange): ng.IPromise<any> {
    return this.appHelperSvc.queueSync({
      changeInfo,
      type: SyncType.LocalAndRemote
    });
  }

  removeTag(tag: string): void {
    this.bookmarkFormData.tags = _.without(this.bookmarkFormData.tags, tag);
    this.bookmarkForm.$setDirty();
    this.appHelperSvc.focusOnElement('#bookmarkForm input[name="bookmarkTags"]');
  }

  selectTagsLookahead(): void {
    this.tagText += this.tagLookahead.replace(/&nbsp;/g, ' ');
    this.createTags();
    this.appHelperSvc.focusOnElement('input[name="bookmarkTags"]');
  }

  tagsTextChanged(): void {
    if (!this.tagText?.trim()) {
      return;
    }

    // Get last word of tag text
    const lastWord = _.last<string[]>(this.tagText.split(',')).trimLeft();

    // Display lookahead if word length exceeds minimum
    if (!(lastWord?.length > Globals.LookaheadMinChars)) {
      this.tagLookahead = undefined;
      return;
    }
    this.bookmarkHelperSvc
      .getLookahead(lastWord.toLowerCase(), null, true, this.bookmarkFormData.tags)
      .then((results) => {
        if (!results) {
          this.tagLookahead = undefined;
          return;
        }

        let lookahead = results[0];
        const word = results[1];

        if (lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
          // Set lookahead after trimming word
          lookahead = lookahead ? lookahead.substring(word.length) : undefined;
          this.tagTextMeasure = this.tagText.replace(/\s/g, '&nbsp;');
          this.tagLookahead = lookahead.replace(/\s/g, '&nbsp;');
        }
      });
  }

  tagsTextKeyDown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case KeyCode.Enter:
        // Add new tags
        event.preventDefault();
        this.createTags();
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
    }
  }

  updateBookmark(): void {
    // Add tags if tag text present
    if (this.tagText?.length > 0) {
      this.createTags();
    }

    // Validate update info
    const bookmarkToModify = this.bookmarkHelperSvc.cleanBookmark(this.bookmarkFormData);
    bookmarkToModify.id = this.currentBookmarkId;
    if (!new RegExp(Globals.URL.ProtocolRegex).test(bookmarkToModify.url ?? '')) {
      bookmarkToModify.url = `${this.defaultProtocol}${bookmarkToModify.url}`;
    }
    this.validateBookmark(bookmarkToModify, this.originalUrl).then((isValid) => {
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
      return this.queueSync(changeInfo).then(this.changesSynced);
    });
  }

  urlChanged(): void {
    // Reset form if field is invalid
    if (this.bookmarkForm.bookmarkUrl.$invalid) {
      this.bookmarkForm.bookmarkUrl.$setValidity('Exists', true);
    }
  }

  validateBookmark(bookmarkToValidate: BookmarkMetadata, originalUrl?: string): ng.IPromise<boolean> {
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
}
