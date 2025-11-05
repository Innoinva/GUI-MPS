/* auditory-training-app/js/views/basic-additive-synth.js */

/**
 * Initializes the Basic Additive Synth view's interactions.
 * This function is called after its HTML content is loaded into a tab.
 * @param {HTMLElement} viewContentElement - The root DOM element of the loaded view.
 */
export function initBasicAdditiveSynth(viewContentElement) {
    if (!viewContentElement) {
        console.error("BasicAdditiveSynth: viewContentElement is null or undefined. Cannot initialize.");
        return;
    }
    console.log("BasicAdditiveSynth: Initializing with content element:", viewContentElement);

    const partialControlSliders = viewContentElement.querySelectorAll('[data-js-hook="partial-control"]');
    
    partialControlSliders.forEach(slider => {
        // Find the corresponding display span for this slider
        const parameterName = slider.dataset.parameter;
        // The display span is expected to be a sibling or near sibling within the same control-row
        // A more robust way might be to traverse up to the parent fieldset and then query down.
        let valueDisplay = null;
        const controlRow = slider.closest('.control-row');
        if (controlRow) {
            valueDisplay = controlRow.querySelector(`[data-js-hook="partial-value-display"][data-parameter="${parameterName}"]`);
        }

        // Initialize display with current slider value
        if (valueDisplay) {
            valueDisplay.textContent = slider.value;
        }

        slider.addEventListener('input', (event) => {
            const partialGroup = event.target.closest('.partial-group');
            const partialIndex = partialGroup ? partialGroup.dataset.partialIndex : 'unknown';
            const param = event.target.dataset.parameter;
            const value = event.target.value;

            if (valueDisplay) {
                valueDisplay.textContent = value;
            }

            console.log(`BasicAdditiveSynth: Partial ${partialIndex} - ${param} changed to: ${value}`);
            // In a real synth, you'd update an audio parameter here or dispatch an event.
        });
    });

    const playButton = viewContentElement.querySelector('[data-js-hook="synth-play-sound"]');
    if (playButton) {
        playButton.addEventListener('click', () => {
            console.log("BasicAdditiveSynth: 'Play Sound' button clicked (no audio implemented).");
            // Gather all current slider values
            const synthState = {};
            partialControlSliders.forEach(slider => {
                 const partialGroup = slider.closest('.partial-group');
                 const partialIndex = partialGroup ? partialGroup.dataset.partialIndex : 'unknown';
                 if (!synthState[`partial_${partialIndex}`]) {
                    synthState[`partial_${partialIndex}`] = {};
                 }
                 synthState[`partial_${partialIndex}`][slider.dataset.parameter] = slider.value;
            });
            console.log("Current Synth State:", synthState);
        });
    }
    
    const saveButton = viewContentElement.querySelector('[data-js-hook="synth-save-model"]');
    if(saveButton) {
        saveButton.addEventListener('click', () => {
            console.log("BasicAdditiveSynth: 'Save to Sound Bank' clicked (no action implemented).");
        });
    }

    console.log("BasicAdditiveSynth: View initialized successfully.");
}