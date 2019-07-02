const child_process = require('child_process');
const path = require('path');

module.exports = function exec(command) {
  return child_process
    .execSync(command, {
      cwd: path.join(__dirname, '../../')
    })
    .toString()
    .trim();
};
