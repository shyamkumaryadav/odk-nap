# ODK Form

---

## Python setup

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run:

```bash
uv sync --locked
```

uv downloads the pinned Python 3.14.7 interpreter when needed and creates a
local `.venv`. Dependencies are declared in `pyproject.toml` and locked in
`uv.lock`.

## Run A Watchdog Service

```bash
uv run python xls2xml.py
```

The watcher converts Excel forms saved in `XLS/` into `public/`.

## Generate mock submissions

```bash
uv run python mock.py XLS/example.xlsx --count 10
```

Replace `XLS/example.xlsx` with your form path. These commands replace the
former Pipenv `dev` and `mock` scripts. Form conversion also requires Java
on `PATH` for the ODK validator bundled with pyxform.

To add or update dependencies, use `uv add <package>` or `uv lock --upgrade`,
then commit both `pyproject.toml` and `uv.lock`.

## Run A ODK Form

```bash
yarn dev
```

### Note

> open excel file on Window `start excel filename.xlsx`
> open xls file on Ubuntu `libreoffice filename.xls`
