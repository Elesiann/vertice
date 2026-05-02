export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "chore", "test", "refactor", "style", "build", "ci"],
    ],
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
