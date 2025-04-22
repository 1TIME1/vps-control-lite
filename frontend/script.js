document.addEventListener('DOMContentLoaded', () => {
    const vpsList = document.getElementById('vps-list');
    const addVpsForm = document.getElementById('add-vps-form');
    const outputContent = document.getElementById('output-content');
    const addStatus = document.getElementById('add-status');
    const listStatus = document.getElementById('list-status');
    const commandStatus = document.getElementById('command-status');

    // Backend API URL (adjust if your backend runs on a different port/host)
    const API_BASE_URL = 'http://localhost:5001/api'; // Assuming backend runs on port 5001

    // --- Helper Functions ---
    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.className = `status-message ${isError ? 'error' : 'success'}`;
        element.style.display = 'block';
        // Optionally hide after a few seconds
        setTimeout(() => {
             if (element.textContent === message) { // Only hide if message hasn't changed
                 element.style.display = 'none';
                 element.textContent = '';
             }
        }, 5000);
    }

    function clearMessage(element) {
         element.textContent = '';
         element.style.display = 'none';
    }

    function displayCommandOutput(output, isError = false) {
        outputContent.textContent = output;
        commandStatus.textContent = ''; // Clear previous command-specific errors
        commandStatus.style.display = 'none';
        if (isError) {
            displayMessage(commandStatus, "Error occurred during command execution.", true);
        }
    }

    // --- Core Functions ---

    async function fetchVPSList() {
        clearMessage(listStatus);
        try {
            const response = await fetch(`${API_BASE_URL}/vps`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const vpsData = await response.json();
            renderVPSList(vpsData);
        } catch (error) {
            console.error('Error fetching VPS list:', error);
             displayMessage(listStatus, `Failed to load VPS list: ${error.message}`, true);
        }
    }

    function renderVPSList(vpsData) {
        vpsList.innerHTML = ''; // Clear existing list
         if (!vpsData || vpsData.length === 0) {
             vpsList.innerHTML = '<tr><td colspan="5">No VPS entries found. Add one above!</td></tr>';
             return;
         }

        vpsData.forEach(vps => {
            const row = vpsList.insertRow();
            row.innerHTML = `
                <td>${vps.name || 'N/A'}</td>
                <td>${vps.ip_address || 'N/A'}</td>
                <td>${vps.username || 'N/A'}</td>
                <td>${vps.os || 'Unknown'}</td>
                <td>
                    <button class="action-button command-button" data-id="${vps.id}" data-command="uptime">Uptime</button>
                    <button class="action-button command-button" data-id="${vps.id}" data-command="disk_usage">Disk</button>
                    <button class="action-button command-button" data-id="${vps.id}" data-command="memory_usage">Memory</button>
                    <button class="action-button delete-button" data-id="${vps.id}">Delete</button>
                </td>
            `;
        });
    }

    async function handleAddVPS(event) {
        event.preventDefault(); // Prevent default form submission
        clearMessage(addStatus);

        const name = document.getElementById('vps-name').value.trim();
        const ip = document.getElementById('vps-ip').value.trim();
        const user = document.getElementById('vps-user').value.trim();
        const password = document.getElementById('vps-password').value; // Don't trim passwords
        const keyPath = document.getElementById('vps-key-path').value.trim();
        const os = document.getElementById('vps-os').value.trim();

        if (!name || !ip || !user) {
            displayMessage(addStatus, 'Name, IP Address, and Username are required.', true);
            return;
        }
        if (!password && !keyPath) {
             displayMessage(addStatus, 'Please provide either a Password or an SSH Key Path.', true);
            return;
        }
         if (password && keyPath) {
             displayMessage(addStatus, 'Provide EITHER Password OR Key Path, not both.', true);
             // Decide which one to prioritize or just show error. Let's prioritize key path if both given.
             // Or simply return; forcing user to choose is clearer.
             return;
         }

        const vpsData = {
            name: name,
            ip_address: ip,
            username: user,
            os: os || 'Unknown' // Default if empty
        };
        if (keyPath) {
            vpsData.key_path = keyPath;
        } else {
            vpsData.password = password; // Sending password (use HTTPS in real scenarios!)
        }


        try {
            const response = await fetch(`${API_BASE_URL}/vps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(vpsData),
            });

            const result = await response.json(); // Attempt to parse JSON regardless of status code

            if (!response.ok) {
                 const errorMsg = result.description || result.error || `HTTP error! Status: ${response.status}`;
                 throw new Error(errorMsg);
            }

            displayMessage(addStatus, `VPS "${result.name}" added successfully!`, false);
            addVpsForm.reset(); // Clear the form
            fetchVPSList(); // Refresh the list
        } catch (error) {
            console.error('Error adding VPS:', error);
             displayMessage(addStatus, `Failed to add VPS: ${error.message}`, true);
        }
    }

    async function handleDeleteVPS(vpsId) {
        if (!confirm('Are you sure you want to delete this VPS entry?')) {
            return;
        }
        clearMessage(listStatus); // Clear general list status

        try {
            const response = await fetch(`${API_BASE_URL}/vps/${vpsId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok) {
                 const errorMsg = result.description || result.error || `HTTP error! Status: ${response.status}`;
                throw new Error(errorMsg);
            }

            displayMessage(listStatus, result.message || 'VPS deleted successfully!', false);
            fetchVPSList(); // Refresh the list
        } catch (error) {
            console.error('Error deleting VPS:', error);
             displayMessage(listStatus, `Failed to delete VPS: ${error.message}`, true);
        }
    }

     async function handleRunCommand(vpsId, commandKey) {
        displayCommandOutput('Running command, please wait...', false); // Show loading state
        clearMessage(commandStatus);

        try {
            const response = await fetch(`${API_BASE_URL}/vps/${vpsId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command: commandKey }), // Send the command key (e.g., "uptime")
            });

            const result = await response.json(); // Always try to parse response

             if (!response.ok) {
                 const errorMsg = result.error || result.description || `Command execution failed with status: ${response.status}`;
                 throw new Error(errorMsg);
             }

            if (result.output) {
                 displayCommandOutput(result.output, false);
            } else if (result.error) {
                 // Handle errors reported by the backend's command execution logic
                 displayCommandOutput(`Error from server:\n${result.error}`, true);
            } else {
                 // Should not happen if backend is correct, but handle unexpected successful response format
                 displayCommandOutput("Received unexpected response from server.", true);
            }

        } catch (error) {
            console.error('Error running command:', error);
             displayCommandOutput(`Failed to run command: ${error.message}`, true);
        }
    }


    // --- Event Listeners ---
    addVpsForm.addEventListener('submit', handleAddVPS);

    // Use event delegation for buttons in the dynamic list
    vpsList.addEventListener('click', (event) => {
        const target = event.target;
        const vpsId = target.dataset.id;

        if (target.classList.contains('delete-button') && vpsId) {
            handleDeleteVPS(vpsId);
        } else if (target.classList.contains('command-button') && vpsId) {
            const commandKey = target.dataset.command;
            if (commandKey) {
                handleRunCommand(vpsId, commandKey);
            }
        }
    });

    // --- Initial Load ---
    fetchVPSList();
});