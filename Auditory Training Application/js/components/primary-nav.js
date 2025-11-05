/* auditory-training-app/js/components/primary-nav.js */

const primaryNavElement = document.querySelector('[data-primary-nav]');
const navLinks = primaryNavElement ? Array.from(primaryNavElement.querySelectorAll('[data-js-hook="primary-nav-link"]')) : [];
const currentEnvironmentTitleElement = document.querySelector('[data-js-hook="current-environment-title"]');

let currentActiveLink = null;

/**
 * Handles the click event on a primary navigation link.
 * @param {Event} event - The click event.
 */
function handleNavLinkClick(event) {
    event.preventDefault(); // Prevent default anchor link behavior (page jump)
    const clickedLink = event.currentTarget;
    const targetEnvironment = clickedLink.dataset.navTarget; // Get from data-nav-target

    if (currentActiveLink) {
        currentActiveLink.classList.remove('active');
    }
    clickedLink.classList.add('active');
    currentActiveLink = clickedLink;

    if (currentEnvironmentTitleElement) {
        // Make title more presentable (e.g., "sound-design-studio" -> "Sound Design Studio")
        const friendlyTitle = targetEnvironment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        currentEnvironmentTitleElement.textContent = friendlyTitle;
    }

    console.log(`Primary navigation: Switched to ${targetEnvironment}`);

    // In a more complete router, this would trigger a route change.
    // For now, we can dispatch a custom event that the router can listen to.
    const navigateEvent = new CustomEvent('navigate', {
        detail: {
            environmentId: targetEnvironment,
            title: currentEnvironmentTitleElement ? currentEnvironmentTitleElement.textContent : targetEnvironment
        }
    });
    document.dispatchEvent(navigateEvent);
}

/**
 * Sets up event listeners for the primary navigation.
 */
function setupEventListeners() {
    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', handleNavLinkClick);
        });
    } else {
        console.warn("No primary navigation links found.");
    }
}

/**
 * Initializes the primary navigation component.
 */
export function initPrimaryNav() {
    if (!primaryNavElement) {
        console.error("Primary navigation element ([data-primary-nav]) not found. Primary navigation cannot initialize.");
        return;
    }
    setupEventListeners();
    // Optionally, set an initial active link if routing determines a default view
    // For now, the first link could be made active by default or none.
    // Example: if (navLinks.length > 0) { navLinks[0].click(); }
    console.log("Primary Navigation initialized.");
}