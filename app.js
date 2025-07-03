

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
             const rawJwt = await response.text();

             //Store the JWT. sessionStorage is cleared when the browser is closed.
             //localStorage persists until cleared manually

             // Aggressively remove any quotation marks from the start and end of the string
const cleanJwt = rawJwt.replace(/"/g, ''); 
             sessionStorage.setItem('jwt',cleanJwt)
          console.log("Cleaned JWT being saved:", cleanJwt);

             //Redirect to the profile page
             window.location.href='profile.html'
        
        }catch (error){
             errorMessage.textContent = error.message;
            console.error('Login failed:', error);
        }
    })
    
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
                'Content-Type':'application/json',
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

async function handleProfilePage() {
    console.log("Welcome to your profile!");
    const jwt = sessionStorage.getItem('jwt');
    if (!jwt){
        window.location.href='index.html';
        return;
    }
    console.log("Welcome to your profile! Fetching data...");

    //Define first query

 const dataQuery = `
query {
    user {
        id
        login
    }
    transaction(
        where: {type: {_eq: "xp"}, path: {_nlike: "%piscine-js%"}}
        order_by: {createdAt: asc}
    ) {
        amount
        createdAt
        path
    }
    audits_done: transaction_aggregate(
        where: {type: {_eq: "up"}}
    ) {
        aggregate {
            count
        }
    }
    audits_received: transaction_aggregate(
        where: {type: {_eq: "down"}}
    ) {
        aggregate {
            count
        }
    }
    # For the project pass/fail ratio graph
    result(
        where: {type: {_eq: "project"}}
    ) {
        grade
        path
    }
}
`;

    //Fetch the data
    const data = await fetchGraphQl(dataQuery);

      // In the next step, we'll display this data
    if (data) {
        console.log("Received data:", data);
        populateProfile(data); // A new function we will write next
    }

    
}

function populateProfile(data){
    if (!data){
        console.error("No data available to populate profile.");
        return;
    }

    //Part 1:Populate the text information
    // 1.Basic Info

    const user =data.user[0]

    document.getElementById('info-username').textContent = user.login;
     document.getElementById('info-userid').textContent = user.id;

     //2. Total XP
     const xpTransactions = data.transaction;
      // .reduce() is a clean way to sum up values in an array
    const totalXP = xpTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    // Convert bytes to kB for readability. Using 1000 is common for KB.
    document.getElementById('info-total-xp').textContent = `${Math.round(totalXP / 1000)} kb`;
    
    // 3. Audit Info
    const auditsDone = data.audits_done.aggregate.count;
    const auditsReceived = data.audits_received.aggregate.count;
    document.getElementById('info-audits-done').textContent = auditsDone;
    document.getElementById('info-audits-received').textContent = auditsReceived;

    generateXpOverTimeGraph(xpTransactions); 
    generateProjectRatioGraph(data.result);
}

// These will be empty for now, but defining them prevents errors
function generateXpOverTimeGraph(transactions) {
    console.log("Data for XP Graph:", transactions);
    const graphDiv = document.getElementById('xp-over-time-graph');
    graphDiv.innerHTML = "<p>XP over time graph will be here.</p>"; // Placeholder
}

function generateProjectRatioGraph(results) {
    console.log("Data for Project Ratio Graph:", results);
    const graphDiv = document.getElementById('project-ratio-graph');
    graphDiv.innerHTML = "<p>Project ratio graph will be here.</p>"; // Placeholder
}