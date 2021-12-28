const getAndroidVersionCode = (version) => {
  const versionArr = version.split('.');
  const prodVersionArr = versionArr.slice(0, 3);
  const build = versionArr[3] ?? '0';
  return `${prodVersionArr.map((x) => x.replace(/\D/g, '')).join('')}${build.padStart(2, 0)}`;
};

module.exports = {
  getAndroidVersionCode
};
