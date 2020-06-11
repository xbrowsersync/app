const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
  // Copy gradle.properties
  const source = path.join(ctx.opts.projectRoot, 'gradle.properties');
  const destination = path.join(ctx.opts.projectRoot, 'platforms/android/app/gradle.properties');
  fs.copyFileSync(source, destination);
};