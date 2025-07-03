

//Check which page we are on 
if (document.getElementById('login-form')) {
    //we are on the login page
    handleLoginPage();
}else if (document.querySelector('header h1').textContent === 'My Profile'){
    //We are on the profile page
    handleProfilePage();
}

function handleLoginPage(){
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        //Base64 encode the credentials as required by the API
        const credentials = btoa(`${username}:${password}`);

        try {
            const response = await fetch('https://learn.zone01kisumu.ke/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Authorization':`Basic ${credentials}`,
                    // 'Content-Type':'application'
                }
            });
            if (!response.ok){
                //If the response is not 200, it's an error
                const errorData=await response.json();
                throw new Error(errorData.error) || 'Invalid credentials'
            }
            //If login is successful, we get a JWT
             const jwt = await response.text();

             //Store the JWT. sessionStorage is cleared when the browser is closed.
             //localStorage persists until cleared manually
             sessionStorage.setItem('jwt',jwt)
             console.log("jwt:",jwt)

             //Redirect to the profile page
             window.location.href='profile.html'
        
        }catch (error){
             errorMessage.textContent = error.message;
            console.error('Login failed:', error);
        }
    })
    
}

function handleProfilePage() {
    console.log("Welcome to your profile!");
    
}


async function fetchGraphQl(query) {
    const jwt= sessionStorage.getItem('jwt');
    if (!jwt){
        //If no token, redirect to login 
        window.location.href = 'index.html';
        return;
    }

    try{
        const response = await fetch('https://learn.zone01kisumu.ke/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'content-Type':'application/json',
                'Authorization':`Bearer ${jwt}`
            },
            body: JSON.stringify({query:query})

        });
        if (!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const jsonResponse = await response.json()
        if (jsonResponse.errors){
            // Handle GraphQL-specific errors
            console.error("GraphQL Errors:", jsonResponse.errors);
            // Maybe log the user out if the token is expired
            if (jsonResponse.errors.some(e => e.message.includes("JWTExpired"))) {
                sessionStorage.removeItem('jwt');
                window.location.href = 'index.html';
            }
            throw new Error('A GraphQL error occurred');

        }

        return jsonResponse.data;
    } catch (error){
        console.error('Error fetching GraphQl data:', error)
          // Maybe redirect to login if there's a fatal error
        window.location.href = 'index.html';
    }
    
}
