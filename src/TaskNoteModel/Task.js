import {
  calendarDate,
  identifier,
  localDate,
  matchingTags,
  optionalText,
  requiredText,
} from "./validation.js";
import { Tag } from "./Tag.js";

export class Task {
  constructor(
    title,
    dueDate,
    description = "",
    { id, isComplete = false, tags = [] } = {},
  ) {
    this.id = identifier(id);
    this.editDetails(title, dueDate, description);
    if (typeof isComplete !== "boolean")
      throw new Error("Invalid task completion status.");
    this.isComplete = isComplete;
    this.tags = [];
    tags.forEach((tag) => this.addTag(tag));
  }

  editDetails(title, dueDate, description) {
    const validTitle = requiredText(title, "Task title");
    const validDate = calendarDate(dueDate);
    const validDescription = optionalText(description, "Description");
    this.title = validTitle;
    this.dueDate = validDate;
    this.description = validDescription;
  }
  markComplete() {
    this.isComplete = true;
  }
  markPending() {
    this.isComplete = false;
  }
  addTag(tag) {
    if (!(tag instanceof Tag)) throw new Error("Select a valid tag.");
    if (!this.tags.some((existing) => existing.id === tag.id))
      this.tags.push(tag);
  }
  matchesTags(tags) {
    return matchingTags(this.tags, tags);
  }
  isOverdue(today = localDate()) {
    return !this.isComplete && this.dueDate < calendarDate(today);
  }
  toRecord() {
    return {
      id: this.id,
      title: this.title,
      dueDate: this.dueDate,
      description: this.description,
      isComplete: this.isComplete,
      tagIds: this.tags.map((tag) => tag.id),
    };
  }
}
