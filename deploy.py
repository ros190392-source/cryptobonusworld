import paramiko
import os
import sys
import time

# ── Deployment configuration (environment-driven, public-key only) ────────────
#
# Required environment variables (deployment fails closed if any is missing):
#   CBW_DEPLOY_HOST        production host name or IP
#   CBW_DEPLOY_USER        deployment SSH user
#   CBW_DEPLOY_KEY_PATH    path to the private key used for public-key auth
#
# Optional environment variables (documented defaults):
#   CBW_DEPLOY_PORT        SSH port          (default: 22)
#   CBW_DEPLOY_REMOTE_PATH remote web root   (default: /var/www/cryptobonusworld/html)
#
# No password is read, accepted or supported. See
# docs/security/CBW_DEPLOYMENT_CREDENTIALS_STANDARD_v1.md.

DEFAULT_PORT = 22
DEFAULT_REMOTE_PATH = '/var/www/cryptobonusworld/html'

MAX_RETRIES = 3


def _fail(message):
    """Emit an actionable, non-sensitive configuration error and exit closed."""
    sys.stderr.write(f"Deploy configuration error: {message}\n")
    sys.stderr.flush()
    sys.exit(2)


def load_config():
    """Read and validate deployment configuration from the environment.

    Fails closed before any network operation. Never reads or accepts a
    password, a default host, a default user or a machine-specific key path.
    """
    host = os.environ.get('CBW_DEPLOY_HOST', '').strip()
    user = os.environ.get('CBW_DEPLOY_USER', '').strip()
    key_path = os.environ.get('CBW_DEPLOY_KEY_PATH', '').strip()

    missing = [name for name, value in (
        ('CBW_DEPLOY_HOST', host),
        ('CBW_DEPLOY_USER', user),
        ('CBW_DEPLOY_KEY_PATH', key_path),
    ) if not value]
    if missing:
        _fail(
            'missing required environment variable(s): '
            + ', '.join(missing)
            + '. Set them to production values in your local secret manager; '
            'do not hardcode them. Public-key authentication only.'
        )

    port_raw = os.environ.get('CBW_DEPLOY_PORT', str(DEFAULT_PORT)).strip()
    try:
        port = int(port_raw)
    except ValueError:
        _fail("CBW_DEPLOY_PORT must be an integer.")

    remote_root = os.environ.get('CBW_DEPLOY_REMOTE_PATH', DEFAULT_REMOTE_PATH).strip() \
        or DEFAULT_REMOTE_PATH

    key_path = os.path.expanduser(key_path)
    if not os.path.isfile(key_path):
        _fail(
            "CBW_DEPLOY_KEY_PATH does not point to a readable private key file. "
            "Provide the path to your deployment SSH private key."
        )

    local_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
    if not os.path.isdir(local_dist):
        _fail("local dist/ directory not found — build the site before deploying.")

    return {
        'host': host,
        'user': user,
        'port': port,
        'key_path': key_path,
        'remote_root': remote_root,
        'local_dist': local_dist,
    }


def make_client(cfg):
    """Open a strict, public-key-only SSH connection.

    Host keys must already be known (system/user known_hosts); unknown hosts
    are rejected. Agent and on-disk key discovery are disabled so only the
    explicitly supplied key is used. No password is ever passed.
    """
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    try:
        client.connect(
            cfg['host'],
            port=cfg['port'],
            username=cfg['user'],
            key_filename=cfg['key_path'],
            allow_agent=False,
            look_for_keys=False,
            timeout=30,
            banner_timeout=30,
            auth_timeout=30,
        )
    except paramiko.ssh_exception.SSHException as exc:
        # Message may reference host-key rejection or auth failure, never a secret.
        _fail(f"SSH connection failed ({exc.__class__.__name__}): {exc}")
    transport = client.get_transport()
    transport.set_keepalive(15)          # send keepalive every 15 s
    return client


def upload_file_with_retry(sftp, local_path, remote_path, retries=MAX_RETRIES):
    for attempt in range(retries):
        try:
            sftp.put(local_path, remote_path)
            return
        except Exception:
            if attempt < retries - 1:
                sys.stdout.write(f"  retry {attempt+1}: {os.path.basename(local_path)}\n")
                sys.stdout.flush()
                time.sleep(2)
            else:
                raise


def upload_dir(sftp, local_dir, remote_dir):
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)

    for item in sorted(os.listdir(local_dir)):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item
        if os.path.isdir(local_path):
            upload_dir(sftp, local_path, remote_path)
        else:
            upload_file_with_retry(sftp, local_path, remote_path)


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    cfg = load_config()

    client = make_client(cfg)
    sys.stdout.write("Connected. Clearing remote html dir...\n")
    sys.stdout.flush()

    remote_root = cfg['remote_root']
    stdin, stdout, stderr = client.exec_command(f'rm -rf {remote_root}/* && echo done')
    result = stdout.read().strip()
    sys.stdout.write(f"Cleared: {result.decode()}\n")
    sys.stdout.flush()

    sftp = client.open_sftp()
    sys.stdout.write("Uploading dist/...\n")
    sys.stdout.flush()

    try:
        upload_dir(sftp, cfg['local_dist'], remote_root)
        sftp.close()
        client.close()
        sys.stdout.write("Deploy complete.\n")
        sys.stdout.flush()
    except Exception as exc:
        sys.stdout.write(f"Deploy failed: {exc}\n")
        sys.stdout.flush()
        sftp.close()
        client.close()
        sys.exit(1)


if __name__ == '__main__':
    main()
