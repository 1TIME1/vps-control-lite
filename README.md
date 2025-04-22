# VPS Control Lite

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A lightweight, web-based tool for managing basic information and executing simple, predefined commands on your Virtual Private Servers (VPS).

**Motivation:** This project was created as a slightly complex open-source example, particularly for demonstrating web development skills involving backend APIs, frontend interaction, and remote server communication via SSH. It serves as a potential qualifying project for programs requiring open-source contributions (like the Vtexs free server application).

## Features

*   **Add/Remove VPS:** Store and manage connection details for multiple VPS instances.
*   **List VPS:** View all your registered VPSs in a clean table format.
*   **Web Interface:** Simple and intuitive UI built with HTML, CSS, and vanilla JavaScript.
*   **Backend API:** RESTful API built with Python Flask to handle data and actions.
*   **SSH Command Execution:** Run predefined, safe commands (like `uptime`, `df -h`, `free -h`) on remote servers using Paramiko.
*   **JSON Data Storage:** Uses a simple JSON file for data persistence (easy setup, but not suitable for large scale).
*   **Basic Authentication Support:** Supports both password ( **NOT RECOMMENDED for production** ) and SSH Key-based authentication.

## Technology Stack

*   **Backend:** Python 3, Flask, Paramiko
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Data Storage:** JSON

## Project Structure
vps-control-lite/
├── backend/
│ ├── app.py # Flask backend application
│ ├── requirements.txt # Python dependencies
│ └── vps_data.json # VPS data store (initially empty)
├── frontend/
│ ├── index.html # Main HTML page
│ ├── style.css # CSS styles
│ └── script.js # JavaScript logic
├── .gitignore # Git ignore rules
└── README.md # This file

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/1TIME1/vps-control-lite.git
    cd vps-control-lite
    ```

2.  **Set up the Backend:**
    *   Navigate to the `backend` directory:
        ```bash
        cd backend
        ```
    *   **Recommended:** Create and activate a Python virtual environment:
        ```bash
        python -m venv venv
        # On Windows:
        # venv\Scripts\activate
        # On macOS/Linux:
        # source venv/bin/activate
        ```
    *   Install the required Python packages:
        ```bash
        pip install -r requirements.txt
        ```
    *   The `vps_data.json` file will be created automatically or you can create an empty `[]` file manually if needed.

3.  **Run the Backend:**
    *   Execute the Flask application:
        ```bash
        python app.py
        ```
    *   The backend API server should now be running, typically at `http://localhost:5001` (or `http://0.0.0.0:5001`).

4.  **Access the Frontend:**
    *   Open the `frontend/index.html` file directly in your web browser (e.g., by double-clicking it or using `File > Open` in your browser).
    *   The frontend will attempt to connect to the backend API running on `http://localhost:5001`.

## Usage

1.  **Add a VPS:** Fill in the details in the "Add New VPS" form and click "Add VPS".
    *   Provide either a password **OR** the *absolute path* to your **private** SSH key file *on the machine where the backend (`app.py`) is running*. Using SSH keys is strongly recommended.
2.  **View VPS List:** The table will automatically update to show your added VPSs.
3.  **Run Commands:** Click the command buttons (`Uptime`, `Disk`, `Memory`) next to a VPS entry. The output will appear in the "Command Output" section below.
4.  **Delete a VPS:** Click the "Delete" button next to a VPS entry. You will be asked for confirmation.

## Security Considerations - VERY IMPORTANT!

*   **Password Storage:** This example code **stores passwords in plaintext** within the `backend/vps_data.json` file if you choose password authentication. This is **EXTREMELY INSECURE** and should **NEVER** be done in a real-world or production environment. It is included here *only* for the simplicity of the demonstration.
*   **SSH Key Usage:** Using SSH keys (`key_path`) is the **strongly recommended** method. Ensure your private key file has appropriate permissions (usually `chmod 600` on Linux/macOS). The path provided should be the *absolute path* on the server running the `backend/app.py` script.
*   **SSH Host Keys:** The current implementation uses `paramiko.AutoAddPolicy()`, which automatically trusts unknown host keys. This makes it vulnerable to Man-in-the-Middle (MitM) attacks. For better security, you should implement proper host key checking (e.g., using a `known_hosts` file).
*   **Command Injection:** While this version uses a predefined list of allowed commands on the backend to prevent arbitrary command execution, always be cautious when executing commands based on user input or stored data. The current approach is relatively safe *because* the commands are hardcoded on the backend.
*   **Network Exposure:** Running the Flask development server with `host='0.0.0.0'` makes it accessible on your local network. Ensure appropriate firewall rules are in place if you expose this tool beyond your local machine. Use a production-grade WSGI server (like Gunicorn or uWSGI) behind a reverse proxy (like Nginx) for any serious deployment.
*   **HTTPS:** The communication between the frontend and backend is currently over HTTP. In a real application, sensitive data (even non-password details) should be transmitted over HTTPS.

## Future Enhancements

*   Replace JSON storage with a database (e.g., SQLite, PostgreSQL).
*   Implement secure credential management (e.g., using environment variables, a secrets manager, or encrypted storage).
*   Add robust SSH host key verification.
*   Allow users to define custom (but safe) commands.
*   Add VPS status checking (e.g., ping or port check).
*   Improve the UI/UX.
*   Implement user authentication for the tool itself.
*   Package as Docker containers.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs, feature requests, or improvements.
