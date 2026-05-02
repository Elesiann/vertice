export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "chore", "test", "refactor", "style", "build", "ci", "perf"],
    ],
    // Disabled deliberately:
    //   subject-case: our subjects mix lowercase verbs with PascalCase
    //   identifiers ("Parser", "ADR-0007") and acronyms; lower-case would
    //   reject legitimate references.
    //   body-max-line-length: commit bodies include verbatim error
    //   snippets, regex examples, and JSON shapes that don't reflow.
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
