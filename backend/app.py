import os
import json
import uuid
import paramiko
from flask import Flask, request, jsonify, abort

app = Flask(__name__)
DATA_FILE = 'vps_data.json'

# --- Helper Functions ---

def load_vps_data():
    """Loads VPS data from the JSON file."""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        # Handle case where file is empty or corrupted
        return []
    except Exception as e:
        print(f"Error loading data: {e}")
        return []

def save_vps_data(data):
    """Saves VPS data to the JSON file."""
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error saving data: {e}")


def find_vps_by_id(vps_id):
    """Finds a VPS entry by its ID."""
    all_vps = load_vps_data()
    for vps in all_vps:
        if vps.get('id') == vps_id:
            return vps
    return None

def ssh_connect(ip, user, password=None, key_path=None):
    """Establishes an SSH connection."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy()) # Be careful with AutoAddPolicy in production
    try:
        if key_path:
            # Ensure key file has correct permissions (often required)
            # Consider adding permission check/fix if needed, or instruct user
            key = paramiko.RSAKey.from_private_key_file(key_path) # Or Ed25519Key, etc. depending on key type
            client.connect(ip, username=user, pkey=key, timeout=10)
            print(f"Connecting to {ip} with user {user} using key {key_path}")
        elif password:
            client.connect(ip, username=user, password=password, timeout=10)
            print(f"Connecting to {ip} with user {user} using password")
        else:
            raise ValueError("Either password or key_path must be provided")
        return client
    except paramiko.AuthenticationException:
        print(f"Authentication failed for {user}@{ip}")
        raise ConnectionError("Authentication failed.")
    except Exception as e:
        print(f"Could not connect to {ip}: {e}")
        raise ConnectionError(f"Connection error: {e}")


# --- API Endpoints ---

@app.route('/api/vps', methods=['GET'])
def get_all_vps():
    """Returns the list of all VPS entries."""
    vps_list = load_vps_data()
    # Important: Never return sensitive info like passwords or full key paths directly to frontend
    # Create a safe list to return
    safe_vps_list = [
        {k: v for k, v in vps.items() if k not in ['password', 'key_path']}
        for vps in vps_list
    ]
    return jsonify(safe_vps_list)

@app.route('/api/vps', methods=['POST'])
def add_vps():
    """Adds a new VPS entry."""
    if not request.json:
        abort(400, description="Request must be JSON")

    required_fields = ['name', 'ip_address', 'username']
    if not all(field in request.json for field in required_fields):
        abort(400, description="Missing required fields: name, ip_address, username")

    # Basic validation (can be improved)
    if not request.json.get('password') and not request.json.get('key_path'):
         abort(400, description="Either 'password' or 'key_path' must be provided")

    new_vps = {
        'id': str(uuid.uuid4()), # Generate unique ID
        'name': request.json['name'],
        'ip_address': request.json['ip_address'],
        'username': request.json['username'],
        'password': request.json.get('password'), # Store password (INSECURE - for demo only!)
        'key_path': request.json.get('key_path'), # Store key path
        'os': request.json.get('os', 'Unknown') # Optional OS field
    }

    all_vps = load_vps_data()
    all_vps.append(new_vps)
    save_vps_data(all_vps)

    # Return only safe data
    safe_new_vps = {k: v for k, v in new_vps.items() if k not in ['password', 'key_path']}
    return jsonify(safe_new_vps), 201 # 201 Created status code

@app.route('/api/vps/<vps_id>', methods=['DELETE'])
def delete_vps(vps_id):
    """Deletes a VPS entry by ID."""
    all_vps = load_vps_data()
    vps_to_delete = find_vps_by_id(vps_id)

    if not vps_to_delete:
        abort(404, description="VPS not found")

    updated_vps_list = [vps for vps in all_vps if vps.get('id') != vps_id]
    save_vps_data(updated_vps_list)
    return jsonify({'message': 'VPS deleted successfully'})

@app.route('/api/vps/<vps_id>/command', methods=['POST'])
def run_command(vps_id):
    """Runs a predefined, safe command on the specified VPS."""
    if not request.json or 'command' not in request.json:
        abort(400, description="Request must be JSON and include 'command'")

    vps_info = find_vps_by_id(vps_id)
    if not vps_info:
        abort(404, description="VPS not found")

    # --- Security: Only allow specific, safe commands ---
    allowed_commands = {
        'uptime': 'uptime',
        'disk_usage': 'df -h',
        'memory_usage': 'free -h'
        # Add more safe, read-only commands here
    }
    command_key = request.json['command']
    if command_key not in allowed_commands:
        abort(400, description="Invalid or disallowed command.")

    actual_command = allowed_commands[command_key]
    ssh_client = None # Initialize to None
    try:
        # Get credentials safely from stored data (backend only)
        ssh_client = ssh_connect(
            vps_info['ip_address'],
            vps_info['username'],
            vps_info.get('password'), # Retrieve password if exists
            vps_info.get('key_path')  # Retrieve key path if exists
        )

        stdin, stdout, stderr = ssh_client.exec_command(actual_command, timeout=15)
        exit_status = stdout.channel.recv_exit_status() # Wait for command to finish

        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')

        if exit_status == 0:
            return jsonify({'output': output})
        else:
            # Return stderr if command failed
            return jsonify({'error': f"Command failed with exit status {exit_status}: {error if error else 'No error output'}"}), 500

    except ConnectionError as e:
         return jsonify({'error': f"SSH Connection Error: {e}"}), 500
    except Exception as e:
        return jsonify({'error': f"An unexpected error occurred: {e}"}), 500
    finally:
        if ssh_client:
            ssh_client.close()
            print(f"SSH connection closed for {vps_info['ip_address']}")


if __name__ == '__main__':
    # Make sure the server is accessible on the network if needed
    # Use 0.0.0.0 to listen on all available interfaces
    # Use a specific port, e.g., 5001, to avoid conflict with other apps
    app.run(host='0.0.0.0', port=5001, debug=True) # debug=True for development ONLY!