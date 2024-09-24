# API Overview

# Table of Contents

- [API Overview](#api-overview)
- [Table of Contents](#table-of-contents)
  - [Intorduction](#intorduction)
  - [Endpoints](#endpoints)
    - [Post Endpoints](#post-endpoints)
    - [Categories Endpoints](#categories-endpoints)
    - [Users Endpoints](#users-endpoints)
  - [Endpoint Details](#endpoint-details)
    - [Post Endpoints](#post-endpoints-1)
    - [1. **POST** `/api/v1/posts/create`](#1-post-apiv1postscreate)
    - [2. **GET** `/api/v1/posts`](#2-get-apiv1posts)
    - [3. **GET** `/api/v1/posts/{id}`](#3-get-apiv1postsid)
    - [4. **PUT** `/api/v1/posts/{id}`](#4-put-apiv1postsid)
    - [5. **DELETE** `/api/v1/posts/{id}`](#5-delete-apiv1postsid)
    - [Categories Endpoints](#categories-endpoints-1)
    - [1. **POST** `/api/v1/categories/create`](#1-post-apiv1categoriescreate)
    - [2. **GET** `/api/v1/categories`](#2-get-apiv1categories)
    - [3. **GET** `/api/v1/categories/{id}`](#3-get-apiv1categoriesid)
    - [4. **PUT** `/api/v1/categories/{id}`](#4-put-apiv1categoriesid)
    - [5. **DELETE** `/api/v1/categories/{id}`](#5-delete-apiv1categoriesid)
    - [Users Endpoints](#users-endpoints-1)
    - [1. **POST** `/api/v1/user/register`](#1-post-apiv1userregister)
    - [2. **POST** `/api/v1/user/login`](#2-post-apiv1userlogin)

## Intorduction

This document describes the API for the **BlogMe** application. The API is a RESTful web service that uses JSON as its data format. The API is designed to be easy to use and to provide a simple interface for developers to interact with the application.

## Endpoints

### Post Endpoints

| Method | Endpoint               | Description                       | Authentication |
| ------ | ---------------------- | --------------------------------- | -------------- |
| POST   | `/api/v1/posts/create` | Create a new post                 | AUTHENTICATED  |
| GET    | `/api/v1/posts`        | Get all posts                     | No             |
| GET    | `/api/v1/posts/{id}`   | Get a specific post by post ID    | No             |
| PUT    | `/api/v1/posts/{id}`   | Update a specific post by post ID | AUTHENTICATED  |
| DELETE | `/api/v1/posts/{id}`   | Delete a specific post by post ID | AUTHENTICATED  |

### Categories Endpoints

| Method | Endpoint                    | Description                               | Authentication |
| ------ | --------------------------- | ----------------------------------------- | -------------- |
| POST   | `/api/v1/categories/create` | Create a new category                     | AUTHENTICATED  |
| GET    | `/api/v1/categories`        | Get all categories                        | No             |
| GET    | `/api/v1/categories/{id}`   | Get a specific category by category ID    | No             |
| PUT    | `/api/v1/categories/{id}`   | Update a specific category by category ID | AUTHENTICATED  |
| DELETE | `/api/v1/categories/{id}`   | Delete a specific category by category ID | AUTHENTICATED  |

### Users Endpoints

| Method | Endpoint                | Description       | Authentication |
| ------ | ----------------------- | ----------------- | -------------- |
| POST   | `/api/v1/user/register` | Create a new user | No             |
| POST   | `/api/v1/user/login`    | Login a user      | No             |

## Endpoint Details

### Post Endpoints

#### 1. **POST** `/api/v1/posts/create`

- **Description**: Create a new post

- **Request Body**: FormData

  - `image`: The image file to be uploaded.
  - `content`: The content of the post in HTML format.
  - `category`: The category of the post.

- **Response**: `null`
- _Status Code_: `201`: Created

#### 2. **GET** `/api/v1/posts`

- **Description**: Get all posts
- **Request Body**: `null`
- **Response**:

  - `posts`: An array of post objects.

- _Status Code_: `200`: OK

#### 3. **GET** `/api/v1/posts/{id}`

- **Description**: Get a specific post by post ID
- **Request Body**: `null`
- **Response**:
  - `post`: The post object.
- _Status Code_: `200`: OK

#### 4. **PUT** `/api/v1/posts/{id}`

- **Description**: Update a specific post by post ID
- **Request Body**:
  ```json
  {
    "title": "New Title",
    "content": "New Content"
  }
  ```
- **Response**: `null`
- _Status Code_: `200`: OK

#### 5. **DELETE** `/api/v1/posts/{id}`

- **Description**: Delete a specific post by post ID
- **Request Body**: `null`
- **Response**: `null`
- _Status Code_: `204`: No Content

### Categories Endpoints

#### 1. **POST** `/api/v1/categories/create`

- **Description**: Create a new category
- **Request Body**:
  ```json
  {
    "categoryName": "Category Name"
  }
  ```
- **Response**: `null`
- _Status Code_: `201`: Created

#### 2. **GET** `/api/v1/categories`

- **Description**: Get all categories
- **Request Body**: `null`
- **Response**:
  - `categories`: An array of category objects.
- _Status Code_: `200`: OK

#### 3. **GET** `/api/v1/categories/{id}`

- **Description**: Get a specific category by category ID
- **Request Body**: `null`
- **Response**:
  - `category`: The category object.
- _Status Code_: `200`: OK

#### 4. **PUT** `/api/v1/categories/{id}`

- **Description**: Update a specific category by category ID
- **Request Body**:

  ```json
  {
    "title": "New Category Name",
    "content": "New Category Description"
  }
  ```

- **Response**: `null`
- _Status Code_: `200`: OK

#### 5. **DELETE** `/api/v1/categories/{id}`

- **Description**: Delete a specific category by category ID
- **Request Body**: `null`
- **Response**: `null`
- _Status Code_: `204`: No Content

### Users Endpoints

#### 1. **POST** `/api/v1/user/register`

- **Description**: Create a new user
- **Request Body**:

  ```json
  {
    "username": "username",
    "email": "email",
    "password": "password",
    "role": "role"
  }
  ```

- **Response**: `null`
- _Status Code_: `201`: Created

#### 2. **POST** `/api/v1/user/login`

- **Description**: Login a user
- **Request Body**:

  ```json
  {
    "email": "email",
    "password": "password"
  }
  ```

- **Response**:
- _Status Code_: `200`: OK
- _Status Code_: `401`: Unauthorized
