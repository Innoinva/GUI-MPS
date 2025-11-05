/* auditory-training-app/js/components/tab-manager.js */

const tabBarContainer = document.querySelector('[data-tab-bar-container]');
const tabContentContainer = document.querySelector('[data-tab-content-container]');

let tabBarUL = null; // Will be the <ul> element for tabs
let openTabs = new Map(); // To keep track of open tabs by ID { id: { tabElement, contentElement, title } }
let activeTabId = null;
let tabCounter = 0; // Simple unique ID generator

/**
 * Creates the main <ul> element for the tab bar if it doesn't exist.
 */
function ensureTabBarExists() {
    if (!tabBarUL) {
        if (tabBarContainer) {
            tabBarUL = document.createElement('ul');
            tabBarUL.className = 'tab-bar';
            tabBarContainer.appendChild(tabBarUL);
        } else {
            console.error("Tab bar container not found.");
        }
    }
}

/**
 * Creates and adds a new tab to the tab bar and its corresponding content panel.
 * @param {string} tabId - A unique ID for the tab.
 * @param {string} title - The title to display on the tab.
 * @param {string} contentHTML - HTML string for the tab's content (placeholder for now).
 * @param {boolean} activate - Whether to make this tab active immediately.
 */
export function addTab(tabId, title, contentHTML = `<p>Content for ${title}</p>`, activate = true) {
    ensureTabBarExists();
    if (!tabBarUL || !tabContentContainer) {
        console.error("Tab system containers not found. Cannot add tab.");
        return null;
    }

    if (openTabs.has(tabId)) {
        console.log(`Tab with ID "${tabId}" already open. Activating it.`);
        if (activate) activateTab(tabId);
        return openTabs.get(tabId);
    }

    // Create Tab Element
    const tabElement = document.createElement('li');
    tabElement.className = 'tab-bar__tab';
    tabElement.dataset.tabId = tabId;
    tabElement.textContent = title; //  Simple text for now, can add icon later

    // Create Close Button for Tab
    const closeButton = document.createElement('button');
    closeButton.className = 'tab-bar__tab-close';
    closeButton.setAttribute('aria-label', `Close ${title} tab`);
    closeButton.innerHTML = `<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>`; // Simple X icon
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tab click event when clicking close
        closeTab(tabId);
    });
    tabElement.appendChild(closeButton);

    tabElement.addEventListener('click', () => activateTab(tabId));
    tabBarUL.appendChild(tabElement);

    // Create Tab Content Panel
    const contentElement = document.createElement('div');
    contentElement.className = 'tab-content';
    contentElement.dataset.tabContentId = tabId;
    contentElement.innerHTML = contentHTML;
    tabContentContainer.appendChild(contentElement);

    const tabData = { tabElement, contentElement, title };
    openTabs.set(tabId, tabData);

    console.log(`Tab added: ${title} (ID: ${tabId})`);

    if (activate || openTabs.size === 1) {
        activateTab(tabId);
    }
    return tabData;
}

/**
 * Activates a specific tab, showing its content and styling the tab.
 * @param {string} tabId - The ID of the tab to activate.
 */
export function activateTab(tabId) {
    if (!openTabs.has(tabId)) {
        console.warn(`Attempted to activate non-existent tab: ${tabId}`);
        return;
    }

    // Deactivate previously active tab
    if (activeTabId && openTabs.has(activeTabId)) {
        openTabs.get(activeTabId).tabElement.removeAttribute('data-state'); // Or .classList.remove('active')
        openTabs.get(activeTabId).contentElement.removeAttribute('data-state');
    }

    // Activate new tab
    const tabToActivate = openTabs.get(tabId);
    tabToActivate.tabElement.setAttribute('data-state', 'active');
    tabToActivate.contentElement.setAttribute('data-state', 'active');
    activeTabId = tabId;

    console.log(`Tab activated: ${tabToActivate.title} (ID: ${tabId})`);
}

/**
 * Closes a specific tab.
 * @param {string} tabId - The ID of the tab to close.
 */
export function closeTab(tabId) {
    if (!openTabs.has(tabId)) {
        console.warn(`Attempted to close non-existent tab: ${tabId}`);
        return;
    }

    const tabToClose = openTabs.get(tabId);
    tabToClose.tabElement.remove();
    tabToClose.contentElement.remove();
    openTabs.delete(tabId);

    console.log(`Tab closed: ${tabToClose.title} (ID: ${tabId})`);

    // If the closed tab was active, activate another tab (e.g., the last one or first one)
    if (activeTabId === tabId) {
        activeTabId = null; // Clear activeTabId
        if (openTabs.size > 0) {
            // Activate the last tab in the Map (or any other logic)
            const lastTabKey = Array.from(openTabs.keys()).pop();
            activateTab(lastTabKey);
        } else {
            // No tabs left, perhaps show a default message in tabContentContainer
        }
    }
}

/**
 * Closes all open tabs.
 */
export function closeAllTabs() {
    if (!tabBarUL) return;

    // Get all tab IDs
    const tabIds = Array.from(openTabs.keys());

    // Remove all tab elements from DOM
    tabIds.forEach(tabId => {
        if (openTabs.has(tabId)) {
            openTabs.get(tabId).tabElement.remove();
            openTabs.get(tabId).contentElement.remove();
        }
    });

    // Clear the internal tracking
    openTabs.clear();
    activeTabId = null; // Ensure activeTabId is reset

    // If tabBarUL is empty of children, we could also remove it or hide tabBarContainer
    // For now, just clearing the state is sufficient.
    // Example: if (tabBarUL.children.length === 0) tabBarUL.innerHTML = ''; // Clear any remnants if direct DOM manip happened

    console.log("All tabs closed directly.");
}


/**
 * Generates a unique ID for new tabs (simple version).
 * @param {string} prefix - A prefix for the ID.
 * @returns {string} A unique tab ID.
 */
export function generateUniqueTabId(prefix = 'tab') {
    tabCounter++;
    return `${prefix}-${Date.now()}-${tabCounter}`;
}

/**
 * Initializes the tab manager.
 */
export function initTabManager() {
    if (!tabBarContainer || !tabContentContainer) {
        console.error("Tab bar or tab content container not found. Tab manager cannot initialize.");
        return;
    }
    ensureTabBarExists(); // Make sure the <ul> is there on init
    console.log("Tab Manager initialized.");
    // Example: Add a default welcome tab (optional)
    // addTab(generateUniqueTabId('welcome'), 'Welcome', '<p>Welcome to the application! Select an environment to get started.</p>', true);
}