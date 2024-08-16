import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import Joi from 'joi';
import { LightService, LightColor } from './lightService';
import { ParamsDictionary } from 'express-serve-static-core';

dotenv.config();

interface EnvVars {
    PORT: number;
    BASIC_AUTH_USER: string;
    BASIC_AUTH_PASSWORD: string;
    LOGIN_REQUIRED: boolean; 
}

const envSchema = Joi.object({
    PORT: Joi.number().default(3000),
    BASIC_AUTH_USER: Joi.string().required(),
    BASIC_AUTH_PASSWORD: Joi.string().required(),
    LOGIN_REQUIRED: Joi.boolean().default(false)
}).unknown().required();

const { error, value: envVarsRaw } = envSchema.validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envVars = envVarsRaw as EnvVars;

const app = express();
app.use(express.json());

/**
 * @route POST /login
 * @description Handles user login. Checks if login is required based on the environment configuration.
 * @param {Request} req - The request object containing the login credentials.
 * @param {Response} res - The response object used to send the response to the client.
 * 
 * Request Body:
 * @param {string} req.body.username - The username for login.
 * @param {string} req.body.password - The password for login.
 * 
 * Responses:
 * @response 200 - Login is not required in this environment.
 * @response 200 - Login successful if credentials are correct.
 * @response 401 - Invalid credentials if the provided username or password is incorrect.
 */
app.post('/login', (req: Request, res: Response) => {
    // Check if login is required based on the environment variable
    if (!envVars.LOGIN_REQUIRED) {
        // If login is not required, return a success message
        return res.status(200).json({ message: 'Login is not required in this environment' });
    }

    // Extract username and password from the request body
    const { username, password } = req.body;
    
    // Validate credentials against environment variables
    if (username === envVars.BASIC_AUTH_USER && password === envVars.BASIC_AUTH_PASSWORD) {
        // If credentials are correct, return a success message
        return res.status(200).json({ message: 'Login successful' });
    }
    
    // If credentials are incorrect, return an unauthorized error
    res.status(401).json({ error: 'Invalid credentials' });
});

/**
 * Middleware to authenticate requests using Basic Auth.
 * 
 * @param req - The Express request object, containing headers, body, etc.
 * @param res - The Express response object, used to send back the desired HTTP response.
 * @param next - The Express next middleware function, used to pass control to the next handler.
 */
