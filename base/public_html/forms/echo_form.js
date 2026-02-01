const routes = {
    python: '/cgi-bin/echo-python.py',
    nodejs: '/node/echo-nodejs',
    php: '/cgi-bin/echo-php.php',
    perl: '/cgi-bin/perl-general-echo.pl'
};

const form = document.querySelector('form');
const languageSelect = document.getElementById('language');
const methodSelect = document.getElementById('method');
const encodingSelect = document.getElementById('encoding');
const dynamicFields = document.getElementById('dynamic-fields');

// Update fields when method changes
methodSelect.addEventListener('change', updateFields);

function updateFields() {
    const method = methodSelect.value;
    
    if (!method) {
        dynamicFields.innerHTML = '';
        encodingSelect.disabled = false;
        return;
    }
    
    // Disable encoding for GET and DELETE (they don't use request body)
    if (method === 'get' || method === 'delete') {
        encodingSelect.disabled = true;
        encodingSelect.value = ''; // Reset selection
    } else {
        encodingSelect.disabled = false;
    }
    
    let fieldsHTML = '';
    
    switch(method) {
        case 'get':
            // GET: Search/filter parameters
            fieldsHTML = `
                <label for="search">Search term:</label>
                <input type="text" id="search" name="search" placeholder="e.g., javascript">
                
                <label for="category">Category:</label>
                <input type="text" id="category" name="category" placeholder="e.g., programming">
                
                <label for="limit">Limit:</label>
                <input type="text" id="limit" name="limit" placeholder="e.g., 10">
            `;
            break;
            
        case 'post':
            // POST: Create new resource with all fields
            fieldsHTML = `
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" placeholder="Enter name" required>
                
                <label for="email">Email:</label>
                <input type="text" id="email" name="email" placeholder="Enter email">
                
                <label for="message">Message:</label>
                <textarea id="message" name="message" placeholder="Enter your message"></textarea>
            `;
            break;
            
        case 'put':
            // PUT: Update existing resource (need id + fields to update)
            fieldsHTML = `
                <label for="id">Resource ID:</label>
                <input type="text" id="id" name="id" placeholder="e.g., 123" required>
                
                <label for="name">Name (to update):</label>
                <input type="text" id="name" name="name" placeholder="New name">
                
                <label for="email">Email (to update):</label>
                <input type="text" id="email" name="email" placeholder="New email">
                
                <label for="status">Status:</label>
                <input type="text" id="status" name="status" placeholder="e.g., active, inactive">
            `;
            break;
            
        case 'delete':
            // DELETE: Just need the resource ID
            fieldsHTML = `
                <label for="id">Resource ID to delete:</label>
                <input type="text" id="id" name="id" placeholder="e.g., 123" required>
                
                <label for="reason">Reason (optional):</label>
                <input type="text" id="reason" name="reason" placeholder="Why delete this resource?">
            `;
            break;
    }
    
    dynamicFields.innerHTML = fieldsHTML;
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const selectedLanguage = languageSelect.value;
    const selectedMethod = methodSelect.value.toUpperCase();
    const selectedEncoding = encodingSelect.value || 'application/x-www-form-urlencoded';

    if (!selectedLanguage || !selectedMethod) {
        alert('Please select both a language and a method');
        return;
    }

    const url = routes[selectedLanguage];

    // Collect form data
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
        if (key !== 'language' && key !== 'method' && key !== 'encoding') {
            data[key] = value;
        }
    }

    // Build request
    let fetchUrl = url;
    let fetchOptions = { method: selectedMethod };

    if (selectedMethod === 'GET') {
        const params = new URLSearchParams(data);
        fetchUrl = `${url}?${params.toString()}`;
    } else {
        if (selectedEncoding === 'application/json') {
            fetchOptions.headers = { 'Content-Type': 'application/json' };
            fetchOptions.body = JSON.stringify(data);
        } else {
            fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            fetchOptions.body = new URLSearchParams(data).toString();
        }
    }

    // Send request and open response in new window
    try {
        const response = await fetch(fetchUrl, fetchOptions);
        const html = await response.text();
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(html);
            newWindow.document.close();
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});