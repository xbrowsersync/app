const Path = require('path');
const WebExtConfig = require('./webext.config');

module.exports = (env, argv) => {
  const webExtConfig = WebExtConfig(env, argv);

  // Transform manifest to Manifest V3 and add Firefox browser_specific_settings
  const copyPlugin = webExtConfig.plugins.find((p) => p.constructor.name === 'CopyPlugin');
  const manifestPattern = copyPlugin.patterns.find((p) => p.from.indexOf('manifest.json') > -1);
  const webExtTransform = manifestPattern.transform;
  manifestPattern.transform = (buffer) => {
    const webExtTransformResult = webExtTransform(buffer);
    const manifest = JSON.parse(webExtTransformResult);

    // Upgrade to Manifest V3
    manifest.manifest_version = 3;

    // browser_action -> action
    manifest.action = manifest.browser_action;
    delete manifest.browser_action;

    // background page -> scripts (Firefox MV3 uses background.scripts, not service_worker)
    manifest.background = {
      scripts: ['assets/background.js']
    };

    // content_security_policy string -> object
    manifest.content_security_policy = {
      extension_pages: manifest.content_security_policy
    };

    // Split optional_permissions: host patterns go to optional_host_permissions (MV3)
    if (manifest.optional_permissions) {
      const hostPatterns = manifest.optional_permissions.filter((p) => /^https?:/.test(p));
      const nonHostPerms = manifest.optional_permissions.filter((p) => !/^https?:/.test(p));
      manifest.optional_host_permissions = hostPatterns;
      if (nonHostPerms.length > 0) {
        manifest.optional_permissions = nonHostPerms;
      } else {
        delete manifest.optional_permissions;
      }
    }

    // Add scripting permission (MV3 replacement for tabs.executeScript)
    if (!manifest.permissions.includes('scripting')) {
      manifest.permissions.push('scripting');
    }

    // _execute_browser_action -> _execute_action
    if (manifest.commands && manifest.commands._execute_browser_action) {
      manifest.commands._execute_action = manifest.commands._execute_browser_action;
      delete manifest.commands._execute_browser_action;
    }

    // Firefox-specific settings
    manifest.browser_specific_settings = {
      gecko: {
        id: '{019b606a-6f61-4d01-af2a-cea528f606da}',
        strict_min_version: '109.0',
        update_url: 'https://xbrowsersync.github.io/app/firefox-versions.json'
      }
    };

    return JSON.stringify(manifest, null, 2);
  };

  // Remove background.html copy for Firefox (MV3 uses background scripts)
  const bgHtmlIdx = copyPlugin.patterns.findIndex((p) => p.from && p.from.indexOf('background.html') > -1);
  if (bgHtmlIdx > -1) {
    copyPlugin.patterns.splice(bgHtmlIdx, 1);
  }

  const outputPath = Path.resolve(__dirname, '../build/firefox/assets');

  // App config: UI entry point with real AngularJS
  const appConfig = {
    ...webExtConfig,
    name: 'firefox-app',
    entry: {
      ...webExtConfig.entry,
      app: './src/modules/webext/firefox/firefox-app/firefox-app.module.ts'
    },
    output: {
      ...webExtConfig.output,
      path: outputPath,
      clean: false
    }
  };

  // Background config: service worker entry point with angular shims (no DOM)
  const backgroundConfig = {
    ...webExtConfig,
    name: 'firefox-background',
    entry: {
      background: './src/modules/webext/firefox/firefox-background/firefox-background.module.ts'
    },
    output: {
      ...webExtConfig.output,
      path: outputPath,
      clean: false
    },
    plugins: webExtConfig.plugins.filter((p) => p.constructor.name !== 'CopyPlugin'),
    resolve: {
      ...webExtConfig.resolve,
      alias: {
        ...(webExtConfig.resolve && webExtConfig.resolve.alias),
        angular$: Path.resolve(__dirname, '../src/modules/webext/webext-background/angular-module-shim.ts'),
        'angular-ts-decorators$': Path.resolve(
          __dirname,
          '../src/modules/webext/webext-background/angular-ts-decorators-shim.ts'
        )
      }
    },
    optimization: {
      ...(webExtConfig.optimization || {}),
      splitChunks: false
    }
  };

  return [appConfig, backgroundConfig];
};
