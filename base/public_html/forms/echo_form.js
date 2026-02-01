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

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const selectedLanguage = languageSelect.value;
    const selectedMethod = methodSelect.value;
    const selectedEncoding = encodingSelect.value;

    if (!selectedLanguage || !selectedMethod) {
        alert('Please select both a language and a method');
        return;
    }

    const url = routes[selectedLanguage];
    
    if (!url) {
        alert('Invalid language selection');
        return;
    }

    // Set the form action and method dynamically
    form.action = url;
    form.method = selectedMethod;

    // Set encoding if specified
    if (selectedEncoding) {
        form.enctype = selectedEncoding;
    }

    // Submit the form (will navigate to the echo page)
    form.submit();
});