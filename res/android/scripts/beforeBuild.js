const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
  const source = path.join(ctx.opts.projectRoot, 'build-extras.gradle');
  const destination = path.join(ctx.opts.projectRoot, 'platforms/android/app/build-extras.gradle');
  fs.copyFileSync(source, destination);
};