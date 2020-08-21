const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = fs.readFileSync(path.resolve(__dirname, '../version.txt'), 'utf8');
const pathToApk = path.resolve(
  __dirname,
  '../build/android/platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk'
);
const outputDir = path.resolve(__dirname, '../dist');
const alignedFilePath = `${outputDir}/xbrowsersync_${version}_android.apk`;
const signedFilePath = `${outputDir}/xbrowsersync_${version}_android_signed.apk`;
const unsignedFilePath = `${outputDir}/xbrowsersync_${version}_android_unsigned.apk`;
const pathToKeyStore = path.resolve(__dirname, '../build/android/xbs_release_test.keystore');
const signingAlias = 'xbs_release_test';
const signingPassword = 'xbs_release_test';

if (fs.existsSync(pathToApk)) {
  fs.unlinkSync(pathToApk);
}
if (fs.existsSync(alignedFilePath)) {
  fs.unlinkSync(alignedFilePath);
}
if (fs.existsSync(signedFilePath)) {
  fs.unlinkSync(signedFilePath);
}
if (fs.existsSync(unsignedFilePath)) {
  fs.unlinkSync(unsignedFilePath);
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

runCommand('cordova build android --release', './build/android', () => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  if (fs.existsSync(pathToApk)) {
    fs.copyFileSync(pathToApk, signedFilePath);
    fs.copyFileSync(pathToApk, unsignedFilePath);

    runCommand(
      `jarsigner -verbose -keystore ${pathToKeyStore} -storepass ${signingPassword} ${signedFilePath} ${signingAlias}`,
      `${process.env.JAVA_HOME}/bin`,
      () => {
        runCommand(`zipalign -v 4 ${signedFilePath} ${alignedFilePath}`, null, () => {
          fs.unlinkSync(signedFilePath);
        });
      }
    );
  }
});
