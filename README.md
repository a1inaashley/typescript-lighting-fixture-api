# Light Control API

This project is a **Light Control API** built using Node.js and Express. It provides a RESTful API for managing and controlling lights, including features like user authentication, rate limiting, and advanced light manipulation functionalities such as setting brightness, color, grouping, and scheduling actions.

## Features

- **User Authentication**: Basic Auth implementation for secure access.
- **Rate Limiting**: Middleware to limit requests and prevent abuse.
- **Light Management**: API to control individual lights, including turning on/off, adjusting brightness, and changing color.
- **Grouping**: Ability to create and manage groups of lights.
- **Scheduling**: Schedule on/off actions for specific lights.
- **State Persistence**: Save and load the current state of lights and groups.

## Getting Started

### Essential

Ensure you have the following installed:

- Node.js (v14 or above)
- npm (v6 or above)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [Joi](https://www.npmjs.com/package/joi)

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/a1inaashley/typescript-lighting-fixture-api.git
    cd light-control-api
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory to configure environment variables:
    ```plaintext
    PORT=3000
    BASIC_AUTH_USER=yourUsername
    BASIC_AUTH_PASSWORD=yourPassword
    LOGIN_REQUIRED=true
    ```

4. Start the server:
    ```bash
    npm start
    ```

### Usage

#### Endpoints

- **Login**

  `POST /login`

  Handles user login. If `LOGIN_REQUIRED` is set to `false` in the environment, the `endpoint` will return a success message without requiring credentials.

  Request Body:
  ```json
  {
    "username": "yourUsername",
    "password": "yourPassword"
  }

## API Endpoints

### Get All Lights

- **Endpoint:** `GET /lights`
- **Description:** Returns a list of all lights.
  ```json 
  [
    { "id": 1, "name": "Living Room Light", "status": "off" },
    { "id": 2, "name": "Kitchen Light", "status": "on" }
  ]
  
### Get Light Details

- **Endpoint:** `GET /lights/:id`
- **Description:** Returns details of a `specific` light by its `ID`.
- **Path Parameters:**
  - `id` (number): The `ID` of the light.
  ```json
  {
    "id": 1,
    "name": "Random Fixture",
    "status": "off",
    "brightness": 70,
    "color": "white"
  }
### Turn On Light

- **Endpoint:** `POST /lights/:id/on`
- **Description:** Turns on the specified light by its `ID`.
- **Path Parameters:**
  - `id` (number): The ID of the light.
  ```json
  {
    "id": 1,
    "status": "on"
  }
### Turn Off Light

- **Endpoint:** `POST /lights/:id/off`
- **Description:** Turns off the specified light by its `ID`.
- **Path Parameters:**
  - `id` (number): The `ID` of the light.
  ```json
  {
    "id": 1,
    "status": "off"
  }
  ```
### Set Brightness

- **Endpoint:** `POST /lights/:id/brightness`
- **Description:** Sets the brightness of the specified light by its `ID`.
- **Path Parameters:**
  - `id` (number): The `ID` of the light.
- **Request Body:**
 - ```brightness (number):``` The desired brightness level (0-100).
   ```json
   {
     "brightness": 75
   }
- **Response Body**
   ```json
   {
     "id": 1,
     "brightness": 75
   }
 ## Error Handling

All errors are returned with an appropriate ```HTTP``` status code and a ```JSON``` object containing an error message.

- ```400 Bad Request:``` Invalid input parameters.
- ```401 Unauthorized:``` Missing or incorrect authentication credentials.
- ```404 Not Found:``` The requested resource does not exist.
- ```500 Internal Server Error:``` A server-side error occurred.

### Security Considerations
- ```Environment Variables:``` Sensitive data like ```BASIC_AUTH_USER``` and ```BASIC_AUTH_PASSWORD``` should be kept secure and not hardcoded in the application.
- ```Rate Limiting:``` Helps protect the ```API``` from abuse by limiting the number of requests from a single IP.

### Logging
```Errors``` and ```important``` events are logged to the console. Consider integrating a logging service for production environments.

### License
This project is licensed under the [MIT LICENSE](https://github.com/a1inaashley/typescript-lighting-fixture-api/blob/main/LICENSE)

