// Defines the possible colors for a light.
export type LightColor = 'white' | 'blue' | 'red' | 'green' | 'yellow';

// Represents the structure of a light object, including its ID, status, brightness, and color.
export interface Light {
    id: number;
    status: 'on' | 'off';
    brightness: number; // Brightness level, ranging from 0 to 100.
    color: LightColor;
}

// Represents a group of lights, including the group ID, name, and an array of light IDs.
interface LightGroup {
    id: number;
    name: string;
    lightIds: number[];
}

// Service class to manage lights and groups of lights.
export class LightService {
    // Stores all lights in a key-value pair, where the key is the light ID.
    private lights: { [id: number]: Light } = {};

    // Stores all groups in a key-value pair, where the key is the group ID.
    private groups: { [id: number]: LightGroup } = {};

    // Counter to generate unique group IDs.
    private groupIdCounter = 1;

    // Counter to generate unique light IDs, starting from 3, assuming some initial lights are added.
    private lightIdCounter = 3;

    // Constructor that initializes the service with some default lights.
    constructor() {
        this.lights[1] = { id: 1, status: 'off', brightness: 0, color: 'white' };
        this.lights[2] = { id: 2, status: 'off', brightness: 0, color: 'white' };
    }

    /**
     * Retrieves all lights and their current states.
     * 
     * @returns An object containing all lights, keyed by their IDs.
     */
    getAllLights(): { [id: number]: Light } {
        return this.lights;
    }

    /**
     * Retrieves a specific light by its ID.
     * 
     * @param id - The ID of the light to retrieve.
     * @returns The light object if found, otherwise null.
     */
    getLight(id: number): Light | null {
        return this.lights[id] || null;
    }

    /**
     * Turns on the light with the specified ID.
     * 
     * @param id - The ID of the light to turn on.
     */
    turnOn(id: number): void {
        this.verifyLightExists(id);
        this.lights[id].status = 'on';
        console.log(`Light ${id} turned on`);
    }

    /**
     * Turns off the light with the specified ID.
     * 
     * @param id - The ID of the light to turn off.
     */
    turnOff(id: number): void {
        this.verifyLightExists(id);
        this.lights[id].status = 'off';
        console.log(`Light ${id} turned off`);
    }

    /**
     * Sets the brightness level for the light with the specified ID.
     * 
     * @param id - The ID of the light to adjust brightness.
     * @param brightness - The new brightness level (0 to 100).
     */
    setBrightness(id: number, brightness: number): void {
        this.verifyLightExists(id);
        if (brightness < 0 || brightness > 100) {
            throw new Error('Brightness should be between 0 and 100');
        }
        this.lights[id].brightness = brightness;
        console.log(`Light ${id} brightness set to ${brightness}`);
    }

    /**
     * Sets the color of the light with the specified ID.
     * 
     * @param id - The ID of the light to change color.
     * @param color - The new color of the light.
     */
    setColor(id: number, color: LightColor): void {
        this.verifyLightExists(id);
        this.lights[id].color = color;
        console.log(`Light ${id} color set to ${color}`);
    }

    /**
     * Creates a new group with a given name and list of light IDs.
     * 
     * @param name - The name of the group.
     * @param lightIds - An array of light IDs to include in the group.
     * @returns The ID of the newly created group.
     */
    createGroup(name: string, lightIds: number[]): number {
        lightIds.forEach(id => this.verifyLightExists(id));
        const groupId = this.groupIdCounter++;
        this.groups[groupId] = { id: groupId, name, lightIds };
        console.log(`Group "${name}" created with ID ${groupId}`);
        return groupId;
    }

    /**
     * Controls a group by turning all its lights on or off.
     * 
     * @param groupId - The ID of the group to control.
     * @param action - The action to perform ('on' or 'off').
     */
    controlGroup(groupId: number, action: 'on' | 'off'): void {
        const group = this.groups[groupId];
        if (!group) {
            throw new Error('Group not found');
        }
        group.lightIds.forEach(id => {
            if (action === 'on') {
                this.turnOn(id);
            } else if (action === 'off') {
                this.turnOff(id);
            }
        });
        console.log(`Group ${groupId} lights turned ${action}`);
    }

