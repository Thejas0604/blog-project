# BlogMe

## Description
This project is a comprehensive implementation of a blog system, developed to manage various blogging operations efficiently. The system focuses on robust backend architecture and effective data management, utilizing modern web technologies.
## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [API Endpoints](#api-endpoints)
4. [Technologies Used](#technologies-used)
5. [Features](#features)
<!-- 6. [Screenshots](#screenshots)
7. [Database Schema](#database-schema) -->

## Installation
1. Clone into your local file system. Make sure to have git install beforehand.

```
git clone https://github.com/yourusername/blog-project.git
```
2. Navigate to the backend directory and install the necessary Node.js modules. Make sure to have Node.js installed beforehand.
```
cd backend
npm install
```
3. Create a .env file in the backend directory and fill it with your environment variables.
```
DB_HOST = your_database_host
DB_USER = your_database_user
DB_PASS = your_database_password
DB_NAME = your_database_name
JWT_SECRET = your_jwt_secret
CLOUD_NAME = your_cloudinary_cloud_name
CLOUD_API_KEY = your_cloudinary_api_key
CLOUD_API_SECRET = your_cloudinary_api_secret
```
 4. Start the backend server using the following command:
```
npm run start
```
5. Navigate to the frontend directory and install the necessary Node.js modules.
```
cd frontend
npm install
```
  
6. Start the frontend development server using the following command:
```
npm run dev
```


## Usage
1. Start the backend server as described in the installation steps.
2. Start the frontend development server as described in the installation steps.
3. Access the application via ``http://localhost:5173`` in your web browser.

## API Endpoints

For detailed information about the API endpoints, please refer to the [API Overview](docs/api/overview.md) documentation.



## Technologies Used
- **Node.js**: JavaScript runtime for server-side development.
- **Express.js**: Web framework for Node.js.
- **MongoDB**: NoSQL database for storing blog data.
- **Mongoose**: ODM for MongoDB.
- **React.js**: JavaScript library for building user interfaces.
- **Cloudinary**: Cloud service for managing images.
- **Multer**: Middleware for handling multipart/form-data.
- **bcryptjs**: Library for hashing passwords.
- **jsonwebtoken**: Library for generating and verifying JWT tokens.
- **dotenv**: Module for loading environment variables.
- **passport**: Middleware for authentication.

## Features
- **User Authentication and Authorization**: Secure login, registration, and role-based access control.
- **Post Management**: Create, retrieve, update, and delete blog posts.
- **Image Upload and Management**: Upload and manage images using Cloudinary.
- **Responsive Design**: Mobile-friendly layout using Tailwind CSS.
- **Environment Configuration**: Securely manage environment variables with dotenv.
- **Middleware and Templating**: Use Express, body-parser, and cookie-parser for routing and views.


<!-- ## Screenshots
![image](https://github.com/Thejas0604/banking_system_G4/assets/109301978/ffc5c5be-8ec4-4dba-a0ce-35a0ac25bdee)
![image](https://github.com/Thejas0604/banking_system_G4/assets/109301978/d438004e-1296-4509-837f-050412a80acb) -->



<!-- ## Database Schema

![image](https://github.com/Thejas0604/banking_system_G4/assets/109301978/dcd89c23-7708-4676-bafa-baaec30e28e8) -->

