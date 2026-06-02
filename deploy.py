import paramiko
import os
import sys
import time

HOST = '23.88.106.140'
USER = 'root'
PASS = 'E4mJNwJkX4qi'
LOCAL_DIST = r'C:\projects\CryptoBonusWorld\dist'
REMOTE_ROOT = '/var/www/cryptobonusworld/html'

MAX_RETRIES = 3

def make_client():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        username=USER,
        password=PASS,
        timeout=30,
        banner_timeout=30,
        auth_timeout=30,
    )
    transport = client.get_transport()
    transport.set_keepalive(15)          # send keepalive every 15 s
    return client

def upload_file_with_retry(sftp, local_path, remote_path, retries=MAX_RETRIES):
    for attempt in range(retries):
        try:
            sftp.put(local_path, remote_path)
            return
        except Exception as e:
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

client = make_client()
sys.stdout.write("Connected. Clearing remote html dir...\n")
sys.stdout.flush()

stdin, stdout, stderr = client.exec_command(f'rm -rf {REMOTE_ROOT}/* && echo done')
result = stdout.read().strip()
sys.stdout.write(f"Cleared: {result.decode()}\n")
sys.stdout.flush()

sftp = client.open_sftp()
sys.stdout.write("Uploading dist/...\n")
sys.stdout.flush()

try:
    upload_dir(sftp, LOCAL_DIST, REMOTE_ROOT)
    sftp.close()
    client.close()
    sys.stdout.write("Deploy complete.\n")
    sys.stdout.flush()
except Exception as e:
    sys.stdout.write(f"Deploy failed: {e}\n")
    sys.stdout.flush()
    sftp.close()
    client.close()
    sys.exit(1)
