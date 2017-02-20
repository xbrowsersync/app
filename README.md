xBrowserSync is a free tool for syncing browser data between different browsers and devices, built for privacy and anonymity. For full details, see [www.xbrowsersync.org](https://www.xbrowsersync.org/).

This repository contains the source code for the client applications (browser extensions and mobile apps) that are used for syncing to an xBrowserSync service. You can get the official releases of the xBrowserSync clients from the various app stores, but if you'd like to build the apps yourself you can do so here.

# Prerequisites

- NPM. It's bundled with [Node.js](https://nodejs.org/) so [download and install it](https://nodejs.org/en/download/) for your platform.

# Installation

CD into the source directory and install the package and dependencies using NPM:

	$ sudo npm install -g cordova
	$ npm install
	$ cd ./platform/mobileapps/
	$ cordova prepare

# Building

Run a build for the desired platform:

	$ npm run build:[platform]

Replace [platform] with the name of the desired platform to build (corresponding to a folder name in the [platform](https://github.com/xBrowserSync/App/tree/master/platform/) folder). The app code will be output to the 'build' folder.

# Issues

If you've found a bug or wish to request a new feature, please submit it [here](https://github.com/xBrowserSync/App/issues/).

# Translation

If you would like to help with translating xBrowserSync into another language, please [get in touch](https://www.xbrowsersync.org/#contact).
