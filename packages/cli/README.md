# thehivecode

Write and check a [HIVE.md](https://thehivecode.ai/learn/hive-md?ref=github), the short file that makes a repository hive-ready.

Hive coding is software built by communities and shipped by agents. The definition lives at [The Hive Code](https://thehivecode.ai/learn/what-is-hive-coding?ref=github). This package does not post to the platform and it does not run an agent. It writes a text file and checks the header against the published limits.

```bash
npx thehivecode init
npx thehivecode check
```

Until the package is on npm, run it from a checkout of [thehivecode-ai/hive-coding](https://github.com/thehivecode-ai/hive-coding):

```bash
node packages/cli/bin/thehivecode.js init
node packages/cli/bin/thehivecode.js check
```

## Commands

`init` asks for the project name, a one-line tagline, who it is for, the problem, the help you want, the commands to run it, and an optional Vercel or Netlify deploy target. Press enter to take the default shown in brackets. Defaults come from the folder name and, when it fits, from `package.json`.

```bash
npx thehivecode init --yes
npx thehivecode init --yes --force
npx thehivecode init --tagline "A sign-up sheet for Saturday runs" --for "A running club" --problem "Sign-up lives in a chat thread and people miss the run"
```

`--yes` will not replace an existing `HIVE.md` unless you also pass `--force`.

`check` prints a hive-ready score from 0 to 100.

```text
HIVE.md
hive-ready: yes
score: 100/100
```

The file is hive-ready when the header parses and every field you set is inside the limits. The score counts recommended fields. `deploy` is optional and is not part of the score. Exit status is 0 when the file is hive-ready, and 1 when it is not. `--strict` also fails when the score is under 100.

`check` never runs the commands in the file. The Hive Code does not either. A HIVE.md is a description, not instructions for an agent.

## Fields

| Field | Limit |
| --- | --- |
| `tagline` | 10 to 120 characters |
| `for` | 3 to 80 characters |
| `problem` | 10 to 200 characters |
| `help_wanted` | up to 200 characters |
| `run` | up to 20 lines |
| `deploy` | `vercel`, `netlify`, or both |

Lengths are Unicode code points, and the minimums and maximums are inclusive. These are the limits from the [HIVE.md guide](https://thehivecode.ai/learn/hive-md?ref=github). The guide also says every field is optional. An empty header can be hive-ready with a low score. Fill the fields in if you want the file to be useful.

## Development

Node.js 18 or newer. There are no runtime dependencies.

```bash
npm test
```

Publishing is described in [PUBLISHING.md](../../PUBLISHING.md) at the root of the repository. Do not publish from a fork.

[MIT](LICENSE) · [The Hive Code](https://thehivecode.ai/?ref=github)
