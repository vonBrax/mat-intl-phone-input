'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const exec = require('./lib/exec');
const log = require('./lib/log');
const askQuestion = require('./lib/prompt');
const pkg = require('../package.json');

log('Checking current version...');

const repoVersion = pkg.version;
log('Current version: ' + repoVersion);

log('Checking latest version...');
const targetVersion = exec('npm view libphonenumber-js dist-tags.latest');

if (repoVersion === targetVersion) {
  log('Reposity is updated. Nothing to do.');
} else {
  log('Repository is outdated. Latest release is ' + targetVersion);
}

log('Checking latest releases...');

const versions = JSON.parse((exec('npm view libphonenumber-js versions')).replace(/'/g, '"'));

const index = versions.findIndex(item => item.toUpperCase() === repoVersion.toUpperCase());

if (index === -1) {
  log('Current repository version could not be found in target package releases.')
  log('Current: ' + repoVersion);
  log('Available versions: ', versions);
  process.exitCode = 1;
  throw new Error('Versioning mismatch. Aborting.');
}

const newerVersions = versions.slice(index + 1);

log(`Found ${newerVersions.length} new release${newerVersions.length <= 1 ? '' : 's'}`);

showMenu();

async function showMenu() {
  const question = '\nSelect release method and press ENTER:\n(N)ext version only\n(A)ll available versions\n(R)elease current version\n(Q)uit\n\nAnswer: ';
  const answer = await askQuestion(question);

  switch(answer.toUpperCase()) {
    case 'N':
    case 'NEXT':
      log('Ok, updating only next option');
      prepareRelease(newerVersions[0])
      break;

    case 'A':
    case 'ALL':
      log('Ok, updating all available options');
      break;

    // case 'R':
    // case 'RELEASE':
    //   log('Ok, creating a new release');
    //   createRelease(repoVersion);
    //   break;

    case 'Q':
    case 'QUIT':
      log('Shutting down');
      process.exitCode = 0;
      break;

    default:
      log('Invalid option!');
      showMenu();
  }
}

function prepareRelease(version) {
  if (Array.isArray(version)) {
    log('Wait there son. We are not ready for batch releases yet!');
  } else if (typeof version !== 'string') {
    process.exitCode = 1;
    throw new Error('Invalid argument type');
  }

  try {
    updateDependency(version);
  }
  catch(err) {
    throw err
  }

  log('Updating package.json...');
  log(exec(`npm version ${version} --no-git-tag-version`));

  log(exec('npm run gen-ext-phonemetadata'));

  const modifiedFiles = exec('git ls-files --modified').split(/\s/);

  const shouldProceed = modifiedFiles.every(item => {
    return /package(-lock)?\.json/.test(item) || /metadata\.custom\.json/.test(item);
  });

  if (!shouldProceed || modifiedFiles.length !== 3) {
    log('Modified files number or name mismatch. Aborting.');
    log(modifiedFiles);
    process.exitCode = 1;
    throw new Error('Unexpected error.');
  }

  try {
    commitAndPush();
    createRelease(version);
  } catch(err) {
    throw err;
  }
}

function updateDependency(version) {
  log('Installing version ' + version);
  log(exec(`npm install libphonenumber-js@${version}`));
  // pkg.version = version;
  // fs.writeFileSync('../package.json', `${JSON.stringify(pkg, null, 2)}\n`);
}

function commitAndPush() {
  log(exec('git add package.json package-lock.json metadata.custom.json'));
  log(exec('git commit -m "chore(deps): update libphonenumber and phone metadata"'));
  log(exec('git push'));
}

async function createRelease(version) {
  const body = {
    tag_name: `v${version}`,
    target_commitish: 'master',
    name: `v${version}`
  };

  const token = fs
    .readFileSync(path.join(__dirname, '../../../credentials/.git'), 'utf-8')
    .replace(/\r?\n|\r/g, '');

  const options = {
    hostname: 'api.github.com',
    path: '/repos/vonbrax/mat-intl-phone-input/releases',
    method: 'POST',
    headers: {
      Authorization: 'token ' + token,
      'User-Agent': 'vonbrax',
      'Content-Type': 'application/json'
    }
  };

  log('Request options: ');
  log(options);
  log('Request body:');
  log(body);

  const req = https.request(options, res => {
    log(`STATUS: ${res.statusCode}`);
    log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', chunk => log(`BODY: ${chunk}`));
    res.on('end', () => log('No more data in response.'));
  });

  req.on('error', err => log(`problem with request: ${err.message}`));

  req.write(JSON.stringify(body));
  req.end();
}
