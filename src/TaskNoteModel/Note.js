import { identifier, matchingTags, requiredText } from "./validation.js";
import { Tag } from "./Tag.js";

export class Note {
  constructor(
    title,
    courseName,
    content,
    { id, tags = [], lastEdited = new Date().toISOString() } = {},
  ) {
    this.id = identifier(id);
    this.title = requiredText(title, "Note title");
    this.courseName = requiredText(courseName, "Course or lecture");
    this.content = requiredText(content, "Note content", 100000);
    if (
      typeof lastEdited !== "string" ||
      !Number.isFinite(Date.parse(lastEdited))
    )
      throw new Error("Invalid note edit date.");
    this.lastEdited = lastEdited;
    this.tags = [];
    tags.forEach((tag) => this.addTag(tag));
  }
  editContent(newContent, now = new Date().toISOString()) {
    const content = requiredText(newContent, "Note content", 100000);
    if (!Number.isFinite(Date.parse(now)))
      throw new Error("Invalid note edit date.");
    this.content = content;
    this.lastEdited = now;
  }
  edit(title, courseName, content, now) {
    const validTitle = requiredText(title, "Note title");
    const validCourse = requiredText(courseName, "Course or lecture");
    this.editContent(content, now);
    this.title = validTitle;
    this.courseName = validCourse;
  }
  addTag(tag) {
    if (!(tag instanceof Tag)) throw new Error("Select a valid tag.");
    if (!this.tags.some((existing) => existing.id === tag.id))
      this.tags.push(tag);
  }
  matchesTags(tags) {
    return matchingTags(this.tags, tags);
  }
  toRecord() {
    return {
      id: this.id,
      title: this.title,
      courseName: this.courseName,
      content: this.content,
      lastEdited: this.lastEdited,
      tagIds: this.tags.map((tag) => tag.id),
    };
  }
}
