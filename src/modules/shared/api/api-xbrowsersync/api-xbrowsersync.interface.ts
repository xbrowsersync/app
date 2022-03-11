import { ApiServiceStatus } from '../api.enum';
import { ApiServiceInfoResponse, ApiServiceSyncInfo } from '../api.interface';

export interface ApiXbrowsersyncErrorResponse {
  code: string;
  message: string;
}

export interface ApiXbrowsersyncServiceInfoResponse extends ApiServiceInfoResponse {
  maxSyncSize: number;
  message?: string;
  status: ApiServiceStatus;
  version: string;
}

export interface ApiXbrowsersyncServiceSyncInfo extends ApiServiceSyncInfo {
  serviceUrl: string;
}
