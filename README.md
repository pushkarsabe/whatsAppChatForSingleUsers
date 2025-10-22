Group Chat App

This is a real-time group chat application built with Node.js, Express, Sequelize, and Socket.io. It allows users to sign up, log in, create groups, chat with other users in real-time, and more.
live url:https://group-chat-app-qxzo.onrender.com/login.html
Features

    User Authentication: Secure user signup and login with password hashing (bcrypt) and JWT for authentication.

    Real-time Chat: Real-time messaging within groups using Socket.io.

    Group Management:

        Users can create new groups and add other users to them.

        Group admins can add or remove members from the group.

        Group admins can promote other members to admin status.

        Group admins can delete groups.

    One-on-One Chat: Users can start private conversations with other users.

    File Sharing: Users can share photos and videos in chats, which are uploaded to Cloudinary.

    Chat Archiving: A cron job runs daily to archive old chats, keeping the main chat history clean and performant.

Technologies Used

    Backend:

        Node.js

        Express.js

        Sequelize (MySQL)

        Socket.io for real-time communication

        JWT (JSON Web Tokens) for authentication

        Bcrypt for password hashing

        Cloudinary for file storage

        Cron for scheduled tasks

    Frontend:

        HTML5

        CSS3

        JavaScript (ES6+)

        Axios for API requests

Project Structure

The project is organized into the following main directories:

    controller/: Contains the logic for handling incoming requests.

    model/: Defines the Sequelize models for the database tables (User, Chat, Group, etc.).

    routes/: Defines the API endpoints for different features.

    public/: Contains the frontend files (HTML, CSS, JavaScript).

    middleware/: Contains the authentication middleware.

    util/: Contains the database connection configuration.

    services/: Contains services like the chat archiving service.

Setup and Installation

    Clone the repository:
    Bash

git clone https://github.com/pushkarsabe/group-chat-app.git
cd group-chat-app

Install dependencies:
Bash

npm install

Set up the database:

    Make sure you have MySQL installed and running.

    Create a new database.

    Update the database credentials in config/config.json and util/database.js.

Create a .env file in the root directory and add your environment variables:

DB_SCHEMA=<your_database_name>
DB_USER=<your_database_user>
DB_PASSWORD=<your_database_password>
DB_HOST=<your_database_host>
PORT=3000

Run database migrations:
Bash

npx sequelize-cli db:migrate

Start the server:
Bash

    npm start

    Open the application:
    Open the public/signup.html file in your web browser to get started.

API Endpoints

    User Routes (/user):

        POST /signup: Register a new user.

        POST /login: Log in an existing user.

        GET /user-data: Get all user data.

    Chat Routes (/chat):

        POST /add-chat: Send a new chat message.

        GET /get-chat: Get chats for a specific group.

    Group Routes (/groups):

        POST /save-data: Create a new group.

        GET /get-data: Get all groups for the logged-in user.

        POST /delete-data: Remove a member from a group.

        POST /update-data: Add a member to a group.

    Admin Routes (/admin):

        POST /save-admin: Create a new admin for a group.

        GET /get-admin: Get admins for a group.

        POST /add-admin: Promote a user to admin.

