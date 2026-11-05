import { identifier, requiredText } from "./validation.js";

export class Tag {
  constructor(name, id) {
    this.id = identifier(id);
    this.name = requiredText(name, "Tag name", 40);
  }

  getName() {
    return this.name;
  }
  get normalizedName() {
    return this.name.toLocaleLowerCase("en-US");
  }
  toRecord() {
    return { id: this.id, name: this.name };
  }
}
