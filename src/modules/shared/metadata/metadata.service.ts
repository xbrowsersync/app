import { Injectable } from 'angular-ts-decorators';
import { WebpageMetadata } from '../global-shared.interface';
import { getMetadata } from './get-metadata';

@Injectable('MetadataService')
export class MetadataService {
  getMetadata(url: string, html: string): WebpageMetadata {
    return getMetadata(url, html);
  }
}
