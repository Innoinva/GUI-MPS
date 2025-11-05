/* auditory-training-app/js/app.js */

import { initAppShell } from './components/app-shell.js';
import { initPrimaryNav } from './components/primary-nav.js';
import { initTabManager, addTab, generateUniqueTabId } from './components/tab-manager.js';
import { initRouter } from './router.js';
import eventBus from './utils/event-bus.js';

// View initializers
import { initBasicAdditiveSynth } from './views/basic-additive-synth.js';
import { initSoundModelBank } from './views/sound-model-bank.js';
import { initSoundDesignHub } from './views/sound-design-hub.js'; // For Sound Design Studio Hub
import { initTrainingHub } from './views/training-hub.js';     // For Auditory Training Center Hub
import { initRngConfigBasic } from './views/rng-config-basic.js'; // For RNG Configuration view
import { initGameScreenBasic } from './views/game-screen-basic.js';
import { initButtonDesigner } from './views/button-designer.js'; // For Button Designer view

// --- START: State for Designed Game Buttons ---
let latestDesignedGameButtons = null;

/**
 * Stores the most recently designed game buttons.
 * @param {Array<Object> | null} buttonsData - The array of button data objects, or null to clear.
 */
export function setLatestDesignedGameButtons(buttonsData) {
    latestDesignedGameButtons = buttonsData;
    // console.log("App: Latest designed game buttons stored:", latestDesignedGameButtons);
}

/**
 * Retrieves the most recently designed game buttons.
 * @returns {Array<Object> | null} The array of button data objects, or null if none are stored.
 */
export function getLatestDesignedGameButtons() {
    // console.log("App: Retrieving latest designed game buttons:", latestDesignedGameButtons);
    return latestDesignedGameButtons;
}

/**
 * Clears the stored game buttons.
 */
export function clearLatestDesignedGameButtons() {
    latestDesignedGameButtons = null;
    // console.log("App: Cleared stored game buttons.");
}
// --- END: State for Designed Game Buttons ---


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
        return `<p class="error-message">Error: Could not load content for view. Path: ${templatePath}. Please check the console.</p>`;
    }
}

/**
 * Handles requests to open a new view/module, typically in a new tab.
 * This function can now receive pre-fetched HTML content, or fetch it if not provided.
 * It also calls specific initialization functions for views, including hubs.
 * @param {object} eventData - Data associated with the event.
 * @param {string} eventData.viewId - Unique ID of the view to open (e.g., 'basic-additive-synth', 'sound-design-hub').
 * @param {string} eventData.title - Title for the new tab.
 * @param {string} [eventData.contentHTML] - Optional pre-fetched HTML content for the view.
 * @param {string} [eventData.templateUrl] - Optional explicit template URL (used if contentHTML is not provided).
 * @param {boolean} [eventData.isPromotedTab=true] - If true, opens as a main tab and activates it.
 * @param {boolean} [eventData.isHubView=false] - Indicates if the view is a primary environment hub.
 */
async function handleOpenView(eventData) {
    const { viewId, title, isPromotedTab = true, isHubView = false } = eventData;
    let { templateUrl, contentHTML } = eventData; // contentHTML can be passed directly

    if (!viewId || !title) {
        console.error('openView event missing viewId or title:', eventData);
        return;
    }

    console.log(`App: Handling openView event for viewId: ${viewId}, title: ${title}, isHub: ${isHubView}`);

    // If contentHTML is not provided (e.g., for views opened not by the router's initial navigation), fetch it.
    if (!contentHTML) {
        if (!templateUrl) {
            // Default template path convention if not explicitly provided.
            templateUrl = `templates/${viewId.replace(/_/g, '-')}.html`;
        }
        console.log(`App: Fetching template for ${viewId} from ${templateUrl}`);
        contentHTML = await fetchTemplate(templateUrl);
    }

    const tabId = generateUniqueTabId(viewId);

    if (isPromotedTab) {
        const newTab = addTab(tabId, title, contentHTML, true); // true to make it active
        if (newTab && newTab.contentElement) {
            // Initialize view-specific JavaScript after its content is loaded into the DOM.
            // This is where event listeners and dynamic behavior for the view are set up.
            if (viewId === 'sound-design-hub') {
                initSoundDesignHub(newTab.contentElement);
            } else if (viewId === 'training-hub') {
                initTrainingHub(newTab.contentElement);
            } else if (viewId === 'basic-additive-synth') {
                initBasicAdditiveSynth(newTab.contentElement);
            } else if (viewId === 'sound-model-bank') {
                initSoundModelBank(newTab.contentElement);
            } else if (viewId === 'rng-config-basic') {
                initRngConfigBasic(newTab.contentElement);
            } else if (viewId === 'game-screen-basic') {
                initGameScreenBasic(newTab.contentElement);
            } else if (viewId === 'button-designer') {
                // The button designer might need a specific sub-element passed to its init function.
                const designerContentArea = newTab.contentElement.querySelector('[data-js-hook="button-designer-main-content"]');
                if (designerContentArea) {
                    initButtonDesigner(designerContentArea);
                } else {
                    console.error(`App: Could not find 'button-designer-main-content' in tab for viewId: ${viewId}`);
                    initButtonDesigner(newTab.contentElement);
                }
            }
            // Add other view initializers here as they are created.
            else {
                // Only log if it's not one of the known views that might not have a specific initializer yet (like 'welcome').
                if (viewId !== 'welcome') {
                    console.log(`App: No specific initializer for viewId: ${viewId}`);
                }
            }
        } else {
            console.error(`App: Failed to create or get contentElement for tab: ${tabId}`);
        }
    } else {
        console.log(`App: View ${viewId} requested but not as a promoted tab (current implementation focuses on promoted tabs).`);
    }
}


/**
 * Main application initialization function.
 * Sets up core components, event listeners, and the initial UI state.
 */
function main() {
    console.log("Application starting...");

    initAppShell();     // Initializes the main structure of the application page.
    initPrimaryNav();   // Sets up the primary navigation menu (sidebar).
    initTabManager();   // Initializes the tab management system.
    initRouter();       // Sets up the client-side router for environment navigation.

    // Listen for 'openView' events dispatched from anywhere in the app (e.g., router, hub buttons).
    eventBus.on('openView', handleOpenView);

    const welcomeTabId = generateUniqueTabId('welcome');
    addTab(
        welcomeTabId,
        'Welcome',
        `<div class="view-container" data-view-id="welcome">
            <header class="view-header"><h2>Welcome to the Auditory Application!</h2></header>
            <p>Please select an environment from the sidebar to get started.</p>
            <p>Current Phase: Phase 3 - Auditory Training Center Foundational Elements.</p>
         </div>`,
        true // Make the welcome tab active on startup.
    );

    console.log("Application fully initialized.");
}

// Ensure the main function runs after the DOM is fully loaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main(); // DOMContentLoaded has already fired.
}