const auth = (req: Request, res: Response, next: NextFunction) => {
    if (!envVars.LOGIN_REQUIRED) {
        return next(); // Skip authentication if not required
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const [username, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    if (username === envVars.BASIC_AUTH_USER && password === envVars.BASIC_AUTH_PASSWORD) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};
app.use(auth);

/**
 * Middleware to limit the number of requests from a single IP address.
 * 
 * @param limit - The maximum number of requests allowed from a single IP address within the time frame.
 * @param message - The message to return when the rate limit is exceeded.
 * @returns Middleware function that tracks and limits requests based on the IP address.
 */
const rateLimit = (limit: number, message: string) => {
    const requests: { [ip: string]: number[] } = {};

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip ?? ''; // Ensure ip is always defined
        if (!requests[ip]) requests[ip] = [];

        requests[ip] = requests[ip].filter((timestamp: number) => Date.now() - timestamp < 15 * 60 * 1000);

        if (requests[ip].length >= limit) {
            return res.status(429).json({ message });
        }

        requests[ip].push(Date.now());
        next();
    };
};
app.use(rateLimit(100, 'Too many requests from this IP, please try again later.'));

const lightService = new LightService();

/**
 * Wrapper function to handle async route handlers.
 * 
 * @param fn - The async function to be wrapped and used as a route handler.
 * @returns A wrapped function that catches and forwards any errors to the error-handling middleware.
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
    (req: Request, res: Response, next: NextFunction) => 
        Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Middleware to validate the light ID parameter.
 * 
 * @param req - The Express request object, containing parameters, body, etc.
 * @param res - The Express response object, used to send back the desired HTTP response.
 * @param next - The Express next middleware function, used to pass control to the next handler.
 */
const validateId = (req: Request<ParamsDictionary>, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (isNaN(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid light ID' });
    }
    req.params.id = id.toString();  // Ensure it's stored as string
    next();
};

interface BrightnessRequest {
    brightness: number;
}

interface ColorRequest {
    color: LightColor;
}

interface GroupRequest {
    name: string;
    lightIds: number[];
}

interface ControlGroupRequest {
    action: 'on' | 'off';
}

interface ScheduleRequest {
    time: string;
    action: 'on' | 'off';
}

const brightnessSchema = Joi.object<BrightnessRequest>({
    brightness: Joi.number().min(0).max(100).required()
});

const colorSchema = Joi.object<ColorRequest>({
    color: Joi.string().valid('white', 'blue', 'red', 'green', 'yellow').required()
});

/**
 * Middleware to validate the brightness in the request body.
 * 
 * @param req - The Express request object, containing parameters, body, etc.
 * @param res - The Express response object, used to send back the desired HTTP response.
 * @param next - The Express next middleware function, used to pass control to the next handler.
 */
const validateBrightness = (req: Request<ParamsDictionary, {}, BrightnessRequest>, res: Response, next: NextFunction) => {
    const { error } = brightnessSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

/**
 * Middleware to validate the color in the request body.
 * 
 * @param req - The Express request object, containing parameters, body, etc.
 * @param res - The Express response object, used to send back the desired HTTP response.
 * @param next - The Express next middleware function, used to pass control to the next handler.
 */
const validateColor = (req: Request<ParamsDictionary, {}, ColorRequest>, res: Response, next: NextFunction) => {
    const { error } = colorSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

/**
 * Route to get a list of all lights.
 * 
 * @param req - The Express request object, not used in this route.
 * @param res - The Express response object, used to send back the list of lights.
 */
app.get('/lights', asyncHandler(async (req: Request, res: Response) => {
    const lights = await lightService.getAllLights();
    res.json(lights);
}));

/**
 * Route to get details of a specific light by its ID.
 * 
 * @param req - The Express request object, containing the light ID in the parameters.
 * @param res - The Express response object, used to send back the details of the light.
 */
app.get('/lights/:id', validateId, asyncHandler(async (req: Request<ParamsDictionary>, res: Response) => {
    const id = Number(req.params.id);
    const light = await lightService.getLight(id);
    if (!light) {
        return res.status(404).json({ error: `Light with ID ${id} not found` });
    }
    res.json(light);
}));

/**
 * Route to turn on a specific light by its ID.
 * 
 * @param req - The Express request object, containing the light ID in the parameters.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/lights/:id/on', validateId, asyncHandler(async (req: Request<ParamsDictionary>, res: Response) => {
    const id = Number(req.params.id);
    await lightService.turnOn(id);
    res.json({ message: `Light ${id} turned on` });
}));

/**
 * Route to turn off a specific light by its ID.
 * 
 * @param req - The Express request object, containing the light ID in the parameters.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/lights/:id/off', validateId, asyncHandler(async (req: Request<ParamsDictionary>, res: Response) => {
    const id = Number(req.params.id);
    await lightService.turnOff(id);
    res.json({ message: `Light ${id} turned off` });
}));

/**
 * Route to set the brightness of a specific light by its ID.
 * 
 * @param req - The Express request object, containing the light ID in the parameters and brightness in the body.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/lights/:id/brightness', validateId, validateBrightness, asyncHandler(async (req: Request<ParamsDictionary, {}, BrightnessRequest>, res: Response) => {
    const id = Number(req.params.id);
    const { brightness } = req.body;
    await lightService.setBrightness(id, brightness);
    res.json({ message: `Light ${id} brightness set to ${brightness}` });
}));

/**
 * Route to set the color of a specific light by its ID.
 * 
 * @param req - The Express request object, containing the light ID in the parameters and color in the body.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/lights/:id/color', validateId, validateColor, asyncHandler(async (req: Request<ParamsDictionary, {}, ColorRequest>, res: Response) => {
    const id = Number(req.params.id);
    const { color } = req.body;
    await lightService.setColor(id, color);
    res.json({ message: `Light ${id} color changed to ${color}` });
}));

/**
 * Route to create a group of lights.
 * 
 * @param req - The Express request object, containing the group name and light IDs in the body.
 * @param res - The Express response object, used to send back a confirmation message with the group ID.
 */
app.post('/groups', asyncHandler(async (req: Request<ParamsDictionary, {}, GroupRequest>, res: Response) => {
    const { name, lightIds } = req.body;
    if (!Array.isArray(lightIds) || typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid input for group creation' });
    }
    const groupId = await lightService.createGroup(name, lightIds);
    res.json({ message: `Group "${name}" created with ID ${groupId}` });
}));

/**
 * Route to control a group of lights by its ID (turn on/off).
 * 
 * @param req - The Express request object, containing the group ID in the parameters and action in the body.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/groups/:id/control', validateId, asyncHandler(async (req: Request<ParamsDictionary, {}, ControlGroupRequest>, res: Response) => {
    const id = Number(req.params.id);
    const { action } = req.body;
    if (action !== 'on' && action !== 'off') {
        return res.status(400).json({ error: 'Action must be "on" or "off"' });
    }
    await lightService.controlGroup(id, action);
    res.json({ message: `Group ${id} turned ${action}` });
}));

/**
 * Route to schedule an action (turn on/off) for a specific light by its ID.
 * 
 * @param req - The Express request object, containing the light ID in the parameters and schedule details in the body.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/lights/:id/schedule', validateId, asyncHandler(async (req: Request<ParamsDictionary, {}, ScheduleRequest>, res: Response) => {
    const id = Number(req.params.id);
    const { time, action } = req.body;
    if (typeof time !== 'string' || (action !== 'on' && action !== 'off')) {
        return res.status(400).json({ error: 'Invalid input for scheduling. Time must be a string and action must be "on" or "off"' });
    }
    await lightService.scheduleAction(id, time, action);
    res.json({ message: `Light ${id} scheduled to turn ${action} at ${time}` });
}));

/**
 * Route to add a new light.
 * 
 * @param req - The Express request object, not used in this route.
 * @param res - The Express response object, used to send back a confirmation message with the new light ID.
 */
app.post('/lights', asyncHandler(async (req: Request<ParamsDictionary>, res: Response) => {
    const newLightId = await lightService.addLight();
    res.json({ message: `New light added with ID ${newLightId}` });
}));

/**
 * Route to add a light to an existing group by group ID and light ID.
 * 
 * @param req - The Express request object, containing the group ID and light ID in the parameters.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/groups/:id/add-light/:lightId', validateId, asyncHandler(async (req: Request<ParamsDictionary>, res: Response) => {
    const groupId = Number(req.params.id);
    const lightId = Number(req.params.lightId);
    
    await lightService.addLightToGroup(groupId, lightId);
    res.json({ message: `Light ${lightId} added to group ${groupId}` });
}));

/**
 * Route to remove a light from an existing group by group ID and light ID.
 * 
 * @param req - The Express request object, containing the group ID and light ID in the parameters.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.delete('/groups/:id/remove-light/:lightId', validateId, asyncHandler(async (req: Request<ParamsDictionary>, res: Response) => {
    const groupId = Number(req.params.id);
    const lightId = Number(req.params.lightId);
    
await lightService.deleteLightFromGroup(lightId);
    res.json({ message: `Light ${lightId} removed from group ${groupId}` });
}));

/**
 * Route to save the current state of the lights and groups.
 * 
 * @param req - The Express request object, not used in this route.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/save', asyncHandler(async (req: Request, res: Response) => {
    await lightService.saveState();
    res.json({ message: 'Current state saved' });
}));

/**
 * Route to load the saved state of the lights and groups.
 * 
 * @param req - The Express request object, not used in this route.
 * @param res - The Express response object, used to send back a confirmation message.
 */
app.post('/load', asyncHandler(async (req: Request, res: Response) => {
    await lightService.loadState();
    res.json({ message: 'State loaded' });
}));

/**
 * Middleware to handle requests to undefined endpoints.
 * 
 * @param req - The Express request object, containing the requested endpoint.
 * @param res - The Express response object, used to send back a 404 error message.
 */
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

/**
 * Middleware to handle errors that occur during request processing.
 * 
 * @param err - The error object containing details of the error.
 * @param req - The Express request object, containing details of the request.
 * @param res - The Express response object, used to send back a 500 error message.
 * @param next - The Express next middleware function, used to pass control to the next handler.
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = envVars.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
