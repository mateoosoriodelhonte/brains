export const STORAGE_KEY = "brains.workspace";
export const SCHEMA_VERSION = 1;

export class LocalStorageGateway {
  constructor(storageProvider = () => window.localStorage) {
    // Access is deferred: even the localStorage property can throw in restricted browsers.
    this.storageProvider = storageProvider;
    this.readable = false;
  }
  load() {
    this.readable = false;
    let raw;
    try {
      raw = this.storageProvider().getItem(STORAGE_KEY);
    } catch {
      throw new Error(
        "Browser storage is unavailable. Allow local storage and reload. Saving is disabled.",
      );
    }
    if (raw === null) {
      this.readable = true;
      return null;
    }
    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      throw new Error(
        "Saved data is unreadable. It has been kept untouched. Saving is disabled; see README recovery steps.",
      );
    }
    if (
      !envelope ||
      envelope.version !== SCHEMA_VERSION ||
      !envelope.workspace
    ) {
      throw new Error(
        "Saved data uses an unsupported format. It has been kept untouched. Saving is disabled.",
      );
    }
    this.readable = true;
    return envelope.workspace;
  }
  save(records) {
    if (!this.readable)
      throw new Error(
        "Saving is disabled until stored data can be loaded safely.",
      );
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      workspace: records,
    });
    try {
      this.storageProvider().setItem(STORAGE_KEY, json);
    } catch {
      throw new Error(
        "Could not save: browser storage is full or unavailable. Your previous data is unchanged.",
      );
    }
  }
}
