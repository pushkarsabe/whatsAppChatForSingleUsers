Group Chat App

This is a real-time group chat application built with Node.js, Express, Sequelize, and Socket.io. It allows users to sign up, log in, manage chat connections, and exchange messages in real-time.

Features

    User Authentication: Secure user signup and login using JWT (JSON Web Tokens) for session management and bcrypt for password hashing.

    Real-time Chat: Real-time messaging within groups achieved using Socket.io.

    One-on-One Chat (Friend Request Flow):

        Users initiate a new chat, which creates a PENDING group status in the database.

        Receiving users get a notification to Accept or Reject the pending request.

        Chat is only possible if the request is Accepted (status becomes ACTIVE).

    Group Membership: Groups manage members by storing User IDs as a JSON string in the groupMembers text column.

Technologies Used

    Backend: Node.js, Express.js, Sequelize (MySQL), Socket.io, JWT, Bcrypt, dotenv.

    Frontend: HTML5, CSS3, JavaScript (using Fetch API and Socket.io client).

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

    Create a .env file in the root directory and add your database and JWT secret configuration:

    DB_NAME=<your_database_name>
    DB_USER=<your_database_user>
    DB_PASSWORD=<your_database_password>
    DB_HOST=<your_database_host>
    PORT=3000
    JWT_SECRET=YOUR_SECRET_KEY

Run database migrations:

    This step is necessary to add the isPending column to your groups table.

Bash

npx sequelize-cli db:migrate --config ./config.js

Start the server:
Bash

    npm start

    Open the application: Open the public/signup.html file in your web browser to get started.

API Endpoints (Core Chat Functionality)

Route Category	HTTP Method	Endpoint	Description
User	GET	/user/user-data	Get a list of all registered users (for the Discover/New Chat modal).
Groups	GET	/groups/get-data	Get all active and pending chat groups (for the Sidebar List).
Groups	POST	/groups/create-one-on-one	Initiate a new 1-on-1 chat, setting the status to PENDING (Friend Request).
Groups	POST	/groups/accept-request	Accept a pending request, setting isPending = false (Activates chat).
Groups	POST	/groups/reject-request	Reject a pending request, deleting the group record.
Chat	POST	/chat/add-chat	Send a new message to an active group.
Chat	GET	/chat/get-chat	Get chat history for a specific groupId.
