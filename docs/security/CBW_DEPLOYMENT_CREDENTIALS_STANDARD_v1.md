# CBW Deployment Credentials Standard — v1

- Status: **SECURITY STANDARD (binding)**
- Origin: incident remediation task `CBW-PRODUCTION-SECRETS-EMERGENCY-REMEDIATE-014`
- Scope: production deployment authentication for `deploy.py` and `scripts/deploy.mjs`

This standard governs how production deployment credentials are handled. It contains
**no** real host, IP, username, password, key fingerprint, private-key material or
operator-local path — by design.

## 1. No secrets in the repository

No production password may exist in source code, documentation, commit additions,
commit messages, prompts, logs or terminal output. Secrets are never hardcoded and
never pasted into AI chats or issue trackers.

## 2. Public-key authentication only

Production deployment authenticates with **SSH public-key authentication only**.
Password authentication and keyboard-interactive authentication are prohibited and
have no fallback path. Both deployment scripts fail closed when key-based access is
not available.

## 3. Required environment variables

Deployment configuration is read from the environment. Required (deployment fails
closed if any is missing):

| Variable | Purpose |
|---|---|
| `CBW_DEPLOY_HOST` | Production host name or IP. |
| `CBW_DEPLOY_USER` | Deployment SSH user. |
| `CBW_DEPLOY_KEY_PATH` | Filesystem path to the deployment SSH **private key**. |

Optional, with documented defaults (these are configuration, not secrets):

| Variable | Default | Purpose |
|---|---|---|
| `CBW_DEPLOY_PORT` | `22` | SSH port. |
| `CBW_DEPLOY_REMOTE_PATH` | `/var/www/cryptobonusworld/html` | Remote web root. |

There is deliberately **no password variable**. `HOST`, `USER` and `KEY_PATH` have no
defaults: a missing value is a hard, actionable error, never a silent fallback to a
production host, a `root` user or a machine-specific key path.

## 4. Where real values live

Real values belong in an operator-local secret manager or a protected CI secret store
(for example, GitHub Actions encrypted secrets). They are injected into the process
environment at deploy time and never written into tracked files.

## 5. A real `.env` file is never committed

Operators may keep a local `.env` for convenience. `.gitignore` blocks `.env` and all
`.env.*` variants; the placeholder-only `.env.example` is the single tracked exception.
A real `.env` must never be committed.

## 6. Private keys are never committed or shared

Private keys must never be committed and never pasted into AI chats, tickets or logs.
`.gitignore` blocks common private-key filenames and extensions as defence in depth.

## 7. Host-key verification stays enabled

Strict host-key verification remains enabled on every connection. `deploy.py` loads
known host keys and rejects unknown hosts (no auto-add). `scripts/deploy.mjs` runs
ssh/scp with `StrictHostKeyChecking=yes`, `BatchMode=yes`,
`PreferredAuthentications=publickey`, `IdentitiesOnly=yes`,
`PasswordAuthentication=no` and `KbdInteractiveAuthentication=no`.

## 8. No password fallback

If key authentication fails, deployment fails closed. Scripts must never prompt for,
accept or retry with a password.

## 9. Rotation happens out-of-band

Production credential rotation and revocation are performed directly on the server /
provider (out-of-band), never through repository changes. Repository changes only
remove hardcoded values and enforce the key-only contract.

## 10. Exposure means compromise

Any credential that has ever been committed to Git must be treated as compromised
**immediately** and rotated out-of-band, regardless of whether the commit was later
removed.

## 11. Rotation removes access risk but not historical data

Rotating or revoking an exposed credential removes the access risk (the old value no
longer works). It does **not** erase the historical value from existing Git objects,
which may still be present in history, on other branches, in clones and on the remote.

## 12. History rewriting is a separate, owner-authorized procedure

Removing a secret from Git history rewrites commit objects, invalidates commit SHAs,
and affects every branch, tag, worktree, clone and open reference. It is therefore a
separate, explicitly owner-authorized incident procedure with its own coordination
plan — not part of routine remediation.

## 13. No deployment during remediation

Credential-remediation tasks do not deploy. Deployment with new credentials happens
only under a later, explicitly authorized task.

## 14. Future hardening (out of scope here)

Migrating from direct `root` deployment to a restricted, least-privilege non-root
deploy account (write access limited to the web root) is recommended, but is outside
the scope of this remediation and requires its own task.
