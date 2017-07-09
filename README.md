# xBrowserSync: App [![Build Status](https://travis-ci.org/xBrowserSync/App.svg?branch=master)](https://travis-ci.org/xBrowserSync/App)

xBrowserSync is a free tool for syncing browser data between different browsers and devices, built for privacy and anonymity. For full details, see [www.xbrowsersync.org](https://www.xbrowsersync.org/).

This repository contains the source code for the client applications (browser extensions and mobile apps) that are used for syncing to an xBrowserSync service. You can get the official releases of the xBrowserSync clients from the various app stores, but if you'd like to build the apps yourself you can do so here.

# Prerequisites

- NPM. It's bundled with [Node.js](https://nodejs.org/) so [download and install it](https://nodejs.org/en/download/) for your platform.

# Installation

CD into the source directory and install the package and dependencies using NPM:

	$ npm install
	$ (sudo) npm install -g cordova
	$ cd ./platform/mobileapps/cordova
	$ cordova prepare

# Post-install iOS configuration (Mac only)

In order to build the iOS app to include iCloud and Share Sheet integration, there are a few manual config steps in Xcode that need to be completed.

1. Run Xcode and open the xBrowserSync project file in `platform/mobileapps/cordova/platforms/ios/`.
2. In xBrowserSync target Capabilities tab, enable iCloud, disable the Key-value storage option and enable iCloud Documents option. The container should resolve automatically using your provisioning profile (see [FilePicker Phonegap iOS Plugin](https://github.com/jcesarmobile/FilePicker-Phonegap-iOS-Plugin) for more information). 
3. Create a new target, select Share Extension then set the Product Name to 'addBookmark' and click Finish.
4. Set the Target Membership of Resouces/Images.xcassets to include addBookmark.
5. In addBookmark target Info tab, set Bundle display name to 'Add Bookmark'.
6. In addBookmark target Build Settings tab, in the Asset Catalog Compiler – Options section, set Asset Catalog App Icon Set Name to 'AppIcon' (the target's icon should now appear as the xBrowserSync icon).
7. In addBookmark target Build Phases tab, expand Target Dependencies and add CordovaLib.

# Building

Run a build for the desired platform:

	$ npm run build:[platform]

Replace [platform] with the name of the desired platform to build (corresponding to a folder name in the [platform](https://github.com/xBrowserSync/App/tree/master/platform/) folder). The app code will be output to the 'build' folder. Available platforms:

- android
- chrome
- ios

# Issues

If you've found a bug or wish to request a new feature, please submit it [here](https://github.com/xBrowserSync/App/issues/).

# Translation

If you would like to help with translating xBrowserSync into another language, please [get in touch](https://www.xbrowsersync.org/#contact).
