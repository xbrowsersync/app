/**
 * Firefox background entry point for MV3 background scripts.
 * Replaces the AngularJS bootstrap with a manual DI container.
 */

import browser from 'webextension-polyfill';
import { WebExtV160UpgradeProviderService } from '../../shared/webext-upgrade/webext-v1.6.0-upgrade-provider.service';
import { setupAngularShim } from '../../webext-background/angular-shims';
import { createBackgroundContainer } from '../../webext-background/background-container';
import { FirefoxBookmarkService } from '../shared/firefox-bookmark/firefox-bookmark.service';
import { FirefoxPlatformService } from '../shared/firefox-platform/firefox-platform.service';

// Set up angular shim before any service code runs
setupAngularShim();

// Mark this as the background context
// eslint-disable-next-line no-undef, no-restricted-globals
(self as any).__xbs_isBackground = true;

// Create the DI container with Firefox-specific services
const { backgroundSvc } = createBackgroundContainer({
  BookmarkServiceClass: FirefoxBookmarkService,
  PlatformServiceClass: FirefoxPlatformService,
  UpgradeProviderServiceClass: WebExtV160UpgradeProviderService
});

// Register event handlers synchronously (required for MV3 background scripts)
let startupInitiated = false;

browser.runtime.onInstalled.addListener((details) => {
  if (startupInitiated) return;
  startupInitiated = true;
  backgroundSvc.onInstall(details.reason);
});

browser.runtime.onStartup.addListener(() => {
  if (startupInitiated) return;
  startupInitiated = true;
  backgroundSvc.init();
});
