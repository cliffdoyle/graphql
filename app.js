//Handles login logic

document.addEventListener('DOMContentLoaded', ()=>{


//Getting references to the HTML elements we need
const loginForm = document.getElementById('login-form');

const errorMessage = document.getElementById('error-message');
if(loginForm){
//Adding event listener for when the form is submitted
loginForm.addEventListener('submit',async(event)=>{
    //Prevent the old fashioned way submition
    event.preventDefault();

    //Retrieve the users credential from the form inputs
    const credentials = document.getElementById('credentials').value;
    const password = document.getElementById('password').value;

    //Base64 encode the credentials in the "username:password" format
    const encodeCredentials =btoa(`${credentials}:${password}`);

    try{
        // const proxyUrl= 'https://cors.sh/';
        const apiUrl = 'https://learn.zone01kisumu.ke/api/auth/signin/';

        // const finalApiUrl=`${proxyUrl}${apiUrl}`;

        //Making POST request to the signin endpoint
        const response = await fetch(apiUrl,
                    {
                        method: 'POST',
                        headers:{
                            //Authorization header is used for storing the credentials
                            Authorization:`Basic ${encodeCredentials}`,
                            // 'X-Requested-With':'XMLHttpRequest'
                        }
                    });

                    //Check if the login attempt was successful
                    if (response.ok){
                        //If successful, the response body is JWT
                        const jwt = await response.text()  
                        console.log('jwt token',jwt)                  //Store the JWT in the browser's localStorage. In this way, it can 
                        //be accessed throughout the application
                        localStorage.setItem('jwt',jwt)

                        window.location.href = 'profile.html'
                    }else{
                        //If server responded with an error i.e 401 Unauthorized
                        //show an error
                        errorMessage.textContent='Invalid username or password. Please try again'
                        console.log('fail attempt login',response.status,'Body:',await response.text());
                    }
    }catch(error){
        //This catches network errors or other issues related to fetch
        console.error('An error occurred during login:',error);
        errorMessage.textContent='An error occurred.Please check your connection'
        console.log()
    }
});
}


})
