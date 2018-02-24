const GithubTodoist = require('./lib/pipelines/github-todoist');

async function main() {
  await GithubTodoist.run()
}

main();
