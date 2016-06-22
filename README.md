![xBrowserSync](https://raw.githubusercontent.com/xBrowserSync/xbrowsersync.github.io/master/images/logo_150.png "xBrowserSync")

[xBrowserSync](http://xbrowsersync.org/) is a tool for syncing your bookmarks and other browser information to a secure and anonymous cloud service. For full details, see http://xbrowsersync.org.

This repository contains the source code for the client applications (browser extensions and apps) that are used for syncing to an xBrowserSync service. You can get the official releases of the xBrowserSync clients from the various app stores, but if you'd like to build the apps yourself you can do so here.

# Prerequisites

- NPM. It's bundled with [Node.js](https://nodejs.org/) so [download and install it](https://nodejs.org/en/download/) for your platform.

# Installation

CD into the source directory and install the package and dependencies using NPM:

	$ npm install

# Building

Run a build for the desired platform:

	$ npm run build:[platform]

Replace [platform] with the name of the desired platform to build (corresponding to a folder name in the [platform](https://github.com/xBrowserSync/App/tree/master/platform/) folder). The app code will be output to the 'build' folder.

# Bugs

If you find a bug in the course of using any of the client apps, please report it [here](https://github.com/xBrowserSync/App/issues/).

# Translation

If you would like to help with translating xBrowserSync into another language, please [get in touch](http://xbrowsersync.org/contact/).