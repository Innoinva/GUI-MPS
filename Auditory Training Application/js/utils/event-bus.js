/* auditory-training-app/js/utils/event-bus.js */

const eventBus = {
    listeners: {},

    /**
     * Subscribes to an event.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {function} callback - The function to call when the event is dispatched.
     * @returns {function} A function to unsubscribe.
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
        
        // Return an unsubscribe function
        return () => {
            this.listeners[eventName] = this.listeners[eventName].filter(listener => listener !== callback);
            if (this.listeners[eventName].length === 0) {
                delete this.listeners[eventName];
            }
        };
    },

    /**
     * Dispatches an event.
     * @param {string} eventName - The name of the event to dispatch.
     * @param {*} data - The data to pass to the event listeners.
     */
    dispatch(eventName, data) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event bus listener for "${eventName}":`, error);
                }
            });
        }
    },

    /**
     * Removes a specific listener for an event.
     * (Alternative to using the returned unsubscribe function)
     * @param {string} eventName - The name of the event.
     * @param {function} callback - The callback function to remove.
     */
    off(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName] = this.listeners[eventName].filter(listener => listener !== callback);
            if (this.listeners[eventName].length === 0) {
                delete this.listeners[eventName];
            }
        }
    }
};

// Freeze the object to make it a bit more like a singleton and prevent accidental modification
Object.freeze(eventBus);

export default eventBus;