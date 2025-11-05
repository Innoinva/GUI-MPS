/* auditory-training-app/js/views/button-designer.js */
import eventBus from '../utils/event-bus.js';
import { setLatestDesignedGameButtons } from '../app.js';

export function initButtonDesigner(viewContentElement) {
    // console.log("ButtonDesigner: Initializing. Passed viewContentElement:", viewContentElement);

    let allGeneratedButtonsData = [];
    let selectedButtonElements = new Set();
    let mostRecentlySelectedButtonElementForForm = null;
    let baseNotesMemory = {};
    let boundWindowClickListener = null;

    let finalizeAndUseButtonsBtn = null;
    let buttonDesignerFeedbackEl = null;
    let feedbackTimeout = null;

    let previewHighlightColorPicker = null;

    const getEl = (id) => viewContentElement.querySelector(`#${id}`);
    const query = (selector) => viewContentElement.querySelector(selector);
    const queryAll = (selector) => viewContentElement.querySelectorAll(selector);

    const previewContainer = getEl('button-preview-container');
    const singleStimFieldset = getEl('single-stim-fieldset');
    const multiStimFieldset = getEl('multi-stim-fieldset');
    const baseNotesInputsContainer = getEl('base-notes-inputs-container');
    const combinationsDirectoryContainer = getEl('combinations-directory-container');
    const totalCombinationsDisplay = getEl('total-combinations-display');
    const checkboxListContainer = getEl('checkbox-list');
    const buttonSelectorTrigger = getEl('button-selector-trigger');

    function showFeedback(message, type = 'info') {
        if (!buttonDesignerFeedbackEl) {
            return;
        }
        if (feedbackTimeout) {
            clearTimeout(feedbackTimeout);
            feedbackTimeout = null;
        }
        buttonDesignerFeedbackEl.textContent = message;
        buttonDesignerFeedbackEl.className = `feedback-message ${type} show`;

        feedbackTimeout = setTimeout(() => {
            if (buttonDesignerFeedbackEl) {
                buttonDesignerFeedbackEl.classList.remove('show');
            }
        }, 3000);
    }

    const Validator = {
        numeric: (inputEl, feedbackEl, allowEmpty = false) => {
            if (!inputEl) return true;
            const feedbackElement = feedbackEl || (inputEl.parentElement ? inputEl.parentElement.querySelector('.validation-message') : null);
            const valStr = inputEl.value.trim();
            if (allowEmpty && valStr === "") {
                inputEl.classList.remove('invalid-input');
                if (feedbackElement) feedbackElement.textContent = '';
                return true;
            }
            const val = parseFloat(valStr);
            const min = inputEl.hasAttribute('min') ? parseFloat(inputEl.min) : -Infinity;
            const max = inputEl.hasAttribute('max') ? parseFloat(inputEl.max) : Infinity;
            let isValid = true;
            let message = '';
            if (isNaN(val)) { message = 'Not a valid number.'; isValid = false; }
            else if (val < min) { message = `Min: ${min}.`; isValid = false; }
            else if (val > max) { message = `Max: ${max}.`; isValid = false; }
            if (feedbackElement) feedbackElement.textContent = message;
            inputEl.classList.toggle('invalid-input', !isValid);
            return isValid;
        }
    };

    const ContentUtil = {
        sanitize: (text) => {
            const tempDiv = document.createElement('div');
            tempDiv.textContent = text;
            return tempDiv.textContent;
        },
        getSingleStimLabelParts: (index, prefix, type) => {
            const textOptionSingleEl = getEl('text-option-single');
            if (!textOptionSingleEl || !textOptionSingleEl.checked) return { prefix: ContentUtil.sanitize(prefix), base: "" };
            let baseLabel = "";
            if (type === 'letter') baseLabel = String.fromCharCode(65 + index % 26);
            else if (type === 'number') baseLabel = (index + 1).toString();
            return { prefix: ContentUtil.sanitize(prefix), base: baseLabel };
        },
        getMultiStimLabelParts: (lexId, prefix) => {
            return { prefix: ContentUtil.sanitize(prefix), base: lexId };
        },
        getMultiStimHierarchicalID: (numNotesInCombo, lexIndex) => `${numNotesInCombo}N-${String(lexIndex).padStart(3, '0')}`
    };

    const Combinatorics = {
        getCombinations: (elements, k) => {
            if (k < 0 || k > elements.length) return [];
            if (k === 0) return [[]];
            if (k === elements.length) return [elements.slice()];
            if (elements.length === 0) return [];
            const first = elements[0];
            const rest = elements.slice(1);
            const combsWithoutFirst = Combinatorics.getCombinations(rest, k);
            const combsWithFirst = Combinatorics.getCombinations(rest, k - 1).map(comb => [first, ...comb]);
            return [...combsWithFirst, ...combsWithoutFirst];
        },
        lexicographicalSort: (arrayOfArrays, isNumericInputType = false) => {
            return arrayOfArrays
                .map(arr => {
                    const sortedArr = arr.slice().sort((a, b) => {
                        if (isNumericInputType) {
                            const numA = parseFloat(a);
                            const numB = parseFloat(b);
                            if (isNaN(numA) && isNaN(numB)) return String(a).localeCompare(String(b));
                            if (isNaN(numA)) return 1;
                            if (isNaN(numB)) return -1;
                            return numA - numB;
                        }
                        return String(a).localeCompare(String(b));
                    });
                    return sortedArr.join('·|·');
                })
                .sort()
                .map(str => str.split('·|·').map(item => {
                    if (isNumericInputType) {
                        const numItem = parseFloat(item);
                        return isNaN(numItem) ? item : numItem;
                    }
                    return item;
                }));
        }
    };

    const UI = {
        updateDropdownTriggerText: () => {
            if (!buttonSelectorTrigger) return;
            const count = selectedButtonElements.size;
            let textNodeToUpdate = null;
            const spanCandidate = buttonSelectorTrigger.querySelector('[data-js-hook="dropdown-text"]');
            if (spanCandidate) {
                textNodeToUpdate = spanCandidate.firstChild;
            } else {
                for (let child of buttonSelectorTrigger.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim().length > 0) {
                        textNodeToUpdate = child; break;
                    }
                }
            }
            const newText = count === 0 ? 'Select Button(s)' : count === 1 ? '1 Button Selected' : `${count} Buttons Selected`;
            if (textNodeToUpdate && textNodeToUpdate.nodeValue.trim() !== newText.trim()) {
                textNodeToUpdate.nodeValue = ` ${newText} `;
            } else if (!textNodeToUpdate) {
                buttonSelectorTrigger.innerHTML = ` ${newText} <span class="dropdown-arrow">▼</span>`;
            }
        },
        populateButtonSelectorDropdown: () => {
            if (!checkboxListContainer) return;
            checkboxListContainer.innerHTML = '';

            const singleStimButtons = allGeneratedButtonsData.filter(b => b.type === 'single');
            const multiStimButtons = allGeneratedButtonsData.filter(b => b.type === 'multi');

            const createOptGroupUI = (labelText, buttons) => {
                if (buttons.length === 0) return false;
                const groupLabelDiv = document.createElement('div');
                groupLabelDiv.className = 'dropdown-optgroup-label';
                groupLabelDiv.textContent = labelText;
                checkboxListContainer.appendChild(groupLabelDiv);

                buttons.forEach(btnData => {
                    const checkboxId = `dd-check-${btnData.id}`;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'checkbox-group';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'dropdown-checkbox';
                    checkbox.value = btnData.id;
                    checkbox.id = checkboxId;
                    checkbox.checked = selectedButtonElements.has(btnData.element);

                    const labelEl = document.createElement('label');
                    labelEl.htmlFor = checkboxId;
                    labelEl.textContent = ContentUtil.sanitize(`${btnData.currentLabel || btnData.id.substring(0, 10)}`);

                    wrapper.append(checkbox, labelEl);
                    checkboxListContainer.appendChild(wrapper);

                    checkbox.addEventListener('change', (e) => SelectionManager.toggleSelectionById(e.target.value));
                });
                return true;
            };

            const hasSingle = createOptGroupUI('Single-Stimulus Buttons', singleStimButtons);
            const hasMulti = createOptGroupUI('Multi-Stimulus Buttons', multiStimButtons);

            if (!hasSingle && !hasMulti) {
                checkboxListContainer.innerHTML = '<div style="padding:10px 18px;color:#777;text-align:center;">No buttons generated.</div>';
            }
            UI.updateDropdownTriggerText();
        },
        toggleSectionVisibility: (fieldsetElement, isVisible) => {
            if (fieldsetElement) { fieldsetElement.classList.toggle('collapsed', !isVisible); }
        },
        updateButtonVisualSelection: (buttonElement, isSelected) => {
            if (!buttonElement) return;
            buttonElement.classList.toggle('selected-in-preview', isSelected);
            if (checkboxListContainer) {
                const checkbox = checkboxListContainer.querySelector(`.dropdown-checkbox[value="${buttonElement.dataset.buttonId}"]`);
                if (checkbox) checkbox.checked = isSelected;
            }
            UI.updateDropdownTriggerText();
        },
        generateBaseNoteInputs: () => {
            if (!baseNotesInputsContainer) return;
            const numBaseNotesInput = getEl('num-base-notes');
            const previousNCount = parseInt(baseNotesInputsContainer.dataset.currentNCount || "0", 10);

            if (previousNCount > 0) {
                const currentInputElements = baseNotesInputsContainer.querySelectorAll('.base-note-definition');
                const valuesToSave = Array.from(currentInputElements).map(input => input.value);
                baseNotesMemory[previousNCount] = valuesToSave;
            }

            baseNotesInputsContainer.innerHTML = '';
            if (!numBaseNotesInput || !Validator.numeric(numBaseNotesInput, getEl('num-base-notes-feedback'))) {
                baseNotesInputsContainer.innerHTML = '<small>Set a valid "Number of Base Notes" (N) above.</small>';
                if (combinationsDirectoryContainer) combinationsDirectoryContainer.innerHTML = '<small>Define base notes and click "List Possible Combinations".</small>';
                if (totalCombinationsDisplay) totalCombinationsDisplay.textContent = 'Total Combinations Found: 0';
                return;
            }

            const num = parseInt(numBaseNotesInput.value, 10) || 0;
            baseNotesInputsContainer.dataset.currentNCount = num;

            const minN = parseInt(numBaseNotesInput.min || "2", 10);
            if (num < minN) {
                baseNotesInputsContainer.innerHTML = `<small>Set "Number of Base Notes/Frequencies to Define (N)" to ${minN} or more.</small>`;
            } else {
                const typeRadio = query('input[name="base-note-type"]:checked');
                const type = typeRadio ? typeRadio.value : 'name';
                const cachedValues = baseNotesMemory[num];
                for (let i = 0; i < num; i++) {
                    const fg = document.createElement('div'); fg.className = 'form-group';
                    const lbl = document.createElement('label'); lbl.className = 'note-input-label'; lbl.htmlFor = `base-note-${i}`;
                    lbl.textContent = `${type === 'name' ? 'Note' : 'Freq.'} ${i + 1}:`;
                    const input = document.createElement('input'); input.type = 'text'; input.id = `base-note-${i}`;
                    input.className = 'base-note-definition';
                    input.placeholder = type === 'name' ? 'e.g., C#, Gb' : 'e.g., 440';
                    if (cachedValues && cachedValues[i] !== undefined) { input.value = cachedValues[i]; }
                    fg.append(lbl, input);
                    baseNotesInputsContainer.appendChild(fg);
                }
            }
            if (combinationsDirectoryContainer) combinationsDirectoryContainer.innerHTML = '<small>Define base notes and click "List Possible Combinations".</small>';
            if (totalCombinationsDisplay) totalCombinationsDisplay.textContent = 'Total Combinations Found: 0';
        },
        displayCombinations: (combinations, numNotesInCombo) => {
            if (!combinationsDirectoryContainer || !totalCombinationsDisplay) return;
            combinationsDirectoryContainer.innerHTML = '';
            totalCombinationsDisplay.textContent = `Total Combinations Found: ${combinations.length}`;
            if (combinations.length === 0) {
                combinationsDirectoryContainer.innerHTML = '<small>No combinations generated or possible for these settings.</small>';
                return;
            }
            combinations.forEach((combo, index) => {
                const comboId = ContentUtil.getMultiStimHierarchicalID(numNotesInCombo, index + 1);
                const item = document.createElement('div'); item.className = 'combo-item';
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = `combo-check-${index}`;
                checkbox.dataset.combination = JSON.stringify(combo); checkbox.dataset.lexId = comboId;
                const label = document.createElement('label'); label.htmlFor = `combo-check-${index}`;
                label.textContent = ContentUtil.sanitize(`${comboId}: ${combo.join(', ')}`);
                item.append(checkbox, label);
                combinationsDirectoryContainer.appendChild(item);
            });
        }
    };

    const SelectionManager = {
        _updateFormBasedOnCurrentSelection: () => {
            if (mostRecentlySelectedButtonElementForForm && !selectedButtonElements.has(mostRecentlySelectedButtonElementForForm)) {
                mostRecentlySelectedButtonElementForForm = null;
            }

            if (mostRecentlySelectedButtonElementForForm) {
                SelectionManager.populateCustomizeForm(mostRecentlySelectedButtonElementForForm);
            } else if (selectedButtonElements.size === 1) {
                const singleSelectedElement = Array.from(selectedButtonElements)[0];
                SelectionManager.populateCustomizeForm(singleSelectedElement);
                mostRecentlySelectedButtonElementForForm = singleSelectedElement;
            } else {
                SelectionManager.clearCustomizeForm();
                if (selectedButtonElements.size > 0) {
                    const specificLabelEl = getEl('specific-custom-value');
                    if (specificLabelEl) specificLabelEl.placeholder = "Multiple values";
                    const specificPrefixEl = getEl('specific-button-prefix');
                    if (specificPrefixEl) specificPrefixEl.placeholder = "Multiple values";
                    const sizeEl = getEl('specific-button-size');
                    if (sizeEl) sizeEl.placeholder = "Multiple values";
                }
            }
        },
        toggleSelectionByElement: (element) => {
            if (!element) return;
            let isNowSelected;
            if (selectedButtonElements.has(element)) {
                selectedButtonElements.delete(element);
                isNowSelected = false;
                if (mostRecentlySelectedButtonElementForForm === element) {
                    mostRecentlySelectedButtonElementForForm = null;
                }
            } else {
                selectedButtonElements.add(element);
                isNowSelected = true;
                mostRecentlySelectedButtonElementForForm = element;
            }
            UI.updateButtonVisualSelection(element, isNowSelected);
            SelectionManager._updateFormBasedOnCurrentSelection();
        },
        toggleSelectionById: (buttonId) => {
            const buttonData = allGeneratedButtonsData.find(b => b.id === buttonId);
            if (buttonData && buttonData.element) {
                SelectionManager.toggleSelectionByElement(buttonData.element);
            }
        },
        selectAll: () => {
            allGeneratedButtonsData.forEach(btnData => {
                if (btnData.element && !selectedButtonElements.has(btnData.element)) {
                    selectedButtonElements.add(btnData.element);
                    UI.updateButtonVisualSelection(btnData.element, true);
                }
            });
            mostRecentlySelectedButtonElementForForm = null;
            SelectionManager._updateFormBasedOnCurrentSelection();
        },
        deselectAll: () => {
            const elementsToDeselect = Array.from(selectedButtonElements);
            selectedButtonElements.clear();
            elementsToDeselect.forEach(element => UI.updateButtonVisualSelection(element, false));
            mostRecentlySelectedButtonElementForForm = null;
            SelectionManager._updateFormBasedOnCurrentSelection();
        },
        _selectAllByType: (stimulusType) => {
            let anySelectedInThisAction = false;
            allGeneratedButtonsData.forEach(btnData => {
                if (btnData.element && btnData.type === stimulusType) {
                    if (!selectedButtonElements.has(btnData.element)) {
                        selectedButtonElements.add(btnData.element);
                        UI.updateButtonVisualSelection(btnData.element, true);
                        anySelectedInThisAction = true;
                    }
                }
            });
            if (anySelectedInThisAction) {
                mostRecentlySelectedButtonElementForForm = null;
                SelectionManager._updateFormBasedOnCurrentSelection();
            }
        },
        selectAllSingleStimulus: () => {
            SelectionManager._selectAllByType('single');
        },
        selectAllMultiStimulus: () => {
            SelectionManager._selectAllByType('multi');
        },
        populateCustomizeForm: (selectedButtonElement) => {
            const buttonData = allGeneratedButtonsData.find(b => b.element === selectedButtonElement);
            if (!buttonData) { SelectionManager.clearCustomizeForm(); return; }

            const sizeEl = getEl('specific-button-size');
            const bgColorEl = getEl('specific-button-bg-color');
            const textColorEl = getEl('specific-button-text-color');
            const prefixEl = getEl('specific-button-prefix');
            const labelEl = getEl('specific-custom-value');
            const shapeEl = getEl('specific-button-shape');

            if (sizeEl) { sizeEl.value = buttonData.currentSize || ''; sizeEl.placeholder = "Unchanged"; }
            if (bgColorEl) bgColorEl.value = buttonData.currentBgColor || '#78909c';
            if (textColorEl) textColorEl.value = buttonData.currentTextColor || '#ffffff';
            if (prefixEl) { prefixEl.value = buttonData.currentPrefix || ''; prefixEl.placeholder = "Prepend or set new"; }
            if (labelEl) { labelEl.value = buttonData.currentBaseLabel || ''; labelEl.placeholder = "Complete override"; }
            if (shapeEl) { shapeEl.value = buttonData.currentShape || ''; }
        },
        clearCustomizeForm: () => {
            const sizeEl = getEl('specific-button-size');
            const bgColorEl = getEl('specific-button-bg-color');
            const textColorEl = getEl('specific-button-text-color');
            const prefixEl = getEl('specific-button-prefix');
            const labelEl = getEl('specific-custom-value');
            const shapeEl = getEl('specific-button-shape');

            if (sizeEl) { sizeEl.value = ''; sizeEl.placeholder = "Unchanged"; }
            if (bgColorEl) bgColorEl.value = '#78909c';
            if (textColorEl) textColorEl.value = '#ffffff';
            if (prefixEl) { prefixEl.value = ''; prefixEl.placeholder = "Prepend or set new"; }
            if (labelEl) { labelEl.value = ''; labelEl.placeholder = "Complete override"; }
            if (shapeEl) shapeEl.value = '';
        }
    };

    const chroma = (hex) => {
        if (!hex || typeof hex !== 'string') hex = '#CCCCCC';
        try {
            const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
            if (!/^#[0-9A-F]{6}$/i.test(hex) && !/^#[0-9A-F]{8}$/i.test(hex)) hex = '#CCCCCC';
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
            if (!result) return { darken: () => ({ hex: () => '#AAAAAA' }), hex: () => hex };
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
                hex: () => hex.startsWith('#') ? hex.substring(0, 7) : `#${hex.substring(0, 6)}`
            };
        } catch (e) { return { darken: () => ({ hex: () => '#AAAAAA' }), hex: () => '#CCCCCC' }; }
    };

    const ButtonStyler = {
        apply: (buttonData, isSpecificUpdate = false, specificOverrides = {}) => {
            const el = buttonData.element;
            if (!el) return;

            let finalSize = buttonData.currentSize;
            let finalBgColor = buttonData.currentBgColor;
            let finalTextColor = buttonData.currentTextColor;
            let finalShape = buttonData.currentShape;
            let finalPrefix = buttonData.currentPrefix;
            let finalBaseLabel = buttonData.currentBaseLabel;

            if (isSpecificUpdate) {
                if (specificOverrides.size && specificOverrides.size.trim() !== "" && specificOverrides.size !== buttonData.currentSize) {
                    finalSize = specificOverrides.size;
                }
                if (specificOverrides.bgColor && specificOverrides.bgColor !== buttonData.currentBgColor) {
                    finalBgColor = specificOverrides.bgColor;
                }
                if (specificOverrides.textColor && specificOverrides.textColor !== buttonData.currentTextColor) {
                    finalTextColor = specificOverrides.textColor;
                }
                if (specificOverrides.shape && specificOverrides.shape.trim() !== "" && specificOverrides.shape !== buttonData.currentShape) {
                    finalShape = specificOverrides.shape;
                }
                const fullLabelOverride = specificOverrides.text;
                const prefixOverride = specificOverrides.prefix;
                if (typeof fullLabelOverride === 'string' && fullLabelOverride.trim() !== "" && fullLabelOverride !== buttonData.currentBaseLabel) {
                    finalBaseLabel = ContentUtil.sanitize(fullLabelOverride);
                }
                if (typeof prefixOverride === 'string' && prefixOverride !== buttonData.currentPrefix) {
                    finalPrefix = ContentUtil.sanitize(prefixOverride);
                }
            } else {
                finalPrefix = buttonData.initialPrefix;
                finalBaseLabel = buttonData.initialBaseLabel;
                finalSize = buttonData.initialSize;
                finalBgColor = buttonData.initialBgColor;
                finalTextColor = buttonData.initialTextColor;
                finalShape = buttonData.initialShape;
            }

            const newCurrentLabel = (finalPrefix || "") + (finalBaseLabel || "");

            buttonData.currentSize = finalSize;
            buttonData.currentBgColor = finalBgColor;
            buttonData.currentTextColor = finalTextColor;
            buttonData.currentLabel = newCurrentLabel;
            buttonData.currentPrefix = finalPrefix;
            buttonData.currentBaseLabel = finalBaseLabel;
            buttonData.currentShape = finalShape;

            if (finalSize) { el.style.setProperty('--btn-width', `${finalSize}px`); el.style.setProperty('--btn-height', `${finalSize}px`); }
            if (finalShape || (isSpecificUpdate && specificOverrides.shape === "")) {
                el.style.setProperty('--btn-border-radius', finalShape === "" && isSpecificUpdate ? "8px" : finalShape);
            } else if (!isSpecificUpdate && finalShape) {
                el.style.setProperty('--btn-border-radius', finalShape);
            }

            const safeBgColor = finalBgColor || '#CCCCCC';
            el.style.setProperty('--btn-bg-color', safeBgColor);
            el.style.setProperty('--btn-text-color', finalTextColor || '#000000');
            const baseChroma = chroma(safeBgColor);
            el.style.setProperty('--btn-border-color', baseChroma.darken(0.3).hex());
            el.style.setProperty('--btn-hover-bg-color', baseChroma.darken(0.2).hex());
            el.style.setProperty('--btn-hover-border-color', baseChroma.darken(0.5).hex());
            el.textContent = newCurrentLabel;

            if (finalSize) {
                const buttonDim = parseInt(finalSize, 10);
                let fontSize = Math.max(10, Math.min(buttonDim / 3.8, 18));
                if (!newCurrentLabel || !newCurrentLabel.trim()) {
                    fontSize = 0;
                } else {
                    const len = newCurrentLabel.length;
                    if (len > 4 && buttonDim < 70) fontSize = Math.max(8, buttonDim / (len * 0.90));
                    else if (len > 7 && buttonDim < 100) fontSize = Math.max(8, buttonDim / (len * 0.80));
                    else if (len > 10) fontSize = Math.max(8, buttonDim / (len * 0.70));
                }
                el.style.fontSize = `${fontSize}px`;
            }
        }
    };

    function collectButtonDataForFinalize(includePreviewHighlightColor = false) { // Added optional parameter
        const finalizedButtons = [];
        const currentPreviewHighlight = previewHighlightColorPicker ? previewHighlightColorPicker.value : '#2ecc71';


        allGeneratedButtonsData.forEach(btnData => {
            if (!btnData || !btnData.element || !selectedButtonElements.has(btnData.element)) {
                return;
            }

            const buttonElement = btnData.element;
            let stimulusFreqs = [];
            let rawStimData = [];

            if (btnData.type === 'multi' && buttonElement.dataset.noteCombination) {
                try {
                    const combination = JSON.parse(buttonElement.dataset.noteCombination);
                    rawStimData = Array.isArray(combination) ? combination : [];
                    stimulusFreqs = rawStimData
                        .map(item => parseFloat(item))
                        .filter(num => !isNaN(num));
                } catch (e) {
                    console.warn(`ButtonDesigner: Could not parse noteCombination for button ${btnData.id}`, e);
                    rawStimData = [];
                }
            }

            const visuals = {
                backgroundColor: btnData.currentBgColor || '#DDDDDD',
                textColor: btnData.currentTextColor || '#000000',
                size: btnData.currentSize ? `${btnData.currentSize}px` : '80px',
                shape: btnData.currentShape || '8px',
            };

            // If includePreviewHighlightColor is true, add it to visuals
            if (includePreviewHighlightColor) {
                visuals.previewHighlightColor = currentPreviewHighlight;
            }

            const stimulusParameters = {
                frequencies: stimulusFreqs,
                rawStimulusData: rawStimData,
                combinationType: btnData.type === 'multi' ? 'simultaneous' : undefined,
            };
            finalizedButtons.push({
                id: btnData.id,
                type: btnData.type === 'single' ? 'single-stimulus' : 'multi-stimulus',
                uiLabel: btnData.currentLabel || `Button ${btnData.id}`,
                visuals: visuals,
                stimulusParameters: stimulusParameters,
            });
        });
        return finalizedButtons;
    }

    function handleFinalizeAndUseButtons() {
        const designedButtonsArray = collectButtonDataForFinalize(); 

        if (designedButtonsArray.length === 0) {
            if (selectedButtonElements.size === 0 && allGeneratedButtonsData.length > 0) {
                 showFeedback('No buttons selected to finalize. Please select buttons from the preview.', 'warning');
            } else if (allGeneratedButtonsData.length === 0) {
                showFeedback('No buttons designed yet. Add and generate some buttons first.', 'warning');
            } else { 
                showFeedback('No suitable buttons available to finalize.', 'warning');
            }
            // Clear any previously stored buttons if none are finalized now
            setLatestDesignedGameButtons(null); // <-- ADD THIS LINE
            return;
        }

        eventBus.dispatch('gameButtonsDesigned', designedButtonsArray);
        setLatestDesignedGameButtons(designedButtonsArray); // <-- ADD THIS LINE
        console.log('Button Designer: "gameButtonsDesigned" event dispatched and data stored with app.js for selected buttons:', designedButtonsArray);
        showFeedback(`Successfully finalized ${designedButtonsArray.length} selected button(s). Data dispatched and stored.`, 'success');
    }


    function generateButtonsForSection(stimulusType) {
        const isSingle = stimulusType === 'single';
        const sizeInput = getEl(isSingle ? 'button-size-single' : 'button-size-multi');
        const bgColorInput = getEl(isSingle ? 'button-color-single' : 'button-color-multi');
        const textColorInput = getEl(isSingle ? 'text-color-single' : 'text-color-multi');
        const shapeInput = getEl(isSingle ? 'button-shape-single' : 'button-shape-multi');
        const prefixInput = getEl(isSingle ? 'label-prefix-single' : 'label-prefix-multi');

        const feedbackSizeEl = getEl(isSingle ? 'button-size-single-feedback' : 'button-size-multi-feedback');
        if (!sizeInput || !Validator.numeric(sizeInput, feedbackSizeEl)) return [];

        const newButtonsData = [];
        let itemsToProcess = [];
        const currentBatchPrefix = prefixInput ? prefixInput.value.trim() : "";

        if (isSingle) {
            const numInput = getEl('num-buttons-single');
            const feedbackNumEl = getEl('num-buttons-single-feedback');
            if (!numInput || !Validator.numeric(numInput, feedbackNumEl) || parseInt(numInput.value, 10) <= 0) {
                if (feedbackNumEl && numInput && (isNaN(parseInt(numInput.value, 10)) || parseInt(numInput.value, 10) <= 0)) {
                    feedbackNumEl.textContent = "Enter a number > 0.";
                } return [];
            }
            const numToGenerate = parseInt(numInput.value, 10);
            const textOptionSingleEl = getEl('text-option-single');
            const symbolTypeEl = getEl('label-type-single');
            if (!textOptionSingleEl || !symbolTypeEl) { console.error("ButtonDesigner: Missing single-stim label type/option elements."); return []; }
            const symbolType = symbolTypeEl.value;
            for (let i = 0; i < numToGenerate; i++) {
                const labelParts = ContentUtil.getSingleStimLabelParts(i, currentBatchPrefix, symbolType);
                itemsToProcess.push({ type: 'single', initialPrefix: labelParts.prefix, initialBaseLabel: labelParts.base });
            }
        } else {
            if (!combinationsDirectoryContainer) { console.error("ButtonDesigner: Combinations directory container not found."); return []; }
            queryAll('#combinations-directory-container input[type="checkbox"]:checked').forEach(cb => {
                const labelParts = ContentUtil.getMultiStimLabelParts(cb.dataset.lexId, currentBatchPrefix);
                itemsToProcess.push({ type: 'multi', combo: JSON.parse(cb.dataset.combination), initialPrefix: labelParts.prefix, initialBaseLabel: labelParts.base });
            });
            const multiStimToggleFieldsetEl = getEl('toggle-multi-stim-fieldset');
            const multiStimGenerateToggleEl = getEl('generate-multi-stim-buttons-toggle');
            if (itemsToProcess.length === 0 && multiStimToggleFieldsetEl && multiStimToggleFieldsetEl.checked && multiStimGenerateToggleEl && multiStimGenerateToggleEl.checked) {
                showFeedback("No multi-stimulus combinations selected to generate.", "info");
                return [];
            }
        }
        if (itemsToProcess.length === 0) return [];

        for (let i = 0; i < itemsToProcess.length; i++) {
            const item = itemsToProcess[i];
            const buttonElement = document.createElement("button");
            buttonElement.className = "generated-button";
            const uniqueId = `${item.type}-${Date.now()}-${allGeneratedButtonsData.length + newButtonsData.length + i}`;
            buttonElement.dataset.buttonId = uniqueId;
            buttonElement.dataset.stimulusType = item.type;
            if (item.type === 'multi') {
                buttonElement.dataset.noteCombination = JSON.stringify(item.combo);
            }

            const btnData = {
                id: uniqueId, element: buttonElement, type: item.type,
                initialPrefix: item.initialPrefix, initialBaseLabel: item.initialBaseLabel,
                currentLabel: item.initialPrefix + item.initialBaseLabel,
                currentPrefix: item.initialPrefix, currentBaseLabel: item.initialBaseLabel,
                initialSize: sizeInput ? sizeInput.value : "80",
                currentSize: sizeInput ? sizeInput.value : "80",
                initialBgColor: bgColorInput ? bgColorInput.value : "#CCCCCC",
                currentBgColor: bgColorInput ? bgColorInput.value : "#CCCCCC",
                initialTextColor: textColorInput ? textColorInput.value : "#000000",
                currentTextColor: textColorInput ? textColorInput.value : "#000000",
                initialShape: shapeInput ? shapeInput.value : "8px",
                currentShape: shapeInput ? shapeInput.value : "8px"
            };
            ButtonStyler.apply(btnData, false);
            buttonElement.addEventListener('click', (e) => SelectionManager.toggleSelectionByElement(e.currentTarget));
            newButtonsData.push(btnData);
        }
        return newButtonsData;
    }

    function handleGenerateAll() {
        let newButtons = [];
        const singleGenerateToggleEl = getEl('generate-single-stim-buttons-toggle');
        const singleFieldsetToggleEl = getEl('toggle-single-stim-fieldset');
        const multiGenerateToggleEl = getEl('generate-multi-stim-buttons-toggle');
        const multiFieldsetToggleEl = getEl('toggle-multi-stim-fieldset');
        if (singleGenerateToggleEl && singleGenerateToggleEl.checked && singleFieldsetToggleEl && singleFieldsetToggleEl.checked) {
            newButtons = newButtons.concat(generateButtonsForSection('single'));
        }
        if (multiGenerateToggleEl && multiGenerateToggleEl.checked && multiFieldsetToggleEl && multiFieldsetToggleEl.checked) {
            newButtons = newButtons.concat(generateButtonsForSection('multi'));
        }
        if (newButtons.length > 0) {
            allGeneratedButtonsData.push(...newButtons);
            newButtons.forEach(btnData => { if (previewContainer) previewContainer.appendChild(btnData.element); });
            UI.populateButtonSelectorDropdown();
            showFeedback(`${newButtons.length} button(s) generated and added to preview.`, 'info');
        } else {
            showFeedback("No buttons generated. Check toggles and ensure sections are configured.", "info");
        }
    }

    function handleClearAllPreview() {
        if (previewContainer) previewContainer.innerHTML = '';
        allGeneratedButtonsData = [];
        SelectionManager.deselectAll();
        UI.populateButtonSelectorDropdown();
        showFeedback("All buttons cleared from preview.", "info");
    }

    function handleDeleteSelectedButtons() {
        if (selectedButtonElements.size === 0) {
            showFeedback("No buttons selected to delete.", "warning");
            return;
        }
        const idsToDelete = new Set();
        let lastClickedWasDeleted = false;

        selectedButtonElements.forEach(element => {
            idsToDelete.add(element.dataset.buttonId);
            if (previewContainer && element.parentNode === previewContainer) { previewContainer.removeChild(element); }
            if (element === mostRecentlySelectedButtonElementForForm) {
                lastClickedWasDeleted = true;
            }
        });

        allGeneratedButtonsData = allGeneratedButtonsData.filter(btnData => !idsToDelete.has(btnData.id));
        selectedButtonElements.clear();

        if (lastClickedWasDeleted) {
            mostRecentlySelectedButtonElementForForm = null;
        }

        UI.populateButtonSelectorDropdown();
        SelectionManager._updateFormBasedOnCurrentSelection();
        showFeedback(`${idsToDelete.size} button(s) deleted.`, "info");
    }

    function handleApplyToSelected() {
        if (selectedButtonElements.size === 0) {
            showFeedback("No buttons selected to apply custom styles to.", "warning");
            return;
        }

        const specificSizeInput = getEl('specific-button-size');
        const specificPrefixInput = getEl('specific-button-prefix');
        const specificFullLabelInput = getEl('specific-custom-value');
        const specificBgColorInput = getEl('specific-button-bg-color');
        const specificTextColorInput = getEl('specific-button-text-color');
        const specificShapeInput = getEl('specific-button-shape');

        const specificSizeVal = specificSizeInput ? specificSizeInput.value.trim() : "";
        if (specificSizeInput && specificSizeVal !== "" && !Validator.numeric(specificSizeInput, getEl('specific-button-size-feedback'), true)) {
            return;
        }

        const overrides = {};
        let formInteracted = false;

        if (specificSizeInput && specificSizeVal !== "") {
            overrides.size = specificSizeVal;
            formInteracted = true;
        }
        if (specificBgColorInput && specificBgColorInput.value !== '#78909c') {
            overrides.bgColor = specificBgColorInput.value;
            formInteracted = true;
        } else if (specificBgColorInput && selectedButtonElements.size === 1 && mostRecentlySelectedButtonElementForForm) {
            const btnData = allGeneratedButtonsData.find(b => b.element === mostRecentlySelectedButtonElementForForm);
            if (btnData && specificBgColorInput.value !== btnData.currentBgColor) {
                overrides.bgColor = specificBgColorInput.value;
                formInteracted = true;
            }
        } else if (specificBgColorInput && specificBgColorInput.value === '#78909c' && selectedButtonElements.size > 1) {
            overrides.bgColor = specificBgColorInput.value;
            formInteracted = true;
        }

        if (specificTextColorInput && specificTextColorInput.value !== '#ffffff') {
            overrides.textColor = specificTextColorInput.value;
            formInteracted = true;
        } else if (specificTextColorInput && selectedButtonElements.size === 1 && mostRecentlySelectedButtonElementForForm) {
            const btnData = allGeneratedButtonsData.find(b => b.element === mostRecentlySelectedButtonElementForForm);
            if (btnData && specificTextColorInput.value !== btnData.currentTextColor) {
                overrides.textColor = specificTextColorInput.value;
                formInteracted = true;
            }
        } else if (specificTextColorInput && specificTextColorInput.value === '#ffffff' && selectedButtonElements.size > 1) {
            overrides.textColor = specificTextColorInput.value;
            formInteracted = true;
        }

        if (specificPrefixInput) {
            const prefixVal = specificPrefixInput.value;
            let applyPrefix = false;
            if (selectedButtonElements.size === 1 && mostRecentlySelectedButtonElementForForm) {
                const btnData = allGeneratedButtonsData.find(b => b.element === mostRecentlySelectedButtonElementForForm);
                if (btnData && prefixVal !== (btnData.currentPrefix || "")) {
                    applyPrefix = true;
                }
            } else if (prefixVal !== "" || (specificPrefixInput.placeholder === "Multiple values" && prefixVal === "") || selectedButtonElements.size > 1) {
                applyPrefix = true;
            }
            if (applyPrefix) {
                overrides.prefix = prefixVal;
                formInteracted = true;
            }
        }

        if (specificFullLabelInput) {
            const labelVal = specificFullLabelInput.value;
            let applyLabel = false;
            if (selectedButtonElements.size === 1 && mostRecentlySelectedButtonElementForForm) {
                const btnData = allGeneratedButtonsData.find(b => b.element === mostRecentlySelectedButtonElementForForm);
                if (btnData && labelVal !== (btnData.currentBaseLabel || "")) {
                    applyLabel = true;
                }
            } else if (labelVal !== "" || (specificFullLabelInput.placeholder === "Multiple values" && labelVal === "") || selectedButtonElements.size > 1) {
                applyLabel = true;
            }
            if (applyLabel) {
                overrides.text = labelVal;
                formInteracted = true;
            }
        }

        if (specificShapeInput && specificShapeInput.value !== "") {
            overrides.shape = specificShapeInput.value;
            formInteracted = true;
        }

        if (!formInteracted && Object.keys(overrides).length === 0) {
            if (Object.keys(overrides).length === 0) {
                showFeedback("No explicit style changes in 'Customize' form to apply.", "info");
                return;
            }
        }

        let appliedCount = 0;
        selectedButtonElements.forEach(element => {
            const buttonData = allGeneratedButtonsData.find(b => b.element === element);
            if (buttonData) {
                ButtonStyler.apply(buttonData, true, overrides);
                appliedCount++;
            }
        });

        UI.populateButtonSelectorDropdown();
        SelectionManager._updateFormBasedOnCurrentSelection();
        if (appliedCount > 0) {
            showFeedback(`Custom styles applied to ${appliedCount} button(s).`, 'success');
        }
    }

    function handleClearBaseNoteDefinitions() {
        const currentNInput = getEl('num-base-notes');
        const currentN = currentNInput ? parseInt(currentNInput.value, 10) : 0;
        if (baseNotesInputsContainer) {
            const inputs = baseNotesInputsContainer.querySelectorAll('.base-note-definition');
            inputs.forEach(input => input.value = '');
        }
        if (!isNaN(currentN) && baseNotesMemory[currentN]) { delete baseNotesMemory[currentN]; }
        if (combinationsDirectoryContainer) combinationsDirectoryContainer.innerHTML = '<small>Define base notes and click "List Possible Combinations".</small>';
        if (totalCombinationsDisplay) totalCombinationsDisplay.textContent = 'Total Combinations Found: 0';
    }

    function handleGenerateCombinations() {
        const numBaseNotesInput = getEl('num-base-notes');
        const kInput = getEl('num-notes-per-combo');
        if (!numBaseNotesInput || !kInput || !Validator.numeric(numBaseNotesInput, getEl('num-base-notes-feedback')) || !Validator.numeric(kInput, getEl('num-notes-per-combo-feedback'))) return;
        const numBaseNotes = parseInt(numBaseNotesInput.value, 10);
        const k = parseInt(kInput.value, 10);
        const kFeedbackEl = getEl('num-notes-per-combo-feedback');
        if (k > numBaseNotes) {
            if (kFeedbackEl) kFeedbackEl.textContent = "K cannot exceed N.";
            if (totalCombinationsDisplay) totalCombinationsDisplay.textContent = 'Total Combinations Found: 0';
            UI.displayCombinations([], k);
            return;
        }
        if (k < (parseInt(kInput.min) || 1)) {
            if (kFeedbackEl) kFeedbackEl.textContent = `Min K: ${kInput.min || 1}.`;
            if (totalCombinationsDisplay) totalCombinationsDisplay.textContent = 'Total Combinations Found: 0';
            UI.displayCombinations([], k);
            return;
        }
        if (kFeedbackEl) kFeedbackEl.textContent = "";

        const baseNoteElements = queryAll('#base-notes-inputs-container .base-note-definition');
        const definedNotes = Array.from(baseNoteElements).map(input => input.value.trim()).filter(value => value !== "");

        if (definedNotes.length !== numBaseNotes) {
            if (totalCombinationsDisplay) {
                totalCombinationsDisplay.textContent = 'Total Combinations Found: 0';
                if (combinationsDirectoryContainer) combinationsDirectoryContainer.innerHTML = `<small class="validation-message">Please define all ${numBaseNotes} base notes.</small>`;
            }
            return;
        }
        if (new Set(definedNotes).size !== definedNotes.length) {
            if (totalCombinationsDisplay) {
                totalCombinationsDisplay.textContent = 'Total Combinations Found: 0';
                if (combinationsDirectoryContainer) combinationsDirectoryContainer.innerHTML = `<small class="validation-message">Base notes/frequencies must be unique.</small>`;
            }
            return;
        }
        const typeRadio = query('input[name="base-note-type"]:checked');
        const isNumericInputType = typeRadio ? typeRadio.value === 'frequency' : false;
        const combinations = Combinatorics.getCombinations(definedNotes, k);
        const sortedCombinations = Combinatorics.lexicographicalSort(combinations, isNumericInputType);
        UI.displayCombinations(sortedCombinations, k);
    }

    function setupEventListeners() {
        const addSafeListener = (id, event, handler, options = {}) => {
            const el = getEl(id);
            if (el) {
                el.addEventListener(event, handler, options);
            } else {
                // console.warn(`ButtonDesigner: Element with ID '${id}' not found for event listener.`);
            }
        };

        const toggleSingleEl = getEl('toggle-single-stim-fieldset');
        if (toggleSingleEl && singleStimFieldset) toggleSingleEl.addEventListener('change', (e) => UI.toggleSectionVisibility(singleStimFieldset, e.target.checked));
        const toggleMultiEl = getEl('toggle-multi-stim-fieldset');
        if (toggleMultiEl && multiStimFieldset) toggleMultiEl.addEventListener('change', (e) => UI.toggleSectionVisibility(multiStimFieldset, e.target.checked));

        addSafeListener('num-base-notes', 'input', UI.generateBaseNoteInputs);
        queryAll('input[name="base-note-type"]').forEach(radio => {
            radio.addEventListener('change', UI.generateBaseNoteInputs);
        });
        addSafeListener('clear-base-note-definitions-btn', 'click', handleClearBaseNoteDefinitions);
        addSafeListener('generate-combinations-btn', 'click', handleGenerateCombinations);

        addSafeListener('generate-all-buttons', 'click', handleGenerateAll);
        addSafeListener('apply-to-selected-btn', 'click', handleApplyToSelected);
        addSafeListener('delete-selected-buttons', 'click', handleDeleteSelectedButtons);
        addSafeListener('clear-all-preview-btn', 'click', handleClearAllPreview);

        if (finalizeAndUseButtonsBtn) {
            finalizeAndUseButtonsBtn.addEventListener('click', handleFinalizeAndUseButtons);
            finalizeAndUseButtonsBtn.disabled = false;
        } else {
            console.error("ButtonDesigner: CRITICAL - 'Finalize & Use Buttons' button (#finalize-and-use-buttons-btn) not found in setupEventListeners.");
        }

        // CORRECTED EVENT LISTENER SETUP for the color picker
        if (previewHighlightColorPicker) { // Check if the element was found
            previewHighlightColorPicker.addEventListener('input', (event) => {
                if (viewContentElement) { // Ensure viewContentElement is still valid
                    viewContentElement.style.setProperty('--preview-select-glow', event.target.value);
                }
            });
        } else {
            // console.warn("ButtonDesigner: Preview highlight color picker (#preview-highlight-color) not found. Listener not attached.");
        }


        if (buttonSelectorTrigger) {
            buttonSelectorTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = getEl('button-number-container');
                if (!menu) return;
                const isExpanded = buttonSelectorTrigger.getAttribute('aria-expanded') === 'true';
                buttonSelectorTrigger.setAttribute('aria-expanded', (!isExpanded).toString());
                menu.classList.toggle('show');
                buttonSelectorTrigger.classList.toggle('active');
            });
        }

        if (boundWindowClickListener) {
            window.removeEventListener('click', boundWindowClickListener);
        }
        boundWindowClickListener = (event) => {
            const menu = getEl('button-number-container');
            const currentButtonSelectorTrigger = getEl('button-selector-trigger');
            if (menu && menu.classList.contains('show')) {
                if (currentButtonSelectorTrigger && !currentButtonSelectorTrigger.contains(event.target) && !menu.contains(event.target)) {
                    menu.classList.remove('show');
                    currentButtonSelectorTrigger.setAttribute('aria-expanded', 'false');
                    currentButtonSelectorTrigger.classList.remove('active');
                }
            }
        };
        window.addEventListener('click', boundWindowClickListener);

        addSafeListener('select-all-btn', 'click', (e) => { e.stopPropagation(); SelectionManager.selectAll(); });
        addSafeListener('deselect-all-btn', 'click', (e) => { e.stopPropagation(); SelectionManager.deselectAll(); });
        addSafeListener('select-all-single-stim-btn', 'click', (e) => { e.stopPropagation(); SelectionManager.selectAllSingleStimulus(); });
        addSafeListener('select-all-multi-stim-btn', 'click', (e) => { e.stopPropagation(); SelectionManager.selectAllMultiStimulus(); });

        const inputsToValidateConfig = [
            { id: 'num-buttons-single', feedbackId: 'num-buttons-single-feedback', empty: false },
            { id: 'button-size-single', feedbackId: 'button-size-single-feedback', empty: false },
            { id: 'num-base-notes', feedbackId: 'num-base-notes-feedback', empty: false },
            { id: 'num-notes-per-combo', feedbackId: 'num-notes-per-combo-feedback', empty: false },
            { id: 'button-size-multi', feedbackId: 'button-size-multi-feedback', empty: false },
            { id: 'specific-button-size', feedbackId: 'specific-button-size-feedback', empty: true }
        ];
        inputsToValidateConfig.forEach(itemConf => {
            const el = getEl(itemConf.id);
            const fb = getEl(itemConf.feedbackId);
            if (el) el.addEventListener('input', () => Validator.numeric(el, fb, itemConf.empty));
        });
    }

    function initializeAppScoped() {
        finalizeAndUseButtonsBtn = getEl('finalize-and-use-buttons-btn');
        buttonDesignerFeedbackEl = getEl('button-designer-feedback');
        previewHighlightColorPicker = getEl('preview-highlight-color'); // Query for the element

        if (!viewContentElement) {
            console.error("ButtonDesigner: CRITICAL - viewContentElement is null. Cannot initialize.");
            return;
        }
        if (!finalizeAndUseButtonsBtn) {
            console.warn("ButtonDesigner: 'Finalize & Use Buttons' button (#finalize-and-use-buttons-btn) not found on init.");
        }
        if (!buttonDesignerFeedbackEl) {
            console.warn("ButtonDesigner: Feedback element (#button-designer-feedback) not found on init.");
        }

        // CORRECTED INITIALIZATION for the color picker
        if (previewHighlightColorPicker) { // Check if the element was successfully found
            // Set the initial CSS variable value from the picker's current value
            viewContentElement.style.setProperty('--preview-select-glow', previewHighlightColorPicker.value);
        } else {
            console.warn("ButtonDesigner: Preview highlight color picker (#preview-highlight-color) not found on init. Feature will be disabled.");
        }

        setupEventListeners();

        const toggleSingleEl = getEl('toggle-single-stim-fieldset');
        if (toggleSingleEl && singleStimFieldset) UI.toggleSectionVisibility(singleStimFieldset, toggleSingleEl.checked);
        const toggleMultiEl = getEl('toggle-multi-stim-fieldset');
        if (toggleMultiEl && multiStimFieldset) UI.toggleSectionVisibility(multiStimFieldset, toggleMultiEl.checked);

        UI.populateButtonSelectorDropdown();
        UI.generateBaseNoteInputs();

        const initialValidationConf = [
            { id: 'num-buttons-single', feedbackId: 'num-buttons-single-feedback' },
            { id: 'button-size-single', feedbackId: 'button-size-single-feedback' },
            { id: 'num-notes-per-combo', feedbackId: 'num-notes-per-combo-feedback' },
            { id: 'button-size-multi', feedbackId: 'button-size-multi-feedback' }
        ];
        initialValidationConf.forEach(conf => {
            const el = getEl(conf.id);
            if (el && el.value) Validator.numeric(el, getEl(conf.feedbackId));
        });
        const specSizeEl = getEl('specific-button-size');
        if (specSizeEl) Validator.numeric(specSizeEl, getEl('specific-button-size-feedback'), true);

        SelectionManager.clearCustomizeForm();
        console.log("ButtonDesigner: JS initialized (with Data Finalization & Transport, Preview Highlight Color Picker)."); // Updated log
    }

    function cleanup() {
        if (boundWindowClickListener) {
            window.removeEventListener('click', boundWindowClickListener);
            boundWindowClickListener = null;
        }
        if (feedbackTimeout) {
            clearTimeout(feedbackTimeout);
            feedbackTimeout = null;
        }
        console.log("ButtonDesigner: Cleaned up listeners.");
    }

    if (!viewContentElement || typeof viewContentElement.querySelector !== 'function') {
        console.error("ButtonDesigner: Initialization failed. Invalid viewContentElement provided:", viewContentElement);
        return { cleanup: () => {} };
    }

    initializeAppScoped();

    return {
        cleanup
    };
}