# xBrowserSync
## Browser extensions / mobile app

[![Build Status](https://travis-ci.org/xbrowsersync/app.svg)](https://travis-ci.org/xbrowsersync/app) [![Dependencies](https://david-dm.org/xbrowsersync/app/status.svg)](https://david-dm.org/xbrowsersync/app) [![Dev Dependencies](https://david-dm.org/xbrowsersync/app/dev-status.svg)](https://david-dm.org/xbrowsersync/app?type=dev) [![GitHub license](https://img.shields.io/github/license/xbrowsersync/app.svg)](https://github.com/xbrowsersync/app/blob/master/LICENSE.md) [![Liberapay patrons](http://img.shields.io/liberapay/patrons/xbrowsersync.svg?logo=liberapay)](https://liberapay.com/xbrowsersync/donate)

[![GitHub forks](https://img.shields.io/github/forks/xbrowsersync/app.svg?style=social&label=Fork)](https://github.com/xbrowsersync/app/fork)
[![GitHub stars](https://img.shields.io/github/stars/xbrowsersync/app.svg?style=social&label=Star)](https://github.com/xbrowsersync/app)

xBrowserSync is a free tool for syncing browser data between different browsers and devices, built for privacy and anonymity. For full details, see [www.xbrowsersync.org](https://www.xbrowsersync.org/).

This repository contains the source code for the browser web extensions and Android mobile app used for syncing to an xBrowserSync service. You can get the official releases of the xBrowserSync clients from the various app stores, but if you’d like to build from source you can do so here.

## Prerequisites

- NPM. It’s bundled with [Node.js](https://nodejs.org/) so [download and install it](https://nodejs.org/en/download/) for your platform.

## Installation

CD into the source directory and install the package and dependencies using NPM:

	$ npm install

### Android

You must follow the Cordova Android [installation guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html) in order to develop xBrowserSync for Android. Once that's done, run the following commands in the xBrowserSync source directory:

	$ (sudo) npm install -g cordova
	$ cd ./platform/android/cordova
	$ cordova prepare

## Building

Run a build for the desired platform:

	$ npm run build:[platform]

Replace [platform] with the name of the desired platform to build (corresponding to a folder name in the [platform](https://github.com/xbrowsersync/app/tree/master/platform/) folder). The app code will be output to the 'build' folder. Available platforms:

- android
- chrome
- firefox

### Running in Chrome

Once you have built xBrowserSync for Chrome, browse to `chrome://extensions`, enable Developer mode, click "Load unpacked" and browse to `build` within the xBrowserSync source directory.

Note: We recommend creating a new Chrome profile for testing so you do not affect your actual profile data.

### Running in Firefox

Use the [web-ext](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Getting_started_with_web-ext) tool for testing xBrowserSync in Firefox. Once that is installed and you have built xBrowserSync for Firefox, CD into `build` within the xBrowserSync source directory and run the following command:

	$ web-ext run --verbose

Firefox will open using a temporary profile and the xBrowserSync extension will be installed from the built source.

## Issues

If you’ve found a bug or wish to request a new feature, please submit it [here](https://github.com/xbrowsersync/app/issues/).

## Translation

If you would like to help with translating xBrowserSync into another language, please [get in touch](https://www.xbrowsersync.org/#contact).

## Support

If you enjoy using xBrowserSync consider supporting the project via [Liberapay](https://liberapay.com/xbrowsersync/donate) or by [donating crypto](https://commerce.coinbase.com/checkout/1bd7ccd2-00ed-49d9-8f8a-b55fb5240675).
