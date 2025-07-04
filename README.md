# GraphQL User Profile Dashboard

A dynamic, single-page web application that provides a personalized dashboard for Zone01 Kisumu students. This project leverages GraphQL to fetch user data and visualizes it using interactive SVG graphs, all built with vanilla JavaScript.
 About The Project

The primary objective of this project was to learn and master the GraphQL query language by building a real-world application. The dashboard authenticates a user against the Zone01 school platform, fetches their specific data via a GraphQL endpoint, and displays it in a clean, intuitive, and visually appealing user interface.

This project was built from the ground up, with a focus on writing efficient queries and dynamically generating all UI components and data visualizations without relying on any external front-end frameworks or graphing libraries.
## ✨ Features

- **Secure JWT Authentication**: A dedicated login page that authenticates users via Basic Auth and retrieves a JSON Web Token (JWT) for secure API communication.

- **Dynamic Data Display**: The profile page is dynamically populated with user-specific information, including:
  - **Full Name**, **Username**, and **User ID**
  - **Total Experience Points (XP)**, formatted into KB/MB
  - **Audit statistics**: audits done vs. audits received

- **Custom SVG Graphs**: Two distinct statistical graphs are generated dynamically using vanilla JavaScript and SVG to visualize user progress:
  - **XP Progress Over Time**: A cumulative line graph showing the student's XP growth since the beginning
  - **Project Success Rate**: A pie chart illustrating the ratio of passed vs. failed projects

- **Efficient GraphQL Queries**: Utilizes a single, optimized GraphQL query to fetch all necessary data in one network request, making use of aliases and aggregates for performance.

- **Clean, Responsive UI**: A modern and fully responsive design that provides a great user experience on both desktop and mobile devices.

- **Logout Functionality**: Securely logs the user out by clearing the session token and redirecting to the login page.

### 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **API**: GraphQL
- **Authentication**: JWT (JSON Web Tokens)
- **Data Visualization**: SVG (Scalable Vector Graphics) generated via the DOM


## 🚀 Core Concepts Learned

This project provided hands-on experience with:

- **GraphQL**: Writing complex queries, including nested queries, using arguments for filtering, and leveraging aliases and aggregates (sum, count) for data efficiency.

- **JWT & Authentication**: Implementing a full authentication flow from credential submission to storing and using a Bearer token.

- **API Integration**: Interacting with a live API endpoint, handling responses, and managing potential errors.

- **DOM Manipulation**: Dynamically creating and manipulating complex UI elements, especially for generating SVG graphs from scratch.

- **UI/UX Principles**: Designing a user-friendly interface that is both functional and aesthetically pleasing.

- **Web Hosting**: Preparing and deploying a static web application.


## ⚙️ Getting Started

To run this project locally, you will need a web browser and a Zone01 Kisumu student account.
Installation & Setup

    Clone the repository:

          
    git clone https://learn.zone01kisumu.ke/git/clomollo/graphql.git

        

Navigate to the project directory:


      
cd graphql

    

Run with a live server:
The easiest way to run the project is with a simple live server. If you have Node.js installed, you can use npx.
Generated sh

      
npx live-server


    This will start a local server and open the index.html (login page) in your default browser.

    Alternatively, you can use any local web server or simply open the index.html file directly in your browser.

    Login:
    Use your Zone01 username/email and password to log in and view your profile.

🔗 Live Demo

You can view the live hosted version of this project here:
[My Zone01 Profile](https://graphql-tawny-eta.vercel.app/index.html)
## 🧠 GraphQL Implementation Details

A key requirement of this project was to efficiently query the GraphQL endpoint. Instead of making multiple requests, a single, comprehensive query was designed to fetch all data needed for the dashboard.

### 🔍 Key Features of the GraphQL Query

- **Aliases**: Used to rename aggregated fields like `xpTotal` for clarity.

- **Aggregates**: The `transactions_aggregate` function was used with `sum` and `count` to have the database perform calculations for Total XP and Audit counts, which is significantly more performant than fetching all transactions and calculating on the client side.

- **Filtering with Arguments**: The `where` clause was used extensively to filter transactions and results by `type` and `eventId`, ensuring only relevant data was returned.


This approach demonstrates a strong understanding of GraphQL principles, leading to a faster and more efficient application.