import { Task } from "./Task.js";

export class TaskList {
  constructor(tasks = []) {
    this.tasks = [...tasks];
  }
  addTask(title, dueDate, description = "", options = {}) {
    const task = new Task(title, dueDate, description, options);
    this.tasks.push(task);
    return task;
  }
  findTask(task) {
    const found = this.tasks.find(
      (item) => item.id === (typeof task === "string" ? task : task.id),
    );
    if (!found) throw new Error("This task could not be found.");
    return found;
  }
  completeTask(task, isComplete = true) {
    const found = this.findTask(task);
    if (isComplete) found.markComplete();
    else found.markPending();
    return found;
  }
  // Modern JS sort is stable: equal dates retain their saved insertion order.
  getTasksByDueDate() {
    return [...this.tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
  filterByTag(tags) {
    return this.getTasksByDueDate().filter((task) => task.matchesTags(tags));
  }
}
