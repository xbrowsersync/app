import { ApiServiceStatus } from '../api.enum';
import { ApiServiceInfo, ApiServiceInfoResponse, ApiSyncInfo } from '../api.interface';

export interface ApiXbrowsersyncErrorResponse {
  code: string;
  message: string;
}

export interface ApiXbrowsersyncServiceInfo extends ApiServiceInfo {
  location?: string;
  maxSyncSize?: number;
  message?: string;
  url?: string;
  version?: string;
}

export interface ApiXbrowsersyncServiceInfoResponse extends ApiServiceInfoResponse {
  location?: string;
  maxSyncSize: number;
  message?: string;
  status: ApiServiceStatus;
  version: string;
}

export interface ApiXbrowsersyncSyncInfo extends ApiSyncInfo {
  serviceUrl: string;
}
