import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { BookmarkMappingNotFoundException } from '../../../shared/exception/exception';
import { StoreKey } from '../../../shared/store/store.enum';
import StoreService from '../../../shared/store/store.service';
import { BookmarkIdMapping } from './bookmark-id-mapper.interface';

@autobind
@Injectable('BookmarkIdMapperService')
export default class BookmarkIdMapperService {
  $q: ng.IQService;
  storeSvc: StoreService;

  static $inject = ['$q', 'StoreService'];
  constructor($q: ng.IQService, StoreSvc: StoreService) {
    this.$q = $q;
    this.storeSvc = StoreSvc;
  }

  add(newMappings: BookmarkIdMapping | BookmarkIdMapping[]): ng.IPromise<void> {
    // Convert mappings to arrays if necessary
    const newMappingsArr = Array.isArray(newMappings) ? newMappings : [newMappings];

    // Add new mappings to existing mappings
    return this.storeSvc
      .get<BookmarkIdMapping[]>(StoreKey.BookmarkIdMappings)
      .then((idMappings) => {
        return idMappings.concat(newMappingsArr);
      })
      .then((updatedMappings) => {
        return this.set(updatedMappings);
      });
  }

  clear(): ng.IPromise<void> {
    return this.storeSvc.remove(StoreKey.BookmarkIdMappings);
  }

  createMapping(syncedId: number, nativeId?: string): BookmarkIdMapping {
    return {
      nativeId,
      syncedId
    };
  }

  get(nativeId: string, syncedId?: number): ng.IPromise<BookmarkIdMapping> {
    return this.storeSvc.get<BookmarkIdMapping[]>(StoreKey.BookmarkIdMappings).then((idMappings) => {
      // Find the requested mapping
      let mapping: BookmarkIdMapping;
      if (nativeId != null) {
        mapping = idMappings.find((x) => {
          return x.nativeId === nativeId;
        });
      } else if (syncedId != null) {
        mapping = idMappings.find((x) => {
          return x.syncedId === syncedId;
        });
      }
      return mapping;
    });
  }

  remove(syncedIds: number | number[], nativeIds?: string | string[]): ng.IPromise<void> {
    // Convert ids to arrays if necessary
    const syncedIdsArr = syncedIds != null ? (Array.isArray(syncedIds) ? syncedIds : [syncedIds]) : null;
    const nativeIdsArr = nativeIds != null ? (Array.isArray(nativeIds) ? nativeIds : [nativeIds]) : null;

    // Retrieve id mappings
    return this.storeSvc
      .get<BookmarkIdMapping[]>(StoreKey.BookmarkIdMappings)
      .then((idMappings) => {
        // Remove id mappings matching provided synced ids
        const idMappingsLessSynced =
          syncedIdsArr == null
            ? idMappings
            : syncedIdsArr.reduce((acc, val) => {
                const indexToRemove = acc.findIndex((x) => {
                  return x.syncedId === val;
                });
                if (indexToRemove < 0) {
                  throw new Error('Bookmark ID mapping to remove could not be determined');
                }
                return acc.filter((x, index) => {
                  return index !== indexToRemove;
                });
              }, idMappings);

        // Remove id mappings matching provided native ids
        const idMappingsLessNative =
          nativeIdsArr == null
            ? idMappingsLessSynced
            : nativeIdsArr.reduce((acc, val) => {
                const indexToRemove = acc.findIndex((x) => {
                  return x.nativeId === val;
                });
                if (indexToRemove < 0) {
                  throw new Error('Bookmark ID mapping to remove could not be determined');
                }
                return acc.filter((x, index) => {
                  return index !== indexToRemove;
                });
              }, idMappingsLessSynced);

        // Add updated mappings to store
        return this.set(idMappingsLessNative);
      })
      .catch((err) => {
        throw new BookmarkMappingNotFoundException(undefined, err);
      });
  }

  set(idMappings: BookmarkIdMapping[]): ng.IPromise<void> {
    // Sort mappings then save to store
    const sortedMappings = idMappings.sort((x, y) => {
      return x.syncedId - y.syncedId;
    });
    return this.storeSvc.set(StoreKey.BookmarkIdMappings, sortedMappings);
  }
}
