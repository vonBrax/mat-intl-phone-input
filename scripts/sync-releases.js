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
  const question = '\nSelect release method and press ENTER:\n(N)ext version only\n(A)ll available versions\n(Q)uit\n\nAnswer: ';
  const answer = await askQuestion(question);
  const delay = 1000;

  switch(answer.toUpperCase()) {
    case 'N':
    case 'NEXT':
      log('\nStarting update to NEXT release...\n');
      await prepareRelease(newerVersions[0])
      break;

    case 'A':
    case 'ALL':
      log('\n Starting update of ALL available releases...\n');
      const testCase = newerVersions.slice(0, 2);
      log(testCase.length);
      log(testCase);
      for (const version of testCase) {
        log('Preparing release for version ' + version);
        const lastResponse = await prepareRelease(version);
        log('\n' + version + ' is released!')
        if (Date.now() - lastResponse < delay) {
          log('Sleeping to not exceed api limit...');
          const sleep = new Promise(resolve => {
            setTimeout(() => resolve(), delay);
          });
          await sleep;
          log('Wait time is done, moving on!');
        }
      }
      break;

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

async function prepareRelease(version) {
  if (typeof version !== 'string') {
    process.exitCode = 1;
    throw new Error('Invalid argument type');
  }

  try {
    checkGitStatus();
    updateDependency(version);
    updatePackageFile(version);
    generateMetadataFile();
    checkFilesToCommit(exec('git ls-files --modified').split(/\s/));
    commitAndPush();
    const lastResponse = await createRelease(version);
    return lastResponse;
  }
  catch(err) {
    process.exitCode = 1;
    // throw err
    throw new Error(err.message);
  }
}

function checkGitStatus() {
  const hasChanges = exec('git status --porcelain');

  if (hasChanges) {
    log('Git directory is not clean. Aborting.');
    log('\n' + hasChanges + '\n');
    process.exitCode = 1;
    throw new Error('Directory has uncommited or untracked changes.');
  }
  
}

function updateDependency(version) {
  log('Installing libphonenumber-js@' + version);
  log(exec(`npm install libphonenumber-js@${version}`));
}

function updatePackageFile(version) {
  log('\nUpdating package.json...');
  log(exec(`npm version ${version} --no-git-tag-version`));
}

function generateMetadataFile() {
  log('\nGenerating new phone metadata');
  log(exec('npm run gen-ext-phonemetadata'));
}

function checkFilesToCommit(files) {
  const shouldProceed = files.every(item => {
    return /package(-lock)?\.json/.test(item) || /metadata\.custom\.json/.test(item);
  });

  if (!shouldProceed || files.length !== 3) {
    log('Modified files number or name mismatch. Aborting.');
    log(files);
    process.exitCode = 1;
    throw new Error('Unexpected error.');
  }
}

function commitAndPush() {
  log('\nCommitting and pushing files');
  log(exec('git add package.json package-lock.json metadata.custom.json'));
  log(exec('git commit -m "chore(deps): update libphonenumber and phone metadata"'));
  log(exec('git push'));
}

function createRelease(version) {
  log('\nRequesting release for ' + version);
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

  // log('Request options: ');
  // log(options);
  // log('Request body:');
  // log(body);

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      res.setEncoding('utf8');
      log(`GIT API RESPONSE STATUS: ${res.statusCode}`);
      res.on('end', () => resolve(Date.now()));
      // log(`HEADERS: ${JSON.stringify(res.headers)}`);
      // res.on('data', chunk => log(`BODY: ${chunk}`));
    });
  
    req.on('error', err => reject(err));
    req.write(JSON.stringify(body));
    req.end();
  });
}
