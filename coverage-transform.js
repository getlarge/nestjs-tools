/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { readFileSync, writeFileSync } = require('fs');

function fixLcovFilepaths() {
  const lcovFile = path.resolve(__dirname, './coverage/lcov.info');
  const rawFile = readFileSync(lcovFile, 'utf8');
  const rebuiltPaths = rawFile
    .split('\n')
    .map((singleLine) => {
      if (singleLine.startsWith('SF:')) {
        return singleLine.replace('SF:../', `SF:${__dirname}/packages/`);
      }
      return singleLine;
    })
    .join('\n');
  writeFileSync(lcovFile, rebuiltPaths, 'utf8');
  return rebuiltPaths;
}

function fixSonarReportFilePaths() {
  const sonarReportFile = path.resolve(__dirname, './coverage/sonar-report.xml');
  const rawFile = readFileSync(sonarReportFile, 'utf8');
  const rebuiltPaths = rawFile
    .split('\n')
    .map((singleLine) => {
      if (singleLine.startsWith('<file path=')) {
        return singleLine.replace('<file path="packages/', `<file path="${__dirname}/packages/`);
      }
      return singleLine;
    })
    .join('\n');
  writeFileSync(sonarReportFile, rebuiltPaths, 'utf8');
  return rebuiltPaths;
}

(() => {
  fixLcovFilepaths();
  fixSonarReportFilePaths();
})();
