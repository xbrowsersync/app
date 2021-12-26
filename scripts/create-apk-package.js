const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = fs.readFileSync(path.resolve(__dirname, '../PACKAGE_VERSION'), 'utf8');
const pathToApk = path.resolve(
  __dirname,
  '../build/android/platforms/android/app/build/outputs/apk/release/app-release.apk'
);
const outputDir = path.resolve(__dirname, '../dist');
const outputFilePath = `${outputDir}/xbrowsersync_${version}_android.apk`;
const pathToKeyStore = path.resolve(__dirname, '../build/android/xbrowsersync.keystore');
const signingAlias = process.env.SIGNING_ALIAS;
const signingPassword = process.env.SIGNING_PASSWORD;
const signingStorePassword = process.env.SIGNING_STORE_PASSWORD;

if (!signingAlias || !signingPassword || !signingStorePassword) {
  throw new Error('Signing values incomplete');
}

if (fs.existsSync(pathToApk)) {
  fs.unlinkSync(pathToApk);
}
if (fs.existsSync(outputFilePath)) {
  fs.unlinkSync(outputFilePath);
}

const runCommand = (command, cwd, callback) => {
  const options = { shell: true };
  if (cwd) {
    options.cwd = cwd;
  }
  exec(command, options, (error, stdout, stderr) => {
    if (error) {
      if (stderr) {
        console.log(stderr);
      }

      throw error;
    }
    if (stderr) {
      console.log(stderr);
    }

    callback(stdout);
  });
};

runCommand(
  `cordova build android --release -- --keystore=${pathToKeyStore} --storePassword=${signingStorePassword} --alias=${signingAlias} --password=${signingPassword}`,
  './build/android',
  () => {
    console.log('Build complete');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    fs.copyFileSync(pathToApk, outputFilePath);
  }
);
