/* auditory-training-app/js/views/training-hub.js */
import eventBus from '../utils/event-bus.js';

/**
 * Initializes the Training Center Hub view's interactions.
 * Sets up event listeners for buttons within the hub.
 * @param {HTMLElement} viewContentElement - The root DOM element of the loaded training hub view.
 */
export function initTrainingHub(viewContentElement) {
    if (!viewContentElement) {
        console.error("TrainingHub: viewContentElement is null or undefined. Cannot initialize.");
        return;
    }
    console.log("TrainingHub: Initializing with content element:", viewContentElement);

    // Listener for "Start New Training" button
    const startNewTrainingButton = viewContentElement.querySelector('[data-js-hook="atc-hub-start-new-training"]');
    if (startNewTrainingButton) {
        startNewTrainingButton.addEventListener('click', () => {
            console.log("TrainingHub: 'Start New Training' button clicked.");
            eventBus.dispatch('openView', {
                viewId: 'game-screen-basic',
                title: 'Basic Game Screen',
                isPromotedTab: true
            });
        });
    }

    // Listener for "RNG Configuration" button
    const openRngConfigButton = viewContentElement.querySelector('[data-js-hook="atc-hub-open-rng-config"]');
    if (openRngConfigButton) {
        openRngConfigButton.addEventListener('click', () => {
            console.log("TrainingHub: 'RNG Configuration' button clicked.");
            eventBus.dispatch('openView', {
                viewId: 'rng-config-basic',
                title: 'RNG Configuration',
                isPromotedTab: true
            });
        });
    }

    // Listener for "Open Button Designer" button
    const openButtonDesignerButton = viewContentElement.querySelector('[data-js-hook="atc-hub-open-button-designer"]');
    if (openButtonDesignerButton) {
        openButtonDesignerButton.addEventListener('click', () => {
            console.log("TrainingHub: 'Open Button Designer' button clicked.");
            eventBus.dispatch('openView', {
                viewId: 'button-designer',
                title: 'Button Designer',
                isPromotedTab: true
            });
        });
    }

    // Listener for "View Statistics" button (currently disabled in HTML)
    const viewStatsButton = viewContentElement.querySelector('[data-js-hook="atc-hub-view-stats"]');
    if (viewStatsButton) {
        viewStatsButton.addEventListener('click', () => {
            console.log("TrainingHub: 'View Statistics' button clicked (Not Implemented).");
            // Placeholder for future implementation:
            // eventBus.dispatch('openView', { viewId: 'statistics-viewer', title: 'Statistics Viewer', isPromotedTab: true });
        });
    }

    // Listener for "Manage Profiles" button (currently disabled in HTML)
    const manageProfilesButton = viewContentElement.querySelector('[data-js-hook="atc-hub-manage-profiles"]');
    if (manageProfilesButton) {
        manageProfilesButton.addEventListener('click', () => {
            console.log("TrainingHub: 'Manage Profiles' button clicked (Not Implemented).");
            // Placeholder for future implementation:
            // eventBus.dispatch('openView', { viewId: 'profile-manager', title: 'Profile Manager', isPromotedTab: true });
        });
    }

    console.log("TrainingHub: View initialized and event listeners set up.");
}