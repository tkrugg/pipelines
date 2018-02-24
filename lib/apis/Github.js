const octokit = require('@octokit/rest')()
const moment = require('moment');

class Github {
  constructor({ username, password, org, restrict_repos }) {
    octokit.authenticate({ type: 'basic', username, password })
    this.username = username;
    this.org = org;
  }

  async listMyEvents() {
    const events = await paginate(octokit.activity.getEventsForUser, ({username: this.username}), 20)
  }

  async listPRsOnRepos(repos) {
    let allPRS = [];
    for (const repo of repos) {
      try {
        console.error('Fetching to fetch PRs for repo', repo.name)
        let openPrs = await getOpenPRs(this.org, repo.name);
        openPrs = openPrs.map(pr => ({...pr, repository: repo}))
        allPRS = allPRS.concat(openPrs)
      } catch (e) {
        console.error('Failed to fetch PRs for repo', repo.name)
      }
    }
    return allPRS;

    function getOpenPRs(owner, repo) {
      if (!owner && !repo) return []
      return paginate(octokit.pullRequests.getAll, { owner, repo })
    }
  }


  async listReviewRequestsForUser() {
    const repos = await this.listRepos();
    console.log(repos)
    let openPRs = await this.listPRsOnRepos(repos.filter(r => is1monthOld(r.pushed_at)))
    return openPRs.filter(pr => {
      return hasReviewer(pr, this.username);
    });

    function hasReviewer(pr, username) {
      return pr.requested_reviewers.some(requested_reviewer => requested_reviewer.login === username)
    }

    function is1monthOld(date) {
      const now = moment();
      const _date = moment(date);
      return moment.duration(1, 'month') > (+now - +_date);
    }
  }

  listRepos() {
    return paginate(octokit.repos.getForOrg, ({ org: this.org }))
  }
}

async function paginate(method, params, limit) {
  let page = 0;
  let data = []

  let response = await method({ ...params, page: 0, per_page: 100 })
  data = data.concat(response.data);

  while (octokit.hasNextPage(response) && page <= limit) {
    page++;
    response = await octokit.getNextPage(response)
    data.push(response.data);
  }
  return data;
}

module.exports = Github;
