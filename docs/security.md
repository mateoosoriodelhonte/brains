# Input handling and injection boundaries

## SQL injection in the current MVP

Brains has no SQL database, database driver, query language, or remote application service. `LocalStorageGateway` serializes plain records with `JSON.stringify`, writes one localStorage key, and loads with `JSON.parse`. LearnerWorkspace reconstructs validated domain objects. No user input is interpreted as a query or executable code.

An input such as `'); DROP TABLE tasks; --` is ordinary text in this architecture. It does not delete tasks. Apostrophes and SQL keywords are allowed in student notes; a blacklist of SQL words would reject legitimate coursework without providing a useful defense.

The regression tests in `tests/security.test.js` cover SQL-looking task/note/tag text across actual JSON storage and reload, preserving existing records. They also check that query-looking IDs cannot select a different record, mutate state, or cause a write when validation fails. These are boundary checks for this localStorage app, not a claim that a hypothetical future SQL backend was tested.

## Browser injection

HTML/script injection is relevant to a browser app. `BrainsScreens` escapes dynamic user values before inserting generated HTML, or assigns text through `textContent` and form values. Notes are plain text rather than executable HTML. The browser injection regression in `tests/browser/flows.spec.js` covers task titles, reusable tags, note titles/course/content, reload, and the note editor with SQL-looking strings and hostile markup. It verifies that payload elements are not created and existing records remain available.

Run the checks:

```sh
npm test
npx playwright test tests/browser/flows.spec.js -g injection
```

Keep using escaped text when adding display fields. Do not introduce `eval`, executable templates built from user input, or raw user HTML rendering.

## If storage architecture changes later

Adding a SQL backend is outside the current MVP scope. If the team later approves one, use parameterized queries/prepared statements, bind data values separately from query structure, use fixed application-owned choices for structural SQL such as column names, and grant only necessary database permissions. HTML escaping is not a SQL defense. See the [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).

## Limits

This review and regression coverage are not a comprehensive penetration test. Browser localStorage is not encrypted, and a person or extension with access to this browser profile may read or change its data. Use one app tab at a time and keep personal workspace backups outside Git. `.gitignore` is a version-control guard, not a storage access-control mechanism.