    /**
     * Schedules an action (turn on/off) for a specific light at a given time.
     * 
     * @param id - The ID of the light to schedule.
     * @param time - The time to perform the action, in a valid time string format.
     * @param action - The action to perform ('on' or 'off').
     */
    scheduleAction(id: number, time: string, action: 'on' | 'off'): void {
        this.verifyLightExists(id);

        const delay = this.calculateDelay(time);
        if (delay < 0) {
            throw new Error('Scheduled time must be in the future');
        }

        setTimeout(() => {
            if (action === 'on') {
                this.turnOn(id);
            } else {
                this.turnOff(id);
            }
            console.log(`Light ${id} scheduled to turn ${action} at ${time}`);
        }, delay);
    }

    /**
     * Adds a light to an existing group.
     * 
     * @param groupId - The ID of the group to add the light to.
     * @param lightId - The ID of the light to add.
     */
    addLightToGroup(groupId: number, lightId: number): void {
        this.verifyLightExists(lightId);
        const group = this.groups[groupId];
        if (!group) {
            throw new Error('Group not found');
        }
        if (!group.lightIds.includes(lightId)) {
            group.lightIds.push(lightId);
            console.log(`Light ${lightId} added to group ${groupId}`);
        } else {
            console.log(`Light ${lightId} is already in group ${groupId}`);
        }
    }

    /**
     * Removes a light from a group.
     * 
     * @param groupId - The ID of the group to remove the light from.
     * @param lightId - The ID of the light to remove.
     */
    removeLightFromGroup(groupId: number, lightId: number): void {
        const group = this.groups[groupId];
        if (!group) {
            throw new Error('Group not found');
        }
        group.lightIds = group.lightIds.filter(id => id !== lightId);
        console.log(`Light ${lightId} removed from group ${groupId}`);
    }

    /**
 * Removes a light from the system and automatically removes it from any groups it belongs to.
 * 
 * @param {number} lightId - The ID of the light to be deleted. The method first verifies that the light exists,
 *                           then it removes the light from any groups it is part of, and finally, deletes the light from the system.
 */
deleteLightFromGroup(lightId: number): void {
    this.verifyLightExists(lightId);
    
    // Remove the light from any groups it belongs to.
    Object.values(this.groups).forEach(group => {
        group.lightIds = group.lightIds.filter(id => id !== lightId);
    });

    // Delete the light from the system.
    delete this.lights[lightId];
    console.log(`Light ${lightId} deleted from the system and removed from all groups.`);
}

    /**
     * Deletes a group by its ID.
     * 
     * @param groupId - The ID of the group to delete.
     */
    deleteGroup(groupId: number): void {
        if (!this.groups[groupId]) {
            throw new Error('Group not found');
        }
        delete this.groups[groupId];
        console.log(`Group ${groupId} deleted`);
    }

    /**
     * Adds a new light to the system.
     * 
     * @returns The ID of the newly added light.
     */
    addLight(): number {
        const newLightId = this.lightIdCounter++;
        this.lights[newLightId] = { id: newLightId, status: 'off', brightness: 0, color: 'white' };
        console.log(`New light added with ID ${newLightId}`);
        return newLightId;
    }

    /**
     * Simulates saving the current state of lights and groups.
     * In a real implementation, this would save to a database or file.
     */
    saveState(): void {
        console.log('Saving current state of lights and groups...');
    }

    /**
     * Simulates loading the state of lights and groups from a database or file.
     */
    loadState(): void {
        console.log('Loading state of lights and groups...');
    }

    /**
     * Verifies that a light with the specified ID exists.
     * 
     * @param id - The ID of the light to verify.
     * @throws An error if the light does not exist.
     */
    private verifyLightExists(id: number): void {
        if (!this.lights[id]) {
            throw new Error('Light not found');
        }
    }

    /**
     * Calculates the delay until the scheduled time.
     * 
     * @param time - The target time as a string.
     * @returns The delay in milliseconds.
     */
    private calculateDelay(time: string): number {
        const now = new Date();
        const targetTime = new Date(time);
        return targetTime.getTime() - now.getTime();
    }
}
