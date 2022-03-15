/* eslint-disable @typescript-eslint/no-var-requires */
const { existsSync, readFileSync, readdirSync } = require('fs');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { createContext } = require('istanbul-lib-report');
const { create: createReporter } = require('istanbul-reports');
const path = require('path');
const yargs = require('yargs');
const { name } = require('./package.json');

const COVERAGE_FOLDER = 'coverage';

async function main() {
  const argv = yargs.options({
    report: {
      type: 'array',
      desc: 'Path to json coverage report file(s)',
      default: readdirSync(path.resolve('./packages'), { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => path.resolve('./packages', dirent.name, `${COVERAGE_FOLDER}/coverage-final.json`)),
    },
    reporters: {
      type: 'array',
      default: ['json', 'lcov', 'text'],
    },
  }).argv;

  const { report: reportFiles, reporters } = argv;
  const coverageMap = createCoverageMap({});
  reportFiles.forEach((coveragePath) => {
    if (!existsSync(coveragePath)) {
      return;
    }
    let coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));
    if (process.env.CI) {
      // fix invalid file path in Github actions
      coverage = Object.keys(coverage).reduce((acc, key) => {
        const filePath = key.replace(`/home/runner/work/${name}/${name}/`, '');
        const newKey = filePath;
        coverage[key].path = filePath;
        return { ...acc, [newKey]: coverage[key] };
      }, {});
    }
    coverageMap.merge(coverage);
  });

  const context = createContext({
    dir: COVERAGE_FOLDER,
    coverageMap,
  });

  reporters.forEach((reporter) => {
    const report = createReporter(reporter);
    report.execute(context);
  });
  // eslint-disable-next-line no-console
  console.log(`Created a merged coverage report in ./${COVERAGE_FOLDER}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
