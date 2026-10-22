# Publishing `thehivecode`

The command people should be able to run is `npx thehivecode`. The package is in [`packages/cli`](packages/cli). A separate placeholder in [`packages/pypi`](packages/pypi) exists so the same name can be registered on PyPI. Neither package has been published. Do not publish from a fork, and do not publish until you intend to own the name.

Checked on 22 October 2026:

- `https://registry.npmjs.org/thehivecode` returned 404.
- `https://pypi.org/pypi/thehivecode/json` returned 404.

Check again before you publish. Someone else can claim either name in between. On PyPI, yanking a release does not free the name. On npm, unpublishing is time-limited and a name you have published can stay reserved. Treat both uploads as permanent.

The copyright line in [LICENSE](LICENSE) says "The Hive Code". Confirm that is the legal name you want on a public package before the first upload.

## npm

You need an npm account that is allowed to create the unscoped package `thehivecode`, and Node.js 18 or newer. The package is intentionally unscoped so that `npx thehivecode` works. A scoped name such as `@thehivecode/cli` would not.

From a checkout of this repository, on the commit you want to publish:

```bash
cd packages/cli
npm whoami
npm test
npm publish --dry-run
npm publish
```

`npm publish --dry-run` prints the file list and does not upload. The tarball should contain `bin/`, `src/`, `package.json`, `README.md`, and `LICENSE`. It should not contain `test/`.

The version that uploads is the `version` field in [`packages/cli/package.json`](packages/cli/package.json). This repo starts at `0.1.0`. To ship a later change, bump that version, then publish again. npm will not let you overwrite a version that already exists.

After it succeeds:

```bash
npm view thehivecode version
npx --yes thehivecode@0.1.0 --version
```

`npx thehivecode init` writes a file in the current directory. Run that check in an empty folder, not in this repo, unless you pass `--file` to a throwaway path.

### If npm asks you to log in or for a second factor

```bash
npm login
npm whoami
```

Then run `npm publish` again. If the account has two-factor authentication required for writes, approve the prompt. Do not put a token in this repo or in the command history of a shared machine. For CI, prefer an [npm granular access token](https://docs.npmjs.com/creating-and-viewing-access-tokens) stored as a secret, or a trusted publisher, over a token pasted into a shell.

### Provenance, optional

To attach a provenance statement from GitHub Actions, publish from a workflow on `github.com/thehivecode-ai/hive-coding` with npm's trusted publishing, or with:

```bash
npm publish --provenance
```

That flag only works in the CI environments npm supports. A laptop publish without `--provenance` is still a normal publish. Do this after the first manual publish has succeeded and you have confirmed the package page looks right.

## PyPI

The Python package is a placeholder. Installing it does not give you the CLI. It prints a pointer to this repo and to the HIVE.md guide, so the name `thehivecode` is not sitting there empty of context. The CLI remains the npm package.

You need a [PyPI account](https://pypi.org/account/register/) and an API token.

The first upload of a new project cannot use a project-scoped token, because the project does not exist yet. Create an account-scoped token at [pypi.org/manage/account](https://pypi.org/manage/account/). After the project exists, create a project-scoped token and revoke the wider one if you do not need it.

Build and check from this repo:

```bash
cd packages/pypi
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade build twine
python -m build
twine check dist/*
```

`twine check` should report that the long description renders. Then upload to TestPyPI if you want a dress rehearsal. TestPyPI is a different account and a different token from PyPI.

```bash
twine upload --repository testpypi dist/*
```

When the TestPyPI page looks right, upload to PyPI:

```bash
twine upload dist/*
```

`twine` asks for a username and password. The username is `__token__`. The password is the token, including the `pypi-` prefix. You can also set `TWINE_USERNAME` and `TWINE_PASSWORD` in the environment for that one shell. Do not commit them.

Confirm:

```bash
pip install --index-url https://pypi.org/simple thehivecode
thehivecode
python -m thehivecode
```

You should see a short note that this PyPI package is a name placeholder and that the CLI is the Node package.

The Python version in [`packages/pypi/pyproject.toml`](packages/pypi/pyproject.toml) is `0.0.1` on purpose. It is not meant to track the npm version. If you ever ship a real Python CLI, bump it and replace this placeholder in a separate change. You cannot reuse `0.0.1` once it has been uploaded.

## After both names are yours

Update the [README](README.md) so the install instructions lead with `npx thehivecode init`, and keep the checkout command for people who want to hack on the CLI. Say the date you published. Do not announce download numbers you do not have.
