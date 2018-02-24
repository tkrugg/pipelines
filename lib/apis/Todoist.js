const TodoistAPI= require('todoist-js').default;


class Todoist {
  constructor({ token }) {
    this.api = new TodoistAPI(token)
  }

  async getProject(name) {
    const response = await this.api.sync();
    return response.projects.find(project => project.name === name)
  }

  async listItemsInProject(projectId) {
    const response =  await this.api.projects.get_data(projectId)
    return response.items
  }
}

module.exports = Todoist;
