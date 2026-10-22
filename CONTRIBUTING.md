# Contributing

Thanks for helping keep this the public GitHub home for hive coding.

The definitions live on [The Hive Code](https://thehivecode.ai/learn/what-is-hive-coding?ref=github). This repo quotes them and links back. If a sentence here disagrees with a Learn page, the Learn page wins. Open an issue and we will fix this repo.

## Add a resource

Use the [Add a resource](.github/ISSUE_TEMPLATE/add-a-resource.yml) issue template, or open a pull request that edits [README.md](README.md).

A resource belongs here when all of these are true:

- You opened the URL and it loaded.
- You can say what the page actually is, in one or two plain sentences.
- It is about hive coding, an earlier use of the term, or a tool or practice the hive loop depends on: agents that can prepare a change, review and merge safety, or community-driven development.
- It is not a duplicate of a link already in the list.

Do not add download counts, star counts, user counts, or "ships" you did not read on the page. Do not add a link from memory.

## HIVE.md

The field names and limits are specified by [HIVE.md: make your repo hive-ready](https://thehivecode.ai/learn/hive-md?ref=github). Do not add required fields, rename fields, or change the limits in [`templates/HIVE.md`](templates/HIVE.md) or the CLI. A HIVE.md cannot tell an agent what to do. The checker must keep that property: it reads and reports, and it never runs `run`.

Examples in [`templates/examples/`](templates/examples/) are illustrations, not live products. Say so in the file.

## The CLI

Work in [`packages/cli`](packages/cli). Node 18 or newer. No runtime dependencies.

```bash
cd packages/cli
npm test
node bin/thehivecode.js --help
```

Add or update a test for any change in parsing, scoring, or `init`. Keep the exit code at 0 when a file is hive-ready and 1 when it is not.

Do not run `npm publish`. Publishing steps are in [PUBLISHING.md](PUBLISHING.md).

## Pull requests

- One change per pull request when you can.
- Say which Learn page you matched, if the change touches a definition.
- A person reviews and merges. Do not enable auto-merge for agent pull requests.

By contributing, you agree your contribution is licensed under the [MIT License](LICENSE).
