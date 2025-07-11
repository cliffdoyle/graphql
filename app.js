

document.addEventListener('DOMContentLoaded',()=>{
    if(document.getElementById('login-form')){
        handleLoginPage()
    }else if(document.getElementById('profile-page')){
        handleProfilePage()
    }
})

function handleLoginPage(){
    console.log('login now')
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
                const errorData =await response.json();
                const err =document.getElementById('error-message')
                // Set the error message and display it
                //err.textContent = 'Invalid username or password';
                err.style.display = 'block';

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

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', ()=>{
        //Clear the token from storage
        sessionStorage.removeItem('jwt');
        //Redirect to the login page
        window.location.href = 'index.html'
    })
    console.log("Welcome to your profile! Fetching data...");

    //Define first query


 const dataQuery = `
    query GetProfileAndGraphData {
        user {
            id
            login
            firstName
            lastName
            email

            # 1. Gets the total XP sum for you. Very efficient.
            xpTotal: transactions_aggregate(
                where: {type: {_eq: "xp"}, eventId: {_eq: 75}}
            ) {
                aggregate {
                    sum {
                        amount
                    }
                }
            }

            # 2. Gets the individual XP transactions needed for the line graph.
            xpForGraph: transactions(
                where: {type: {_eq: "xp"}, eventId: {_eq: 75}},
                order_by: {createdAt: asc}
            ) {
                amount
                createdAt
            }

            # 3. Gets your audit counts.
            audits_done: transactions_aggregate(where: {type: {_eq: "up"}}) {
                aggregate {
                    count
                }
            }
            audits_received: transactions_aggregate(where: {type: {_eq: "down"}}) {
                aggregate {
                    count
                }
            }

             # 4. NEW: Get the size of each audit for the ratio graph
            auditsDoneData: transactions(where: {type: {_eq: "up"}}, order_by: {createdAt: asc}) {
                amount
            }
            auditsReceivedData: transactions(where: {type: {_eq: "down"}}, order_by: {createdAt: asc}) {
                amount
            }
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

function populateProfile(data) {
    if (!data || !data.user || !data.user.length === 0) {
        console.error("No data available to populate profile.");
        return;
    }

    // All the data we need is now neatly organized inside the user object
    const user = data.user[0];

    // --- 1. Basic Info ---
    const firstname=user.firstName;
    const lastname=user.lastName;
    const fullname=`${firstname+lastname}`
    const email =user.email;
    const initialOne=firstname[0]
    const initialTwo=lastname[0]
    const initial= `${initialOne} ${initialTwo}`
    document.getElementById('profile-initials').textContent=initial
    document.getElementById('info-username').textContent = user.login;
    document.getElementById('info-userid').textContent = email;
    document.getElementById('info-fullname').textContent = fullname;

    


    // --- 2. Total XP ---
    // Access the pre-calculated sum directly from the query result.
    const totalXP = user.xpTotal.aggregate.sum.amount;
    document.getElementById('info-total-xp').textContent = `${Math.round(totalXP / 1000)} kb`;
    
    // --- 3. Audit Info ---
    const auditsDone = user.audits_done.aggregate.count;
    const auditsReceived = user.audits_received.aggregate.count;
    document.getElementById('info-audits-done').textContent = auditsDone;
    document.getElementById('info-audits-received').textContent = auditsReceived;

    // --- 4. Call Graph Functions (with correct data) ---
    // Pass the list of XP transactions for the line graph
    generateXpOverTimeGraph(user.xpForGraph); 

    // Pass the list of project results for the other graph
    generateAuditRatioGraph(user.auditsDoneData, user.auditsReceivedData);
}
// Replace your entire generateXpOverTimeGraph function with this one.
function generateXpOverTimeGraph(transactions) {
    const graphDiv = document.getElementById('xp-over-time-graph');
    graphDiv.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        graphDiv.innerHTML = "<p>No XP transaction data to display.</p>";
        return;
    }

    // Sort transactions by date first
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let cumulativeXP = 0;
    const dataPoints = sortedTransactions.map(tx => {
        cumulativeXP += tx.amount;
        return {
            date: new Date(tx.createdAt),
            xp: cumulativeXP
        };
    });

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 60, left: 80 }; // Increased margins
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '400px');

    const chartGroup = document.createElementNS(svgNS, 'g');
    chartGroup.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
    svg.appendChild(chartGroup);
    
    // Get data ranges
    const firstDate = dataPoints[0].date;
    const lastDate = dataPoints[dataPoints.length - 1].date;
    const maxXp = Math.max(...dataPoints.map(p => p.xp));
    const minXp = Math.min(...dataPoints.map(p => p.xp));

    // Create better tick calculation for Y-axis
    function calculateNiceTicks(minValue, maxValue, targetTickCount = 5) {
        const range = maxValue - minValue;
        if (range === 0) return { ticks: [minValue], niceMin: minValue, niceMax: maxValue };
        
        const roughStep = range / (targetTickCount - 1);
        const stepMagnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const normalizedStep = roughStep / stepMagnitude;
        
        let step;
        if (normalizedStep < 1.5) step = stepMagnitude;
        else if (normalizedStep < 3) step = 2 * stepMagnitude;
        else if (normalizedStep < 7) step = 5 * stepMagnitude;
        else step = 10 * stepMagnitude;
        
        const niceMin = Math.floor(minValue / step) * step;
        const niceMax = Math.ceil(maxValue / step) * step;
        
        const ticks = [];
        for (let tick = niceMin; tick <= niceMax; tick += step) {
            ticks.push(Math.round(tick));
        }
        
        return { ticks, niceMin, niceMax };
    }

    const yAxisInfo = calculateNiceTicks(0, maxXp); // Start from 0 for XP
    const niceMaxY = yAxisInfo.niceMax;
    const niceMinY = yAxisInfo.niceMin;

    // Create scale functions
    const xScale = (date) => {
        if (lastDate.getTime() === firstDate.getTime()) return 0;
        return ((date - firstDate) / (lastDate - firstDate)) * chartWidth;
    };

    const yScale = (xp) => {
        return chartHeight - ((xp - niceMinY) / (niceMaxY - niceMinY)) * chartHeight;
    };

    // Draw grid lines first (so they appear behind the data)
    const gridGroup = document.createElementNS(svgNS, 'g');
    gridGroup.setAttribute('class', 'grid');
    
    // Y-axis grid lines
    yAxisInfo.ticks.forEach(tickValue => {
        const y = yScale(tickValue);
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', 0);
        line.setAttribute('x2', chartWidth);
        line.setAttribute('y1', y);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#e0e0e0');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '2,2');
        gridGroup.appendChild(line);
    });

    // X-axis grid lines
    const numXTicks = 6;
    for (let i = 0; i <= numXTicks; i++) {
        const portion = i / numXTicks;
        const timeValue = firstDate.getTime() + (lastDate.getTime() - firstDate.getTime()) * portion;
        const dateValue = new Date(timeValue);
        const x = xScale(dateValue);
        
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', x);
        line.setAttribute('x2', x);
        line.setAttribute('y1', 0);
        line.setAttribute('y2', chartHeight);
        line.setAttribute('stroke', '#e0e0e0');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '2,2');
        gridGroup.appendChild(line);
    }
    
    chartGroup.appendChild(gridGroup);

    // Draw the main line
    const pathData = "M" + dataPoints.map(p => `${xScale(p.date)},${yScale(p.xp)}`).join(" L ");
    
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#007bff');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    chartGroup.appendChild(path);

    // Add data points
    dataPoints.forEach((p, index) => {
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', xScale(p.date));
        circle.setAttribute('cy', yScale(p.xp));
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', '#007bff');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        
        // Add hover effect
        circle.addEventListener('mouseenter', function() {
            this.setAttribute('r', '6');
            this.setAttribute('fill', '#0056b3');
        });
        
        circle.addEventListener('mouseleave', function() {
            this.setAttribute('r', '4');
            this.setAttribute('fill', '#007bff');
        });
        
        chartGroup.appendChild(circle);
    });

    // Create Y-axis
    const yAxis = document.createElementNS(svgNS, 'g');
    yAxis.setAttribute('class', 'y-axis');

    // Y-axis line
    const yAxisLine = document.createElementNS(svgNS, 'line');
    yAxisLine.setAttribute('x1', 0);
    yAxisLine.setAttribute('x2', 0);
    yAxisLine.setAttribute('y1', 0);
    yAxisLine.setAttribute('y2', chartHeight);
    yAxisLine.setAttribute('stroke', '#333');
    yAxisLine.setAttribute('stroke-width', '1');
    yAxis.appendChild(yAxisLine);

    // Y-axis labels
    yAxisInfo.ticks.forEach(tickValue => {
        const y = yScale(tickValue);

        // Tick mark
        const tick = document.createElementNS(svgNS, 'line');
        tick.setAttribute('x1', -5);
        tick.setAttribute('x2', 0);
        tick.setAttribute('y1', y);
        tick.setAttribute('y2', y);
        tick.setAttribute('stroke', '#333');
        tick.setAttribute('stroke-width', '1');
        yAxis.appendChild(tick);

        // Label
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', -10);
        text.setAttribute('y', y + 4);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('fill', '#333');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', 'Arial, sans-serif');
        
        // Format the number properly
        let formattedValue;
        if (tickValue >= 1000000) {
            formattedValue = (tickValue / 1000000).toFixed(1) + 'M';
        } else if (tickValue >= 1000) {
            formattedValue = (tickValue / 1000).toFixed(1) + 'k';
        } else {
            formattedValue = tickValue.toString();
        }
        
        text.textContent = formattedValue;
        yAxis.appendChild(text);
    });

    chartGroup.appendChild(yAxis);
    
    // Create X-axis
    const xAxis = document.createElementNS(svgNS, 'g');
    xAxis.setAttribute('transform', `translate(0, ${chartHeight})`);
    
    // X-axis line
    const xAxisLine = document.createElementNS(svgNS, 'line');
    xAxisLine.setAttribute('x1', 0);
    xAxisLine.setAttribute('x2', chartWidth);
    xAxisLine.setAttribute('y1', 0);
    xAxisLine.setAttribute('y2', 0);
    xAxisLine.setAttribute('stroke', '#333');
    xAxisLine.setAttribute('stroke-width', '1');
    xAxis.appendChild(xAxisLine);
    
    // X-axis labels
    for (let i = 0; i <= numXTicks; i++) {
        const portion = i / numXTicks;
        const timeValue = firstDate.getTime() + (lastDate.getTime() - firstDate.getTime()) * portion;
        const dateValue = new Date(timeValue);
        const x = xScale(dateValue);

        // Tick mark
        const tick = document.createElementNS(svgNS, 'line');
        tick.setAttribute('x1', x);
        tick.setAttribute('x2', x);
        tick.setAttribute('y1', 0);
        tick.setAttribute('y2', 5);
        tick.setAttribute('stroke', '#333');
        tick.setAttribute('stroke-width', '1');
        xAxis.appendChild(tick);

        // Label
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', 20);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#333');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', 'Arial, sans-serif');
        
        // Format date based on time span
        const timeSpan = lastDate.getTime() - firstDate.getTime();
        const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
        
        let formattedDate;
        if (daysSpan > 365) {
            formattedDate = dateValue.toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
            });
        } else if (daysSpan > 30) {
            formattedDate = dateValue.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        } else {
            formattedDate = dateValue.toLocaleDateString('en-US', { 
                month: 'numeric', 
                day: 'numeric' 
            });
        }
        
        text.textContent = formattedDate;
        xAxis.appendChild(text);
    }

    chartGroup.appendChild(xAxis);

    // Add axis labels
    const xLabel = document.createElementNS(svgNS, 'text');
    xLabel.setAttribute('x', chartWidth / 2);
    xLabel.setAttribute('y', height - 10);
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('fill', '#333');
    xLabel.setAttribute('font-size', '14');
    xLabel.setAttribute('font-family', 'Arial, sans-serif');
    xLabel.setAttribute('font-weight', 'bold');
    xLabel.textContent = 'Date';
    svg.appendChild(xLabel);

    const yLabel = document.createElementNS(svgNS, 'text');
    yLabel.setAttribute('x', -chartHeight / 2);
    yLabel.setAttribute('y', 20);
    yLabel.setAttribute('text-anchor', 'middle');
    yLabel.setAttribute('fill', '#333');
    yLabel.setAttribute('font-size', '14');
    yLabel.setAttribute('font-family', 'Arial, sans-serif');
    yLabel.setAttribute('font-weight', 'bold');
    yLabel.setAttribute('transform', `rotate(-90, 20, ${chartHeight / 2})`);
    yLabel.textContent = 'XP Amount';
    svg.appendChild(yLabel);
    
    // Add the chart to the page
    graphDiv.appendChild(svg);
}
// Replace the old placeholder function in app.js// ADD THIS ENTIRE NEW FUNCTION
function generateAuditRatioGraph(auditsDoneData, auditsReceivedData) {
    const graphDiv = document.getElementById('project-ratio-graph'); // We'll reuse this div
    graphDiv.innerHTML = ''; // Clear previous content

    // 1. Calculate totals
    const totalDone = auditsDoneData.reduce((sum, tx) => sum + tx.amount, 0);
    const totalReceived = auditsReceivedData.reduce((sum, tx) => sum + tx.amount, 0);

    // Format to MB for display
    const doneMB = (totalDone / 1000000).toFixed(2);
    const receivedMB = (totalReceived / 1000000).toFixed(2);
    
    // Calculate the audit ratio
    const ratio = (totalDone / totalReceived).toFixed(2);

    const data = [
        { label: 'Audits Done', value: doneMB, color: '#28a745' },      // Green
        { label: 'Audits Received', value: receivedMB, color: '#007bff' }  // Blue
    ];

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    const width = 400;
    const height = 300;
    const margin = { top: 40, right: 20, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '300px');

    const chartGroup = document.createElementNS(svgNS, 'g');
    chartGroup.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
    svg.appendChild(chartGroup);

    // 2. Create Scales
    const maxValue = Math.max(...data.map(d => d.value));
    const yScale = (value) => chartHeight - (value / maxValue) * chartHeight;
    const barWidth = chartWidth / data.length / 2; // Make bars slimmer

    // 3. Create Bars
    data.forEach((d, i) => {
        const barX = (i * (chartWidth / data.length)) + (chartWidth / data.length - barWidth) / 2;
        
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', barX);
        rect.setAttribute('y', yScale(d.value));
        rect.setAttribute('width', barWidth);
        rect.setAttribute('height', chartHeight - yScale(d.value));
        rect.setAttribute('fill', d.color);
        chartGroup.appendChild(rect);

        // Add value label on top of the bar
        const valueText = document.createElementNS(svgNS, 'text');
        valueText.setAttribute('x', barX + barWidth / 2);
        valueText.setAttribute('y', yScale(d.value) - 5);
        valueText.setAttribute('text-anchor', 'middle');
        valueText.setAttribute('font-size', '12');
        valueText.setAttribute('fill', '#333');
        valueText.textContent = `${d.value} MB`;
        chartGroup.appendChild(valueText);
        
        // Add category label below the bar
        const labelText = document.createElementNS(svgNS, 'text');
        labelText.setAttribute('x', barX + barWidth / 2);
        labelText.setAttribute('y', chartHeight + 20);
        labelText.setAttribute('text-anchor', 'middle');
        labelText.setAttribute('font-size', '12');
        labelText.setAttribute('fill', '#555');
        labelText.textContent = d.label;
        chartGroup.appendChild(labelText);
    });

    // 4. Create Y-Axis
    const yAxis = document.createElementNS(svgNS, 'g');
    const yAxisLine = document.createElementNS(svgNS, 'line');
    yAxisLine.setAttribute('x1', 0);
    yAxisLine.setAttribute('y1', 0);
    yAxisLine.setAttribute('x2', 0);
    yAxisLine.setAttribute('y2', chartHeight);
    yAxisLine.setAttribute('stroke', '#ccc');
    yAxis.appendChild(yAxisLine);
    chartGroup.appendChild(yAxis);

    // 5. Add a title for the whole chart and the ratio
    const titleText = document.createElementNS(svgNS, 'text');
    titleText.setAttribute('x', width / 2);
    titleText.setAttribute('y', 20); // Position at the top
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('font-size', '16');
    titleText.setAttribute('font-weight', 'bold');
    titleText.textContent = `Audit Ratio: ${ratio}`;
    svg.appendChild(titleText);
    
    graphDiv.appendChild(svg);
}