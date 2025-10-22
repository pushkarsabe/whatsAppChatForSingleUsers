//local variables
const URL = 'http://localhost:3000';
console.log('login.js loaded');

document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    console.log('Submit event triggered');
    submitData();
});

document.getElementById('signupBtn').addEventListener('click', function () {
    window.location.href = './signup.html';
});

//function to display the message
function showMessage(msgText, className) {
    return new Promise(resolve => {
        const msg = document.getElementById('message');
        // Ensure the message element is empty before adding a new one
        msg.innerHTML = '';

        const div = document.createElement('div');
        const textNode = document.createTextNode(msgText);
        div.appendChild(textNode);
        msg.appendChild(div);
        msg.classList.add(className);

        setTimeout(() => {
            msg.classList.remove(className);
            msg.removeChild(div);
            resolve();
        }, 2000);
    })
}

async function submitData() {
    console.log('inside submitData login');
    // Get values from the form
    const email = document.getElementById('inputEmail').value;
    const password = document.getElementById('inputPassword').value;
    console.log('email = ', email);
    console.log('password = ', password);

    if (email === "" || password === "") {
        await showMessage('Please enter both email and password', 'failureMessage');
    }
    else {
        const obj = {
            email: email,
            password: password
        }

        const apiUrl = URL + '/user/login';

        try {
            // Using native fetch API
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(obj)
            };

            const response = await fetch(apiUrl, fetchOptions);

            // 1. Check for non-OK HTTP status codes (4xx, 5xx)
            if (!response.ok) {
                // Try to parse the response data to get the server's error message
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { message: 'Failed to parse server error response.' };
                }

                let errorMessage = 'An unexpected error occurred';

                // Map specific status codes to user-friendly messages
                switch (response.status) {
                    case 401:
                        errorMessage = 'Invalid credentials'; // Password mismatch
                        break;
                    case 404:
                        errorMessage = 'User not found'; // User does not exist
                        break;
                    case 403:
                        errorMessage = 'Access forbidden';
                        break;
                    case 500:
                        errorMessage = 'Server error (500)';
                        break;
                    default:
                        // Use the message parsed from the body or generic server error
                        errorMessage = errorData.message || `Server error (Status: ${response.status})`;
                        break;
                }

                // Throwing an error here ensures the catch block is executed
                throw new Error(errorMessage);
            }

            // 2. Process successful response body
            const data = await response.json();

            console.log('response data = ' + JSON.stringify(data));

            if (data && data.userDetails && data.token) {
                console.log('email = ' + data.userDetails.email);
                console.log('token = ' + data.token);
                localStorage.setItem('token', data.token);

                await showMessage('Email and Password verified', 'succesMessage');

                //user will be redirected to home page after 2 sec of login
                setTimeout(() => {
                    window.location.href = './whatsappHome.html';
                }, 2000);
            } else {
                await showMessage('Login succeeded, but unexpected data structure', 'failureMessage');
            }
        }
        catch (error) {
            console.error('Login Request Failed:', error);

            let errorMessage;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'No response from server (Check backend is running on port 3000)';
            } else {
                // Uses the specific error message thrown above (e.g., 'Invalid credentials', 'User not found')
                errorMessage = error.message || 'An unexpected error occurred';
            }

            await showMessage(errorMessage, 'failureMessage');
        }
    }

    //to clear the fields
    document.getElementById('inputEmail').value = "";
    document.getElementById('inputPassword').value = "";
}//submitData
