import { ApiXbrowsersyncSyncInfo } from '../api/api-xbrowsersync/api-xbrowsersync.interface';
import { PlatformInfo } from '../global-shared.interface';
import { AllSettings } from '../settings/settings.interface';

export interface TelemetryPayload extends Partial<AllSettings>, Partial<ApiXbrowsersyncSyncInfo>, PlatformInfo {
  appVersion: string;
  currentLocale: string;
  platform: string;
  syncEnabled: boolean;
  syncSize?: number;
}
