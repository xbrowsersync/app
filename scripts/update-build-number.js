const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { getAndroidVersionCode } = require('./android-utils');

const platform = process.argv[2] ?? 'chromium';
const buildNum = process.argv[3] ?? process.env.GITHUB_RUN_NUMBER ?? 0;
const isBetaRelease = JSON.parse(process.env.BETA ?? 'false');

const versionNum = `${process.env.npm_package_version}.${buildNum}`;
const versionName = isBetaRelease
  ? `${process.env.npm_package_version}-beta.${buildNum}`
  : process.env.npm_package_version;
const versionFileName = path.resolve(__dirname, '../PACKAGE_VERSION');
fs.writeFileSync(versionFileName, `${isBetaRelease ? versionName : versionNum}`);

const updateBuildNumberForWebext = (platformName) => {
  const fileName = path.resolve(__dirname, `../build/${platformName}/manifest.json`);
  const file = require(fileName);
  file.version = versionNum;
  file.version_name = `v${versionName}`;
  fs.writeFileSync(fileName, JSON.stringify(file, null, 2));
};

const updateBuildNumberForAndroid = () => {
  const filePath = path.resolve(__dirname, '../build/android/config.xml');
  const parser = new xml2js.Parser();
  const builder = new xml2js.Builder();

  const data = fs.readFileSync(filePath);
  parser.parseString(data, (err, result) => {
    result.widget.$.version = `v${versionName}`;
    result.widget.$['android-versionCode'] = getAndroidVersionCode(versionNum);
    const xml = builder.buildObject(result);
    fs.writeFileSync(filePath, xml);
  });
};

switch (platform) {
  case 'chromium':
  case 'firefox':
    updateBuildNumberForWebext(platform);
    break;
  case 'android':
    updateBuildNumberForAndroid();
    break;
  default:
}
