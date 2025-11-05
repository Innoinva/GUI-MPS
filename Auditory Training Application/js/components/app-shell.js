/* auditory-training-app/js/components/app-shell.js */

// Get references to the DOM elements we need to interact with
const appShellElement = document.querySelector('[data-app-shell]');
const sidebarElement = appShellElement?.querySelector('[data-app-sidebar]');
const menuToggleElement = appShellElement?.querySelector('[data-js-hook="menu-toggle"]');

/**
 * Toggles the sidebar between expanded and collapsed states.
 */
function toggleSidebar() {
    if (!sidebarElement) {
        console.warn("Sidebar element not found for toggling.");
        return;
    }
    const currentState = sidebarElement.getAttribute('data-state');
    const newState = currentState === 'expanded' ? 'collapsed' : 'expanded';
    sidebarElement.setAttribute('data-state', newState);

    // Optional: Save preference to localStorage
    // localStorage.setItem('sidebarState', newState);
    console.log(`Sidebar toggled to: ${newState}`);
}

/**
 * Initializes the sidebar state, possibly from localStorage.
 */
function initializeSidebar() {
    if (!sidebarElement) {
        console.warn("Sidebar element not found for initialization.");
        return;
    }
    // Optional: Load preference from localStorage
    // const savedState = localStorage.getItem('sidebarState');
    // if (savedState && (savedState === 'expanded' || savedState === 'collapsed')) {
    //     sidebarElement.setAttribute('data-state', savedState);
    // } else {
    //     // Default state if nothing is saved
    //     sidebarElement.setAttribute('data-state', 'expanded');
    // }
    // For now, default to expanded
    sidebarElement.setAttribute('data-state', 'expanded');
    console.log(`Sidebar initialized to: ${sidebarElement.getAttribute('data-state')}`);
}

/**
 * Sets up event listeners for the app shell.
 */
function setupEventListeners() {
    if (menuToggleElement) {
        menuToggleElement.addEventListener('click', toggleSidebar);
    } else {
        console.warn("Menu toggle button not found.");
    }
}

/**
 * Initializes the application shell component.
 * This function will be exported and called by app.js.
 */
export function initAppShell() {
    if (!appShellElement) {
        console.error("App shell main element ([data-app-shell]) not found. App shell cannot initialize.");
        return;
    }
    initializeSidebar();
    setupEventListeners();
    console.log("App Shell initialized.");
}