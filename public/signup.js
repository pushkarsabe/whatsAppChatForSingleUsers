const URL = 'http://localhost:3000';

console.log('signup.js loaded');
document.getElementById('signupForm').addEventListener('submit', function (event) {
    event.preventDefault();
    console.log('Submit event triggered');
    submitData();
});

document.getElementById('loginBtn').addEventListener('click', function () {
    window.location.href = './login.html';
});

//function to display the message
function showMessage(msgText, className) {
    const msg = document.getElementById('message');
    // Clear previous message
    msg.innerHTML = '';

    const div = document.createElement('div');
    const textNode = document.createTextNode(msgText);
    div.appendChild(textNode);
    msg.appendChild(div);
    msg.classList.add(className);

    setTimeout(() => {
        msg.classList.remove(className);
        // Safely remove the child if it still exists
        if (msg.contains(div)) {
            msg.removeChild(div);
        }
    }, 2000);
}

async function submitData() {
    // Get values from the form
    const name = document.getElementById('inputName').value;
    const email = document.getElementById('inputEmail').value;
    const phoneNumber = document.getElementById('inputPhoneNumber').value;
    const password = document.getElementById('inputPassword').value;
    console.log('name = ' + name);
    console.log('email = ' + email);
    console.log('password = ' + password);
    console.log('phoneNumber = ' + phoneNumber);

    if (name === "" || email === "" || phoneNumber === "" || password === "") {
        console.log('data is missing');
        showMessage('Please fill all fields', 'failureMessage');
    } else {
        const obj = {
            name: name,
            email: email,
            password: password,
            phoneNumber: phoneNumber
        }

        const apiUrl = URL + '/user/signup';

        try {
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(obj)
            };

            const response = await fetch(apiUrl, fetchOptions);

            let data;
            try {
                data = await response.json();
            } catch (e) {
                // Handle cases where response body is empty or not valid JSON
                data = { message: 'Failed to parse response.', newUserData: {} };
            }

            if (!response.ok) {
                // Handle non-2xx status codes
                console.error('Signup Request Failed (HTTP Error):', data);

                let errorMessage;
                if (response.status === 400 && data.message) {
                    // Your backend returns 400 for 'Email already exists'
                    errorMessage = data.message;
                } else {
                    errorMessage = data.message || `Server error (Status: ${response.status})`;
                }

                // Show the error message retrieved from the server or derived status
                showMessage(errorMessage, 'failureMessage');
                return; // Stop execution on error
            }

            // Handle successful 2xx response (e.g., 201 Created)
            console.log('data added');
            console.log('response data = ' + JSON.stringify(data));
            console.log('response name = ' + data.newUserData.name);
            console.log('response email = ' + data.newUserData.email);

            // Assuming your backend returns a message on success in the body:
            const successMessage = data.message || 'New user successfully signed in';
            showMessage(successMessage, 'succesMessage');

        } catch (error) {
            // Handle network errors (e.g., server is down)
            console.error('Network Error during signup:', error);
            let errorMessage = 'An unexpected error occurred';
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'No response from server (Check backend)';
            }
            showMessage(errorMessage, 'failureMessage');
        }
    }
    //to clear the input feilds after user clicks on submit
    document.getElementById('inputName').value = "";
    document.getElementById('inputEmail').value = "";
    document.getElementById('inputPhoneNumber').value = "";
    document.getElementById('inputPassword').value = "";

}//submitData
