/* auditory-training-app/js/views/rng-config-basic.js */

/**
 * Initializes the Basic RNG Configuration view's interactions.
 * @param {HTMLElement} viewContentElement - The root DOM element of the loaded view.
 */
export function initRngConfigBasic(viewContentElement) {
    if (!viewContentElement) {
        console.error("RngConfigBasic: viewContentElement is null or undefined. Cannot initialize.");
        return;
    }
    console.log("RngConfigBasic: Initializing with content element:", viewContentElement);

    const configForm = viewContentElement.querySelector('[data-js-hook="rng-config-form"]');
    const controls = viewContentElement.querySelectorAll('[data-js-hook="rng-control"]');
    const defaultValues = {};

    // Store default values on init
    controls.forEach(control => {
        defaultValues[control.dataset.parameter] = control.value;
        // Log initial values (optional)
        // console.log(`RNG Init: ${control.dataset.parameter} = ${control.value}`);
    });

    if (configForm) {
        configForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent actual form submission
            const currentSettings = {};
            controls.forEach(control => {
                currentSettings[control.dataset.parameter] = control.value;
            });
            console.log("RngConfigBasic: 'Apply Settings' clicked. Current Settings:", currentSettings);
            // In a real app, these settings would be saved or used to configure the RNG engine.
            alert("RNG Settings Logged to Console (No actual application yet)");
        });

        configForm.addEventListener('reset', (event) => {
            // The default HTML form reset will clear values.
            // We might want to reset to our stored initial values if they were dynamically set.
            // For now, HTML default reset is fine for inputs with 'value' attributes.
            // To ensure our display (if we had separate value displays like in synth) updates:
            console.log("RngConfigBasic: 'Reset to Defaults' clicked.");
            setTimeout(() => { // Allow native reset to occur first
                controls.forEach(control => {
                    // If we had separate display elements, update them here.
                    // For input fields themselves, native reset handles it.
                    console.log(`RNG Reset: ${control.dataset.parameter} set to ${control.value}`);
                });
            }, 0);
        });
    }

    // Individual control logging (optional, can be verbose)
    controls.forEach(control => {
        control.addEventListener('change', (event) => { // 'input' for real-time, 'change' for after focus loss/enter
            console.log(`RngConfigBasic: ${event.target.dataset.parameter} changed to: ${event.target.value}`);
        });
    });

    console.log("RngConfigBasic: View initialized successfully.");
}