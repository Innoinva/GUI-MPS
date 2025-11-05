/* auditory-training-app/js/router.js */

import { addTab, closeAllTabs, generateUniqueTabId } from './components/tab-manager.js';
import eventBus from './utils/event-bus.js'; // Still needed for dispatching 'openView' for hubs

/**
 * Fetches an HTML template from the specified path.
 * @param {string} templatePath - The path to the HTML template file.
 * @returns {Promise<string>} A promise that resolves with the HTML content as a string.
 */
async function fetchTemplate(templatePath) {
    try {
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching template from ${templatePath}:`, error);
        return `<p class="error-message">Error: Could not load content for this view. Path: ${templatePath}. Please check the console.</p>`;
    }
}

/**
 * Handles the 'navigate' custom event dispatched by primary-nav.js.
 * Fetches the initial HTML for an environment's hub and dispatches an 'openView'
 * event for app.js to create the tab and initialize the view.
 * @param {CustomEvent} event - The event object, event.detail contains environmentId and title.
 */
async function handleNavigation(event) {
    const { environmentId, title: environmentTitle } = event.detail;

    console.log(`Router: Navigation event received for environment: ${environmentId}`);
    closeAllTabs(); // Close all existing tabs before opening a new environment hub.

    let defaultTabId = ''; // Used for internal logic and checks, not directly for tab creation here.
    let defaultTabTitle = '';
    let defaultTabContentHTML = '';
    let viewToInitialize = null; // Identifier for app.js to know which view's init function to call.

    if (environmentId === 'sound-design-studio') {
        defaultTabId = generateUniqueTabId('sds-hub'); // Generate a unique ID for logging/reference.
        defaultTabTitle = `${environmentTitle} Hub`;
        defaultTabContentHTML = await fetchTemplate('templates/sound-design-hub.html');
        viewToInitialize = 'sound-design-hub'; // Identifier for the Sound Design Studio hub view.
    } else if (environmentId === 'auditory-training-center') {
        defaultTabId = generateUniqueTabId('atc-hub'); // Generate a unique ID for logging/reference.
        defaultTabTitle = `${environmentTitle} Hub`;
        defaultTabContentHTML = await fetchTemplate('templates/training-hub.html');
        viewToInitialize = 'training-hub'; // Identifier for the Auditory Training Center hub view.
    } else {
        console.warn(`Router: Unknown environment ID: ${environmentId}`);
        // For unknown environments, directly add a tab with an error message.
        addTab(
            generateUniqueTabId('unknown-env'),
            'Unknown Environment',
            '<p>The selected environment is not recognized.</p>',
            true
        );
        return;
    }

    // Ensure that necessary information was prepared before dispatching the event.
    if (defaultTabId && defaultTabTitle && viewToInitialize) {
        // Dispatch an event for app.js to handle opening the hub view.
        // app.js will be responsible for calling addTab and any view-specific initialization.
        eventBus.dispatch('openView', {
            viewId: viewToInitialize,       // e.g., 'sound-design-hub' or 'training-hub'
            title: defaultTabTitle,         // The title for the new tab.
            contentHTML: defaultTabContentHTML, // Pre-fetched HTML content for the view.
            isPromotedTab: true,            // Indicates this tab should be focused.
            isHubView: true                 // Special flag to indicate this is a primary environment hub.
        });
    }
}

// The setupSoundDesignHubEventListeners function has been removed from router.js.
// Its logic, and similar logic for other hubs, will reside in dedicated view modules
// (e.g., js/views/sound-design-hub.js).

/**
 * Initializes the router by setting up the event listener for navigation events.
 */
export function initRouter() {
    document.addEventListener('navigate', handleNavigation);
    console.log("Router initialized and listening for navigation events.");
}