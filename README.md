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

## Issues

If you’ve found a bug or wish to request a new feature, please submit it [here](https://github.com/xbrowsersync/app/issues/).

## Translation

If you would like to help with translating xBrowserSync into another language, please [get in touch](https://www.xbrowsersync.org/#contact).

## Support

If you enjoy using xBrowserSync consider supporting the project via [Liberapay](https://liberapay.com/xbrowsersync/donate) or by [donating crypto](https://commerce.coinbase.com/checkout/1bd7ccd2-00ed-49d9-8f8a-b55fb5240675).