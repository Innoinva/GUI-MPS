/* auditory-training-app/js/views/sound-design-hub.js */
import eventBus from '../utils/event-bus.js';

/**
 * Initializes the Sound Design Studio Hub view's interactions.
 * @param {HTMLElement} viewContentElement - The root DOM element of the loaded view.
 */
export function initSoundDesignHub(viewContentElement) {
    if (!viewContentElement) {
        console.error("SoundDesignHub: viewContentElement is null or undefined. Cannot initialize.");
        return;
    }
    console.log("SoundDesignHub: Initializing with content element:", viewContentElement);

    const newAdditiveModelButton = viewContentElement.querySelector('[data-js-hook="sds-hub-new-additive-model"]');
    if (newAdditiveModelButton) {
        newAdditiveModelButton.addEventListener('click', () => {
            console.log("SoundDesignHub: 'New Additive Model' button clicked.");
            eventBus.dispatch('openView', {
                viewId: 'basic-additive-synth',
                title: 'Basic Additive Synth',
                isPromotedTab: true
            });
        });
    }

    const openSoundBankButton = viewContentElement.querySelector('[data-js-hook="sds-hub-open-sound-bank"]');
    if (openSoundBankButton) {
        openSoundBankButton.addEventListener('click', () => {
            console.log("SoundDesignHub: 'Open Sound Bank' button clicked.");
            eventBus.dispatch('openView', {
                viewId: 'sound-model-bank',
                title: 'Sound Model Bank',
                isPromotedTab: true
            });
        });
    }
    // Add listeners for other buttons (e.g., spectral, analyzer) when they are implemented

    console.log("SoundDesignHub: View initialized successfully.");
}