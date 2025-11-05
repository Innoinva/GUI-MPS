/* auditory-training-app/js/views/game-screen-basic.js */
import eventBus from '../utils/event-bus.js';
import { getLatestDesignedGameButtons, clearLatestDesignedGameButtons } from '../app.js';

export function initGameScreenBasic(viewContentElement) {
    const gameButtonArea = viewContentElement.querySelector('[data-js-hook="game-button-area"]');
    const placeholderText = viewContentElement.querySelector('[data-js-hook="game-area-placeholder"]');
    const lockButtonsToggle = viewContentElement.querySelector('[data-js-hook="lock-buttons-toggle"]');
    const clearScreenButton = viewContentElement.querySelector('[data-js-hook="clear-game-screen-btn"]');
    const toggleFullscreenBtn = viewContentElement.querySelector('[data-js-hook="toggle-fullscreen-btn"]');
    const fullscreenBtnText = viewContentElement.querySelector('[data-js-hook="fullscreen-btn-text"]');
    const mainGameScreenElement = viewContentElement;

    let currentButtonData = []; // Holds the full data for buttons currently on screen, including their positions
    let areButtonsLocked = false;
    let unsubscribeGameButtonsDesigned = null;

    let selectedButtonElement = null;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    const KEYBOARD_MOVE_STEP = 10;

    if (!lockButtonsToggle) {
        console.error("GameScreenBasic init: lock-buttons-toggle element NOT FOUND!");
    } else {
        console.log("GameScreenBasic init: lock-buttons-toggle element found:", lockButtonsToggle);
    }

    function clearGameArea() {
        if (gameButtonArea) {
            gameButtonArea.innerHTML = ''; // Clear existing buttons
        }
        currentButtonData = [];
        if (selectedButtonElement) {
            deselectButton();
        }
        if (placeholderText) {
            placeholderText.style.display = 'block'; // Show placeholder
        }
        console.log("GameScreenBasic: Game area cleared.");
    }

    function handleClearScreenClick() {
        clearGameArea();
        // clearLatestDesignedGameButtons(); // Optional: Clears from app.js; decide if this is desired behavior
    }

    // Utility: A simple chroma-like function for color manipulation (remains as is)
    function chroma(hex) {
        if (!hex || typeof hex !== 'string') hex = '#CCCCCC';
        try {
            const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
            if (!/^#[0-9A-F]{6}$/i.test(hex) && !/^#[0-9A-F]{8}$/i.test(hex)) hex = '#CCCCCC';
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
            if (!result) return { darken: () => ({hex: () => '#AAAAAA'}), hex: () => hex };
            let r = parseInt(result[1], 16), g = parseInt(result[2], 16), b = parseInt(result[3], 16);
            return {
                darken: (amount = 1) => {
                    const factor = 1 - (amount * 0.1);
                    r = Math.max(0, Math.floor(r * factor));
                    g = Math.max(0, Math.floor(g * factor));
                    b = Math.max(0, Math.floor(b * factor));
                    const toHex = c => c.toString(16).padStart(2, '0');
                    return { hex: () => `#${toHex(r)}${toHex(g)}${toHex(b)}` };
                },
                hex: () => hex.startsWith('#') ? hex.substring(0,7) : `#${hex.substring(0,6)}`
            };
        } catch (e) { return { darken: () => ({hex: () => '#AAAAAA'}), hex: () => '#CCCCCC' }; }
    }

    function applyButtonStyles(buttonElement, visuals) {
        if (!buttonElement || !visuals) return;

        // Apply cosmetic styles via CSS custom properties
        buttonElement.style.setProperty('--btn-bg-color', visuals.backgroundColor || '#007bff');
        buttonElement.style.setProperty('--btn-text-color', visuals.textColor || '#ffffff');
        buttonElement.style.setProperty('--btn-width', visuals.size || '100px');
        buttonElement.style.setProperty('--btn-height', visuals.size || '100px');
        buttonElement.style.setProperty('--btn-border-radius', visuals.shape || '8px');

        const sizeValue = parseInt(visuals.size, 10) || 100;
        let fontSize = Math.max(10, Math.min(sizeValue / 4.5, 24));
        if (buttonElement.textContent && buttonElement.textContent.length > 5 && sizeValue < 100) {
            fontSize = Math.max(8, sizeValue / (buttonElement.textContent.length * 0.9));
        }
        buttonElement.style.setProperty('--btn-font-size', `${fontSize}px`);

        const baseChromaInstance = chroma(visuals.backgroundColor || '#007bff');
        buttonElement.style.setProperty('--btn-border-color', baseChromaInstance.darken(0.3).hex());

        // MODIFIED: Apply explicit positioning ONLY if visuals.position is provided
        if (visuals.position && typeof visuals.position.x === 'number' && typeof visuals.position.y === 'number') {
            buttonElement.style.position = 'absolute'; // This button will be absolutely positioned
            buttonElement.style.left = `${visuals.position.x}px`;
            buttonElement.style.top = `${visuals.position.y}px`;
        } else {
            // If no explicit position, remove any inline position styles to let Flexbox control it
            buttonElement.style.position = '';
            buttonElement.style.left = '';
            buttonElement.style.top = '';
        }
    }

    function updateButtonPositionData(buttonElement, x, y) {
        const buttonId = buttonElement.dataset.buttonId;
        const buttonDataObject = currentButtonData.find(b => b.id === buttonId);
        if (buttonDataObject && buttonDataObject.visuals) {
            if (!buttonDataObject.visuals.position) {
                 buttonDataObject.visuals.position = {}; // Ensure position object exists
            }
            // Store the position relative to the gameButtonArea
            const gameAreaRect = gameButtonArea.getBoundingClientRect();
            buttonDataObject.visuals.position.x = buttonElement.offsetLeft; // Use offsetLeft/Top for position within parent
            buttonDataObject.visuals.position.y = buttonElement.offsetTop;
        }
    }

    function selectButton(targetButtonElement) {
        if (areButtonsLocked) return;
        if (selectedButtonElement === targetButtonElement) return;
        deselectButton();
        selectedButtonElement = targetButtonElement;
        selectedButtonElement.classList.add('selected');
        selectedButtonElement.focus();
    }

    function deselectButton() {
        if (selectedButtonElement) {
            selectedButtonElement.classList.remove('selected');
        }
        selectedButtonElement = null;
    }

    function handleButtonMouseDown(event) {
        const targetButton = event.currentTarget;
        if (areButtonsLocked) return;

        event.preventDefault();
        selectButton(targetButton);
        isDragging = true;

        // Ensure the button is absolutely positioned for dragging
        // The .dragging class now adds position:absolute, so JS just needs to add the class.
        targetButton.classList.add('dragging');

        // Calculate initial offset from mouse to button's top-left corner
        // relative to the viewport
        const rect = targetButton.getBoundingClientRect();
        dragOffsetX = event.clientX - rect.left;
        dragOffsetY = event.clientY - rect.top;

        document.addEventListener('mousemove', handleDocumentMouseMove);
        document.addEventListener('mouseup', handleDocumentMouseUp);
    }

    function handleDocumentMouseMove(event) {
        if (!isDragging || !selectedButtonElement) return;
        event.preventDefault();

        const gameAreaRect = gameButtonArea.getBoundingClientRect();

        // Calculate new top-left corner of the button in viewport coordinates
        let newViewportX = event.clientX - dragOffsetX;
        let newViewportY = event.clientY - dragOffsetY;

        // Convert viewport coordinates to coordinates relative to the gameButtonArea
        let newRelativeX = newViewportX - gameAreaRect.left;
        let newRelativeY = newViewportY - gameAreaRect.top;

        // Constrain the button within the gameButtonArea boundaries
        const buttonWidth = selectedButtonElement.offsetWidth;
        const buttonHeight = selectedButtonElement.offsetHeight;

        newRelativeX = Math.max(0, Math.min(newRelativeX, gameAreaRect.width - buttonWidth));
        newRelativeY = Math.max(0, Math.min(newRelativeY, gameAreaRect.height - buttonHeight));

        selectedButtonElement.style.left = `${newRelativeX}px`;
        selectedButtonElement.style.top = `${newRelativeY}px`;
    }

    function handleDocumentMouseUp(event) {
        if (!isDragging || !selectedButtonElement) return;

        selectedButtonElement.classList.remove('dragging');
        // The .dragging class removal will revert position to what CSS dictates for non-dragging buttons
        // UNLESS we explicitly keep it positioned.
        // For a dragged button, we want to keep its new absolute position.
        selectedButtonElement.style.position = 'absolute'; // Keep it absolutely positioned at the dragged location

        isDragging = false;
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);

        // Update the button's data object with its new position (relative to gameButtonArea)
        updateButtonPositionData(
            selectedButtonElement,
            parseFloat(selectedButtonElement.style.left),
            parseFloat(selectedButtonElement.style.top)
        );
    }

    function handleDocumentKeyDown(event) {
        if (!selectedButtonElement || areButtonsLocked || isDragging) return;

        // Ensure the selected button is treated as absolutely positioned for keyboard movement
        // if it wasn't already (e.g. if it was a flex item and then selected)
        if (selectedButtonElement.style.position !== 'absolute') {
            // Place it where it currently is, but make it absolute
            selectedButtonElement.style.left = `${selectedButtonElement.offsetLeft}px`;
            selectedButtonElement.style.top = `${selectedButtonElement.offsetTop}px`;
            selectedButtonElement.style.position = 'absolute';
        }


        let dx = 0;
        let dy = 0;
        switch (event.key) {
            case 'ArrowUp': dy = -KEYBOARD_MOVE_STEP; break;
            case 'ArrowDown': dy = KEYBOARD_MOVE_STEP; break;
            case 'ArrowLeft': dx = -KEYBOARD_MOVE_STEP; break;
            case 'ArrowRight': dx = KEYBOARD_MOVE_STEP; break;
            default: return;
        }
        event.preventDefault();

        const currentX = parseFloat(selectedButtonElement.style.left) || selectedButtonElement.offsetLeft;
        const currentY = parseFloat(selectedButtonElement.style.top) || selectedButtonElement.offsetTop;
        let newX = currentX + dx;
        let newY = currentY + dy;

        const gameAreaRect = gameButtonArea.getBoundingClientRect();
        const buttonWidth = selectedButtonElement.offsetWidth;
        const buttonHeight = selectedButtonElement.offsetHeight;

        newX = Math.max(0, Math.min(newX, gameAreaRect.width - buttonWidth));
        newY = Math.max(0, Math.min(newY, gameAreaRect.height - buttonHeight));

        selectedButtonElement.style.left = `${newX}px`;
        selectedButtonElement.style.top = `${newY}px`;

        updateButtonPositionData(selectedButtonElement, newX, newY);
    }

    function renderButton(buttonFullData) {
        if (!gameButtonArea) return null;

        const buttonElement = document.createElement('button');
        buttonElement.className = 'game-button'; // Base class
        buttonElement.textContent = buttonFullData.uiLabel || 'Button';
        buttonElement.dataset.buttonId = buttonFullData.id;

        // Apply styles, including potential explicit position if available in buttonFullData.visuals
        applyButtonStyles(buttonElement, buttonFullData.visuals);

        buttonElement.addEventListener('click', (e) => {
            if (areButtonsLocked) {
                console.log(`GameScreenBasic: Button "${buttonFullData.uiLabel}" clicked (locked state). Game action can proceed.`);
                // Potentially dispatch an event or call a game logic function here
            }
            // If not locked, click might be handled by mousedown for selection/drag initiation
        });
        buttonElement.addEventListener('mousedown', handleButtonMouseDown);
        // Keydown for movement is handled at the document level if a button is selected

        gameButtonArea.appendChild(buttonElement);
        return buttonElement;
    }

    function renderButtons(buttonsToRender) {
        if (!gameButtonArea) {
            console.error("GameScreenBasic: Game button area not found for renderButtons.");
            return;
        }

        clearGameArea(); // Clear previous buttons and reset currentButtonData
        currentButtonData = JSON.parse(JSON.stringify(buttonsToRender)); // Store a deep copy

        if (currentButtonData && currentButtonData.length > 0) {
            if (placeholderText) {
                placeholderText.style.display = 'none'; // Hide placeholder
            }

            // CSS Flexbox now handles the layout and centering of new buttons by default.
            // Buttons with explicit positions (from dragging) will be positioned by applyButtonStyles.
            currentButtonData.forEach(buttonData => {
                renderButton(buttonData);
            });
            console.log(`GameScreenBasic: Rendered ${currentButtonData.length} buttons. Layout handled by CSS Flexbox and explicit positions.`);

        } else {
            if (placeholderText) {
                placeholderText.style.display = 'block'; // Show placeholder if no buttons
            }
        }
    }

    function handleLockToggleChange(event) {
        // This function should now be correctly triggered thanks to HTML changes
        areButtonsLocked = event.target.checked;
        if (gameButtonArea) {
            // Use class for styling locked state, JS sets attribute for state tracking
            gameButtonArea.dataset.buttonsLocked = areButtonsLocked.toString();
            if (areButtonsLocked) {
                gameButtonArea.classList.add('buttons-locked');
                gameButtonArea.classList.remove('buttons-unlocked');
            } else {
                gameButtonArea.classList.remove('buttons-locked');
                gameButtonArea.classList.add('buttons-unlocked');
            }
        }
        if (areButtonsLocked) {
            deselectButton(); // Deselect any selected button when locking
        }
        console.log(`GameScreenBasic: Lock toggle changed. Buttons are now ${areButtonsLocked ? 'LOCKED' : 'UNLOCKED'}.`);
    }

    function onGameButtonsDesigned(newButtonsData) {
        console.log("GameScreenBasic: 'gameButtonsDesigned' event received with data:", newButtonsData);
        if (newButtonsData && newButtonsData.length > 0) {
            renderButtons(newButtonsData);
        } else {
            clearGameArea(); // Clear if no buttons are sent
        }
    }

    // Fullscreen functions remain largely the same
    function getFullscreenElement() { return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement; }
    function updateFullscreenButtonText() { if (fullscreenBtnText) { fullscreenBtnText.textContent = (getFullscreenElement() === mainGameScreenElement) ? 'Exit Full Screen' : 'Enter Full Screen'; } }
    function handleToggleFullscreen() { if (!mainGameScreenElement) return; if (!getFullscreenElement()) { if (mainGameScreenElement.requestFullscreen) mainGameScreenElement.requestFullscreen(); else if (mainGameScreenElement.webkitRequestFullscreen) mainGameScreenElement.webkitRequestFullscreen(); else if (mainGameScreenElement.mozRequestFullScreen) mainGameScreenElement.mozRequestFullScreen(); else if (mainGameScreenElement.msRequestFullscreen) mainGameScreenElement.msRequestFullscreen(); } else { if (document.exitFullscreen) document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); else if (document.mozCancelFullScreen) document.mozCancelFullScreen(); else if (document.msExitFullscreen) document.msExitFullscreen(); } }
    function handleFullscreenChange() { updateFullscreenButtonText(); if (getFullscreenElement() === mainGameScreenElement) { mainGameScreenElement.classList.add('is-fullscreen'); } else { mainGameScreenElement.classList.remove('is-fullscreen'); } }

    function handleGameAreaClick(event) {
        // If click is on the game area itself (not a button) and buttons are not locked, deselect.
        if (event.target === gameButtonArea && !areButtonsLocked) {
            deselectButton();
        }
    }

    function setupEventListeners() {
        if (eventBus && typeof eventBus.on === 'function') {
            unsubscribeGameButtonsDesigned = eventBus.on('gameButtonsDesigned', onGameButtonsDesigned);
        } else {
            console.error("GameScreenBasic: eventBus is not available or 'on' method is missing.");
        }

        if (lockButtonsToggle) {
            console.log("GameScreenBasic setupListeners: Adding 'change' listener to lockButtonsToggle.");
            lockButtonsToggle.addEventListener('change', handleLockToggleChange);
        } else {
            console.warn("GameScreenBasic setupListeners: lockButtonsToggle not found, CANNOT add 'change' listener.");
        }
        if (clearScreenButton) {
            clearScreenButton.addEventListener('click', handleClearScreenClick);
        }
        if (toggleFullscreenBtn) {
            toggleFullscreenBtn.addEventListener('click', handleToggleFullscreen);
        }
        if (gameButtonArea) {
            gameButtonArea.addEventListener('click', handleGameAreaClick);
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        document.addEventListener('keydown', handleDocumentKeyDown); // For moving selected buttons
    }

    function cleanup() {
        if (unsubscribeGameButtonsDesigned) {
            unsubscribeGameButtonsDesigned();
            unsubscribeGameButtonsDesigned = null;
        }
        // Remove all listeners added in setupEventListeners
        if (lockButtonsToggle) lockButtonsToggle.removeEventListener('change', handleLockToggleChange);
        if (clearScreenButton) clearScreenButton.removeEventListener('click', handleClearScreenClick);
        if (toggleFullscreenBtn) toggleFullscreenBtn.removeEventListener('click', handleToggleFullscreen);
        if (gameButtonArea) gameButtonArea.removeEventListener('click', handleGameAreaClick);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        document.removeEventListener('keydown', handleDocumentKeyDown);
        // Ensure any active drag listeners are also cleaned up (though they are typically removed on mouseup)
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);

        if (getFullscreenElement() === mainGameScreenElement) {
            if (document.exitFullscreen) document.exitFullscreen(); // Attempt to exit fullscreen on cleanup
        }
        mainGameScreenElement.classList.remove('is-fullscreen');
        console.log("GameScreenBasic: Cleaned up listeners.");
    }

    // --- Initialization ---
    console.log("GameScreenBasic: Initializing with content element:", viewContentElement);
    setupEventListeners();

    // Set initial state for buttonsLocked and gameButtonArea class
    if (lockButtonsToggle) {
        areButtonsLocked = lockButtonsToggle.checked;
        gameButtonArea.dataset.buttonsLocked = areButtonsLocked.toString();
        if (areButtonsLocked) {
            gameButtonArea.classList.add('buttons-locked');
            gameButtonArea.classList.remove('buttons-unlocked');
        } else {
            gameButtonArea.classList.remove('buttons-locked');
            gameButtonArea.classList.add('buttons-unlocked');
        }
        console.log(`GameScreenBasic: Initial button lock state from toggle: ${areButtonsLocked ? 'LOCKED' : 'UNLOCKED'}.`);
    } else { // Default to unlocked if toggle not found, though it should be
        gameButtonArea.dataset.buttonsLocked = 'false';
        gameButtonArea.classList.add('buttons-unlocked');
    }


    const initialButtons = getLatestDesignedGameButtons();
    if (initialButtons && initialButtons.length > 0) {
        renderButtons(initialButtons); // Render buttons from app state if they exist
    } else if (currentButtonData.length === 0) { // Ensure placeholder is shown if no initial buttons
        if (placeholderText) placeholderText.style.display = 'block';
    }

    updateFullscreenButtonText();
    return { cleanup };
}