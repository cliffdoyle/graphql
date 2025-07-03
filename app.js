

//Check which page we are on 
if (document.getElementById('login-form')) {
    //we are on the login page
    handleLoginPage();
}else if (document.querySelector('header h1').textContent === 'My Profile'){
    //We are on the profile page
    handleProfilePage();
}

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

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', ()=>{
        //Clear the token from storage
        sessionStorage.removeItem('jwt');
        //Redirect to the login page
        window.location.href = 'index.html'
    })
    console.log("Welcome to your profile! Fetching data...");

    //Define first query


const eventId = 75;

const dataQuery = `
query GetModuleData {
    user {
        id
        login
    }
    transaction(
        where: {
             originEventId: { _eq: ${75} } 
        },
        order_by: { createdAt: asc }
    ) {
        amount
        createdAt
        path
    }
    audits_done: transaction_aggregate(where: { type: { _eq: "up" } }) {
        aggregate {
            count
        }
    }
    audits_received: transaction_aggregate(where: { type: { _eq: "down" } }) {
        aggregate {
            count
        }
    }
    # Let's make the result query tight as well
    result(
        where: {
            type: { _eq: "project" },
            eventId: { _eq: ${eventId} } # Filtering projects by the same eventId
        }
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
// Replace the old placeholder function in app.js
function generateProjectRatioGraph(results) {
    const graphDiv = document.getElementById('project-ratio-graph');
    graphDiv.innerHTML = ''; // Clear the placeholder

    // 1. Process the data
    let passed = 0;
    let failed = 0;
    results.forEach(result => {
        if (result.grade >= 1) {
            passed++;
        } else {
            failed++;
        }
    });
    const total = passed + failed;
    if (total === 0) {
        graphDiv.innerHTML = "<p>No project data available.</p>";
        return;
    }

    const passPercentage = (passed / total);
    const failPercentage = (failed / total);

    // 2. Setup SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    const width = 300;
    const height = 300;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    const cx = width / 2; // center x
    const cy = height / 2; // center y
    const radius = Math.min(width, height) / 2 * 0.8; // 80% of half the container size
    let startAngle = -90; // Start at the top

    // 3. Create Pie Slices (the interesting part)
    function createSlice(percentage, color) {
        const endAngle = startAngle + percentage * 360;

        // Convert angles to radians for sin/cos
        const start = (a) => a * Math.PI / 180;
        const x1 = cx + radius * Math.cos(start(startAngle));
        const y1 = cy + radius * Math.sin(start(startAngle));
        const x2 = cx + radius * Math.cos(start(endAngle));
        const y2 = cy + radius * Math.sin(start(endAngle));

        // This string is the 'd' attribute for the <path> element
        // It's a command to the SVG renderer:
        // M = Move to (starting point)
        // L = Line to (the center)
        // A = Arc to (the outer edge of the slice)
        // Z = Close path
        const largeArcFlag = percentage > 0.5 ? 1 : 0;
        const d = `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag} 1 ${x2},${y2} Z`;

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', color);
        svg.appendChild(path);

        // Move the startAngle for the next slice
        startAngle = endAngle;
    }

    createSlice(passPercentage, '#28a745'); // Green for pass
    createSlice(failPercentage, '#dc3545'); // Red for fail

    // 4. Add a legend
    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.justifyContent = 'center';
    legend.style.marginTop = '10px';
    legend.innerHTML = `
        <div style="margin-right: 20px;">
            <span style="display:inline-block; width:10px; height:10px; background-color:#28a745; border-radius: 50%;"></span>
            Passed: ${passed} (${(passPercentage * 100).toFixed(1)}%)
        </div>
        <div>
            <span style="display:inline-block; width:10px; height:10px; background-color:#dc3545; border-radius: 50%;"></span>
            Failed: ${failed} (${(failPercentage * 100).toFixed(1)}%)
        </div>
    `;

    graphDiv.appendChild(svg);
    graphDiv.appendChild(legend);
}