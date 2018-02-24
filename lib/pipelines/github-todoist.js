const Github = require('../apis/Github');
const Todoist = require('../apis/Todoist');
const { groupBy } = require('lodash');


module.exports = class Pipeline {
  static async run() {
    const github = new Github({
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD,
      org: 'alkemics',
    });

    const todoist = new Todoist({ token: process.env.TODOIST_API_TOKEN })

    function makeSummary(prs, todos) {
      const summary = { add_prs: [], remove_todos: [], double_todos: [] }

      for (const pr of prs) {
        const found = todos.find(todo => todo.__pr_number__ === pr.number)
        if (!found) {
          summary.add_prs.push(pr);
        }
      }
      for (const todo of todos) {
        const found = prs.find(pr => pr.number === todo.__pr_number__)
        if (!found) {
          summary.remove_todos.push(todo);
        }
      }

      const groupped = groupBy(todos, todo => todo.__pr_number__)
      for (const group of Object.values(groupped)) {
        if (group.length > 1) {
          summary.double_todos.push(...group.slice(1))
        }
      }

      return summary;
    }

    try {
      function findPRTodos(todos) {
        const regexp = /^\[.* #(\d+)\].*/;
        return todos.map(todo => ({
          ...todo,
          __pr_number__: regexp.test(todo.content) ? +todo.content.replace(regexp, '$1') : null
        }));
      }

      // open pr with review requests
      const prs = await github.listReviewRequestsForUser()
      // all todos in project
      const project = await todoist.getProject('Github Issues')
      let todos = await todoist.listItemsInProject(project.id)
      todos = findPRTodos(todos);

      const summary = makeSummary(prs, todos);

      // add missing todos
      for (const pr of summary.add_prs) {
        const content = `[**${pr.repository.name}** #${pr.number}](${pr.html_url}/files) | @${pr.user.login} asked for a review`
        todoist.api.items.add(content, project.id)
      }

      // remove finished
      for (const todo of summary.remove_todos) {
        const item = await todoist.api.items.get_by_id(todo.id);
        item.close();
      }

      // remove doubles
      for (const todo of summary.double_todos) {
        const item = await todoist.api.items.get_by_id(todo.id);
        item.close();
      }

      todoist.api.commit();
    } catch (e) {
      console.error(e)
    }
  }
}

