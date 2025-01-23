class ConfigurationViewModel {
    constructor() {
        // Data
        this.connectors = [];
        this.tools = [];
        
        // UI Elements
        this.connectorSearchBox = document.getElementById('connector-search');
        this.connectorResults = document.getElementById('connector-results');
        this.toolSearchBox = document.getElementById('tool-search');
        this.toolResults = document.getElementById('tool-results');

        // Hide results containers initially
        if (this.connectorResults) this.connectorResults.style.display = 'none';
        if (this.toolResults) this.toolResults.style.display = 'none';

        // Initialize state with default values
        this.initializeState();

        // Add new properties
        this.studHoleValues = [];
        this.studHoleSlider = null;
        this.studHoleLabel = null;

        // Add new properties for selected items
        this.selectedConnector = null;
        this.selectedTool = null;
        
        // Add references to display containers
        this.selectedConnectorDisplay = document.getElementById('selected-connector-display');
        this.selectedToolDisplay = document.getElementById('selected-tool-display');

        // Add new property to track search state
        this.isSearching = false;
    }

    initializeState() {
        // Get default material selection
        const selectedMaterialRadio = document.querySelector('.material-option input[type="radio"]:checked');
        this.selectedMaterial = selectedMaterialRadio ? selectedMaterialRadio.value : null;
        console.log('Initial material:', this.selectedMaterial);

        // Get default conductor type selection - extract just the class number
        const selectedConductorType = document.querySelector('.conductor-types .conductor-type.selected');
        console.log('Found conductor type element:', selectedConductorType);
        if (selectedConductorType) {
            const fullType = selectedConductorType.getAttribute('data-type') || 
                           selectedConductorType.getAttribute('data-conductor-type') || 
                           selectedConductorType.dataset.type ||
                           selectedConductorType.textContent.trim();
            
            // Extract just the class number (e.g., "Class 2" from "Class 2Multi-Stranded")
            this.selectedConductorType = fullType.match(/Class \d+/)?.[0] || 'Class 2';
            console.log('Parsed conductor type:', this.selectedConductorType);
        } else {
            this.selectedConductorType = 'Class 2'; // Default
        }

        // Get default connector type selection
        const selectedConnectorType = document.querySelector('.connector-type.selected');
        this.selectedConnectorType = selectedConnectorType ? selectedConnectorType.textContent.trim() : 'Cable Lug';
        console.log('Initial connector type:', this.selectedConnectorType);

        // Get default cross section value
        const crossSectionSlider = document.querySelector('.cross-section-slider');
        this.selectedCrossSection = crossSectionSlider ? parseFloat(crossSectionSlider.value) : null;
        console.log('Initial cross section:', this.selectedCrossSection);

        // Get default stud hole value
        const studHoleSlider = document.querySelector('.stud-hole-slider');
        this.selectedStudHole = studHoleSlider ? parseFloat(studHoleSlider.value) : null;
        console.log('Initial stud hole:', this.selectedStudHole);

        // Get default selections
        this.selectedConnector = null;
        this.selectedTool = null;

        // Log final state
        console.log('Initial state:', {
            material: this.selectedMaterial,
            conductorType: this.selectedConductorType,
            connectorType: this.selectedConnectorType,
            crossSection: this.selectedCrossSection,
            studHole: this.selectedStudHole
        });
    }

    async initialize() {
        try {
            // Load and parse CSV data
            const [connectorsResponse, toolsResponse] = await Promise.all([
                fetch('documentation/Connectors_compatible_tools_with_images.csv'),
                fetch('documentation/klauke_products_with_details.csv')
            ]);

            const [connectorsText, toolsText] = await Promise.all([
                connectorsResponse.text(),
                toolsResponse.text()
            ]);

            // Parse CSV using Papa Parse with error handling
            const connectorsResult = Papa.parse(connectorsText, { header: true });
            const toolsResult = Papa.parse(toolsText, { header: true });

            if (connectorsResult.errors.length) {
                console.warn('Connector CSV parsing errors:', connectorsResult.errors);
            }
            if (toolsResult.errors.length) {
                console.warn('Tools CSV parsing errors:', toolsResult.errors);
            }

            this.connectors = connectorsResult.data.filter(Boolean);
            this.tools = toolsResult.data.filter(Boolean);

            console.log(`Loaded ${this.connectors.length} connectors and ${this.tools.length} tools`);

            // Update cross section slider with values from connectors data
            this.updateCrossSectionValues();

            // Add after updateCrossSectionValues():
            this.updateStudHoleValues();

            // Initialize event listeners after data is loaded
            this.initializeEventListeners();
            
            // Initial update with current state
            this.updateCompatibility();
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.connectors = [];
            this.tools = [];
        }
    }

    updateCrossSectionValues() {
        console.log('Starting updateCrossSectionValues');
        
        // Use IDs for precise element selection
        const crossSectionSlider = document.getElementById('cross-section-slider');
        const crossSectionLabel = document.getElementById('cross-section-value');

        console.log('Found elements:', {
            slider: crossSectionSlider ? 'yes' : 'no',
            label: crossSectionLabel ? 'yes' : 'no'
        });

        if (!crossSectionSlider) {
            console.error('Cross section slider not found. Make sure element with id="cross-section-slider" exists');
            return;
        }
        if (!crossSectionLabel) {
            console.error('Cross section label not found. Make sure element with id="cross-section-value" exists');
            return;
        }

        // Get unique nominal cross section values
        const crossSections = new Set();
        this.connectors.forEach(connector => {
            const nominalCrossSection = connector['Nominal cross section mm²'];
            if (nominalCrossSection) {
                const value = parseFloat(nominalCrossSection);
                if (!isNaN(value)) {
                    crossSections.add(value);
                }
            }
        });

        const sortedCrossSections = Array.from(crossSections).sort((a, b) => a - b);
        console.log('Available cross sections:', sortedCrossSections);

        // Store the sorted values
        this.crossSectionValues = sortedCrossSections;

        // Update slider attributes
        crossSectionSlider.min = 0;
        crossSectionSlider.max = sortedCrossSections.length - 1;
        crossSectionSlider.step = 1;
        crossSectionSlider.value = 0;

        // Set initial value and update label
        this.selectedCrossSection = sortedCrossSections[0];
        this.updateCrossSectionLabel(crossSectionLabel, sortedCrossSections[0]);

        // Store references
        this.crossSectionSlider = crossSectionSlider;
        this.crossSectionLabel = crossSectionLabel;

        // Add event listener here instead of in initializeEventListeners
        crossSectionSlider.addEventListener('input', (e) => {
            const index = Math.round(parseFloat(e.target.value));
            const actualValue = this.crossSectionValues[index];
            this.selectedCrossSection = actualValue;
            this.updateCrossSectionLabel(crossSectionLabel, actualValue);
            console.log('Cross section changed:', this.selectedCrossSection);
            this.updateCompatibility();
        });

        // Setup datalist for tick marks
        this.setupCrossSectionDatalist(crossSectionSlider, sortedCrossSections);
    }

    updateCrossSectionLabel(label, value) {
        if (!label) {
            console.error('Label element not found in updateCrossSectionLabel');
            return;
        }
        label.innerHTML = `${value} <span class="unit">mm²</span>`;
        console.log('Updating label text to:', value);
    }

    setupCrossSectionDatalist(slider, values) {
        let datalistId = 'cross-section-values';
        let datalist = document.getElementById(datalistId);
        
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            slider.parentNode.appendChild(datalist);
        } else {
            datalist.innerHTML = '';
        }

        values.forEach((value, index) => {
            const option = document.createElement('option');
            option.value = index;
            datalist.appendChild(option);
        });

        slider.setAttribute('list', datalistId);
    }

    updateStudHoleValues() {
        console.log('Starting updateStudHoleValues');
        
        const studHoleSlider = document.getElementById('stud-hole-slider');
        const studHoleLabel = document.getElementById('stud-hole-value');

        console.log('Found elements:', {
            slider: studHoleSlider ? 'yes' : 'no',
            label: studHoleLabel ? 'yes' : 'no'
        });

        if (!studHoleSlider || !studHoleLabel) {
            console.error('Stud hole elements not found');
            return;
        }

        // Get unique stud hole values
        const studHoles = new Set();
        this.connectors.forEach(connector => {
            const studHole = connector['Stud hole'];
            if (studHole) {
                const value = parseFloat(studHole);
                if (!isNaN(value)) {
                    studHoles.add(value);
                }
            }
        });

        const sortedStudHoles = Array.from(studHoles).sort((a, b) => a - b);
        console.log('Available stud holes:', sortedStudHoles);

        // Store the sorted values
        this.studHoleValues = sortedStudHoles;

        // Update slider attributes
        studHoleSlider.min = 0;
        studHoleSlider.max = sortedStudHoles.length - 1;
        studHoleSlider.step = 1;
        studHoleSlider.value = 0;

        // Set initial value and update label
        this.selectedStudHole = sortedStudHoles[0];
        this.updateStudHoleLabel(studHoleLabel, sortedStudHoles[0]);

        // Store references
        this.studHoleSlider = studHoleSlider;
        this.studHoleLabel = studHoleLabel;

        // Add event listener
        studHoleSlider.addEventListener('input', (e) => {
            const index = Math.round(parseFloat(e.target.value));
            const actualValue = this.studHoleValues[index];
            this.selectedStudHole = actualValue;
            this.updateStudHoleLabel(studHoleLabel, actualValue);
            console.log('Stud hole changed:', this.selectedStudHole);
            this.updateCompatibility();
        });

        // Setup datalist for tick marks
        this.setupStudHoleDatalist(studHoleSlider, sortedStudHoles);
    }

    updateStudHoleLabel(label, value) {
        if (!label) {
            console.error('Label element not found in updateStudHoleLabel');
            return;
        }
        label.innerHTML = `${value} <span class="unit">mm</span>`;
        console.log('Updating stud hole label text to:', value);
    }

    setupStudHoleDatalist(slider, values) {
        let datalistId = 'stud-hole-values';
        let datalist = document.getElementById(datalistId);
        
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            slider.parentNode.appendChild(datalist);
        } else {
            datalist.innerHTML = '';
        }

        values.forEach((value, index) => {
            const option = document.createElement('option');
            option.value = index;
            datalist.appendChild(option);
        });

        slider.setAttribute('list', datalistId);
    }

    initializeEventListeners() {
        // Material selection
        document.querySelectorAll('.material-option input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.selectedMaterial = radio.value;
                console.log('Material selected:', this.selectedMaterial);
                this.updateCompatibility();
            });
        });

        // Cross section changes
        if (this.crossSectionSlider) {
            this.crossSectionSlider.addEventListener('input', (e) => {
                const index = Math.round(parseFloat(e.target.value));
                const actualValue = this.crossSectionValues[index];
                this.selectedCrossSection = actualValue;
                if (this.crossSectionLabel) {
                    this.updateCrossSectionLabel(this.crossSectionLabel, actualValue);
                }
                console.log('Cross section changed:', this.selectedCrossSection);
                this.updateCompatibility();
            });
        }

        // Conductor type selection (round/sector)
        const conductorTypes = document.querySelectorAll('.conductor-types .conductor-type');
        conductorTypes.forEach(type => {
            type.addEventListener('click', (e) => {
                e.preventDefault();
                conductorTypes.forEach(t => t.classList.remove('selected'));
                type.classList.add('selected');
                
                // Extract just the class number from the full type
                const fullType = type.getAttribute('data-type') || 
                               type.getAttribute('data-conductor-type') || 
                               type.dataset.type ||
                               type.textContent.trim();
                               
                this.selectedConductorType = fullType.match(/Class \d+/)?.[0] || 'Class 2';
                console.log('Selected conductor type:', this.selectedConductorType);
                this.updateCompatibility();
            });
        });

        // Connector type selection (Cable Lug, Connector, Wire Ferrule)
        const connectorTypes = document.querySelectorAll('.connector-type');
        console.log('Found connector type buttons:', connectorTypes.length);
        
        connectorTypes.forEach(type => {
            console.log('Setting up listener for connector type:', type.textContent.trim());
            type.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Connector type clicked:', type.textContent.trim());
                
                // Remove selected class from all connector types
                connectorTypes.forEach(t => t.classList.remove('selected'));
                
                // Add selected class to clicked type
                type.classList.add('selected');
                
                // Update selected connector type
                this.selectedConnectorType = type.textContent.trim();
                console.log('Selected connector type:', this.selectedConnectorType);
                
                // Update compatibility
                this.updateCompatibility();

                // Show/hide stud hole section based on connector type
                const isLug = type.textContent.trim() === 'Cable Lug';
                const studHoleSection = document.querySelector('.section:has(.stud-hole-slider)');
                studHoleSection.style.display = isLug ? 'block' : 'none';
            });
        });

        // Initially hide stud hole if Cable Lug is not selected
        const initiallySelected = document.querySelector('.connector-type.selected');
        if (initiallySelected) {
            const isLug = initiallySelected.textContent.trim() === 'Cable Lug';
            const studHoleSection = document.querySelector('.section:has(.stud-hole-slider)');
            studHoleSection.style.display = isLug ? 'block' : 'none';
        }

        // Update connector search box handlers
        if (this.connectorSearchBox) {
            this.connectorSearchBox.addEventListener('focus', () => {
                this.updateConnectorResults();
                this.connectorResults.style.display = 'block';
                this.isSearching = true;
            });

            this.connectorSearchBox.addEventListener('blur', (e) => {
                this._blurTimeout = setTimeout(() => {
                    if (!this.connectorResults.contains(document.activeElement)) {
                        this.connectorResults.style.display = 'none';
                        this.isSearching = false;
                    }
                }, 100);
            });

            this.connectorSearchBox.addEventListener('input', () => {
                this.updateConnectorResults();
                this.connectorResults.style.display = 'block';
                this.isSearching = true;
            });
        }

        // Update tool search box handlers
        if (this.toolSearchBox) {
            this.toolSearchBox.addEventListener('focus', () => {
                this.updateToolResults();
                this.toolResults.style.display = 'block';
                this.isSearching = true;
            });

            this.toolSearchBox.addEventListener('blur', (e) => {
                this._blurTimeout = setTimeout(() => {
                    if (!this.toolResults.contains(document.activeElement)) {
                        this.toolResults.style.display = 'none';
                        this.isSearching = false;
                    }
                }, 100);
            });

            this.toolSearchBox.addEventListener('input', () => {
                this.updateToolResults();
                this.toolResults.style.display = 'block';
                this.isSearching = true;
            });
        }

        // Remove old click event listeners for document
        // Add new click handlers for outside clicks
        document.addEventListener('click', (e) => {
            if (!this.connectorSearchBox?.contains(e.target) && 
                !this.connectorResults?.contains(e.target)) {
                this.connectorResults.style.display = 'none';
            }
            if (!this.toolSearchBox?.contains(e.target) && 
                !this.toolResults?.contains(e.target)) {
                this.toolResults.style.display = 'none';
            }
        });
    }

    updateCompatibility() {
        // Clear selected items
        this.selectedConnector = null;
        this.selectedTool = null;

        // Clear and show search boxes
        if (this.connectorSearchBox) {
            this.connectorSearchBox.style.display = 'block';
            this.connectorSearchBox.value = '';
        }
        if (this.toolSearchBox) {
            this.toolSearchBox.style.display = 'block';
            this.toolSearchBox.value = '';
        }

        // Clear selected displays
        if (this.selectedConnectorDisplay) {
            this.selectedConnectorDisplay.style.display = 'none';
            this.selectedConnectorDisplay.innerHTML = '';
        }
        if (this.selectedToolDisplay) {
            this.selectedToolDisplay.style.display = 'none';
            this.selectedToolDisplay.innerHTML = '';
        }

        // Update compatible items
        this.updateCompatibleConnectors();
        this.updateCompatibleTools();
        this.updateUI();

        // Hide results dropdowns initially
        if (this.connectorResults) {
            this.connectorResults.style.display = 'none';
        }
        if (this.toolResults) {
            this.toolResults.style.display = 'none';
        }
    }

    updateCompatibleConnectors() {
        console.log('\n=== Filtering Connectors ===');
        
        if (!this.connectors || !Array.isArray(this.connectors)) {
            console.log('Connectors array not properly initialized');
            this.compatibleConnectors = [];
            return;
        }

        console.log('Total connectors before filtering:', this.connectors.length);
        console.log('Current filters:', {
            material: this.selectedMaterial,
            conductorType: this.selectedConductorType,
            connectorType: this.selectedConnectorType,
            crossSection: this.selectedCrossSection,
            studHole: this.selectedStudHole
        });

        try {
            this.compatibleConnectors = this.connectors.filter(connector => {
                if (!connector) return false;

                // Check conductor type
                const conductorTypeMatch = connector[`Cable ${this.selectedConductorType}`] === 'x';

                // Check material using proper abbreviations
                const materialAbbrev = this.selectedMaterial === 'Copper' ? 'CU' : 'AL';
                const materialMatch = connector['Connecting material']?.split(/[,\s]+/)
                                        .some(word => word.toLowerCase() === materialAbbrev.toLowerCase());

                // Check connector type
                const connectorTypeMatch = connector['Kind of connection']?.toLowerCase() === 
                    this.selectedConnectorType.toLowerCase();

                // Check cross section
                const nominalCrossSection = parseFloat(connector['Nominal cross section mm²']);
                const crossSectionMatch = nominalCrossSection === this.selectedCrossSection;

                // Check stud hole only for Cable Lugs
                let studHoleMatch = true;
                if (this.selectedConnectorType === 'Cable Lug') {
                    const studHole = parseFloat(connector['Stud hole']);
                    studHoleMatch = studHole === this.selectedStudHole;
                }

                return materialMatch && conductorTypeMatch && connectorTypeMatch && 
                       crossSectionMatch && studHoleMatch;
            });

            console.log('Compatible connectors after filtering:', this.compatibleConnectors.length);
            
            if (this.compatibleConnectors.length > 0) {
                console.log('Sample filtered connector:', this.compatibleConnectors[0]);
            }
        } catch (error) {
            console.error('Error during connector filtering:', error);
            this.compatibleConnectors = [];
        }
    }

    updateCompatibleTools() {
        console.log('\n=== Filtering Tools ===');
        
        if (!this.compatibleConnectors || !this.tools) {
            console.log('Connectors or tools not properly initialized');
            this.compatibleTools = [];
            return;
        }

        try {
            // First, collect all series marked with 'x' from compatible connectors
            const compatibleSeries = new Set();
            
            // These are all the possible series columns in our data
            const seriesColumns = [
                'K50 Serie', 'K4 serie', 'K22 Serie', 'K13 Serie', 
                'K15 Serie', 'K25 Serie', 'K5', 'K05', 'K06', 
                'K95', 'K09', 'K02', 'K2', 'K93', 'K94',
                'EK30IDML', 'EK60VP', 'EKM60ID', 'EK60VPFT', 'EK120ID'
            ];

            // Log compatible connectors for debugging
            console.log('Number of compatible connectors:', this.compatibleConnectors.length);
            
            // Collect all marked series from compatible connectors
            this.compatibleConnectors.forEach(connector => {
                seriesColumns.forEach(series => {
                    if (connector[series] === 'x') {
                        compatibleSeries.add(series);
                    }
                });
            });

            console.log('Compatible series found:', Array.from(compatibleSeries));

            // Filter tools based on collected series
            this.compatibleTools = this.tools.filter(tool => {
                const toolSeries = tool['Tool Series'];
                if (!toolSeries) return false;

                // Check if any of the compatible series match this tool's series
                const isCompatible = Array.from(compatibleSeries).some(series => {
                    // Remove 'Serie' or 'serie' from the series name for comparison
                    const normalizedSeries = series.replace(/ Serie$/i, '');
                    return toolSeries.includes(normalizedSeries);
                });

                // Debug logging for first few tools
                if (this.tools.indexOf(tool) < 5) {
                    console.log('Tool filtering debug:', {
                        toolName: tool['Part No.'],
                        toolSeries: toolSeries,
                        isCompatible: isCompatible,
                        compatibleSeries: Array.from(compatibleSeries)
                    });
                }

                return isCompatible;
            });

            console.log('Compatible tools after filtering:', this.compatibleTools.length);
            
            if (this.compatibleTools.length > 0) {
                console.log('Sample compatible tool:', this.compatibleTools[0]);
            }

        } catch (error) {
            console.error('Error during tool filtering:', error);
            this.compatibleTools = [];
        }
    }

    updateUI() {
        // Update search boxes and results based on compatibility
        if (this.compatibleConnectors.length === 0) {
            this.showNoCompatibleItems(this.connectorSearchBox);
            this.connectorResults.style.display = 'none';
        } else {
            this.resetSearchBox(this.connectorSearchBox);
            // Only show results if we're actively searching
            if (this.connectorSearchBox.value) {
                this.updateConnectorResults();
            }
        }

        if (this.compatibleTools.length === 0) {
            this.showNoCompatibleItems(this.toolSearchBox);
            this.toolResults.style.display = 'none';
        } else {
            this.resetSearchBox(this.toolSearchBox);
            // Only show results if we're actively searching
            if (this.toolSearchBox.value) {
                this.updateToolResults();
            }
        }

        // Show/hide elements based on selection state
        if (this.selectedConnector) {
            this.connectorSearchBox.style.display = 'none';
            this.connectorResults.style.display = 'none';
            this.selectedConnectorDisplay.style.display = 'block';
        }
        
        if (this.selectedTool) {
            this.toolSearchBox.style.display = 'none';
            this.toolResults.style.display = 'none';
            this.selectedToolDisplay.style.display = 'block';
        }
    }

    showNoCompatibleItems(searchBox) {
        if (!searchBox) return;
        searchBox.value = 'No compatible items found';
        searchBox.disabled = true;
        searchBox.style.color = '#666';
        searchBox.style.backgroundColor = '#f5f5f5';
    }

    resetSearchBox(searchBox) {
        if (!searchBox) return;
        searchBox.value = '';
        searchBox.disabled = false;
        searchBox.placeholder = 'Search';
        searchBox.style.color = '';
        searchBox.style.backgroundColor = '';
    }

    updateConnectorResults() {
        if (!this.connectorSearchBox || !this.connectorResults) return;
        
        const searchTerm = this.connectorSearchBox.value.toLowerCase();
        const filteredConnectors = searchTerm ? 
            this.compatibleConnectors.filter(c => {
                if (!c) return false;
                return (
                    (c['Part No.'] && c['Part No.'].toString().toLowerCase().includes(searchTerm)) ||
                    (c['Connecting material'] && c['Connecting material'].toString().toLowerCase().includes(searchTerm))
                );
            }) : 
            this.compatibleConnectors;

        this.connectorResults.innerHTML = this.renderResults(filteredConnectors, 'connector');
        this.connectorResults.style.display = 'block';
    }

    updateToolResults() {
        if (!this.toolSearchBox || !this.toolResults) return;
        
        const searchTerm = this.toolSearchBox.value.toLowerCase();
        const filteredTools = searchTerm ? 
            this.compatibleTools.filter(t => {
                return (
                    t['SKU'].toLowerCase().includes(searchTerm) ||
                    (t['Product Name'] && t['Product Name'].toLowerCase().includes(searchTerm))
                );
            }) : 
            this.compatibleTools;

        this.toolResults.innerHTML = this.renderResults(filteredTools, 'tool');
        this.toolResults.style.display = 'block';
    }

    renderResults(items, type) {
        if (!items || items.length === 0) {
            return `
                <div class="result-item no-results">
                    <div class="result-content">
                        <div class="no-results-message">No matching results</div>
                    </div>
                </div>
            `;
        }

        return items.map(item => {
            const id = type === 'connector' ? item['Part No.'] : item['SKU'];
            const name = type === 'connector' ? item['Connecting material'] : item['Product Name'];
            const image = type === 'connector' ? item['Image URL'] : item['Primary Image'] || 'assets/no_product_image.png';
            
            return `
                <div class="result-item" onclick="window.viewModel.handleItemSelection('${type}', '${id}')">
                    <img src="${image}" 
                         alt="${id}" 
                         class="result-thumbnail"
                         onerror="this.src='assets/no_product_image.png'">
                    <div class="result-content">
                        <div class="part-number">${id}</div>
                        <div class="part-details">${name}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    handleItemSelection(type, id) {
        if (type === 'connector') {
            this.selectedConnector = this.compatibleConnectors.find(c => c['Part No.'] === id);
            this.hideSearch('connector');
            this.updateSelectedItemDisplay(this.selectedConnector, 'connector');
            
            // Only filter tools if no tool is selected
            if (!this.selectedTool) {
                this.filterToolsForConnector(this.selectedConnector);
            }
        } else {
            this.selectedTool = this.compatibleTools.find(t => t['SKU'] === id);
            this.hideSearch('tool');
            this.updateSelectedItemDisplay(this.selectedTool, 'tool');
            
            // Only filter connectors if no connector is selected
            if (!this.selectedConnector) {
                this.filterConnectorsForTool(this.selectedTool);
            }
        }
    }

    filterToolsForConnector(connector) {
        if (!connector) {
            // If no connector selected, revert to all compatible tools
            this.updateCompatibleTools();
            return;
        }

        // Get all series columns that are marked with 'x' for this connector
        const seriesColumns = [
            'K50 Serie', 'K4 serie', 'K22 Serie', 'K13 Serie', 
            'K15 Serie', 'K25 Serie', 'K5', 'K05', 'K06', 
            'K95', 'K09', 'K02', 'K2', 'K93', 'K94',
            'EK30IDML', 'EK60VP', 'EKM60ID', 'EK60VPFT', 'EK120ID'
        ];

        const connectorSeries = seriesColumns.filter(series => connector[series] === 'x');
        console.log('Connector compatible series:', connectorSeries);

        // Filter tools to only those matching the connector's series
        this.compatibleTools = this.tools.filter(tool => {
            const toolSeries = tool['Tool Series'];
            if (!toolSeries) return false;

            return connectorSeries.some(series => {
                // Remove 'Serie' or 'serie' from the series name for comparison
                const normalizedSeries = series.replace(/ Serie$/i, '');
                return toolSeries.includes(normalizedSeries);
            });
        });

        console.log(`Filtered to ${this.compatibleTools.length} compatible tools for connector ${connector['Part No.']}`);

        // Reset tool selection and update UI
        this.selectedTool = null;
        if (this.selectedToolDisplay) {
            this.selectedToolDisplay.style.display = 'none';
        }
        if (this.toolSearchBox) {
            this.toolSearchBox.style.display = 'block';
            this.toolSearchBox.value = '';
        }
        this.updateUI();
    }

    updateSelectedItemDisplay(item, type) {
        const displayElement = type === 'connector' ? this.selectedConnectorDisplay : this.selectedToolDisplay;
        const searchBox = type === 'connector' ? this.connectorSearchBox : this.toolSearchBox;
        const resultsDiv = type === 'connector' ? this.connectorResults : this.toolResults;
        const searchContainer = searchBox.closest('.search-container');
        
        if (!displayElement || !item) return;

        const id = type === 'connector' ? item['Part No.'] : item['SKU'];
        const name = type === 'connector' ? item['Connecting material'] : item['Product Name'];
        const image = type === 'connector' ? item['Image URL'] : item['Primary Image'] || 'assets/no_product_image.png';

        // Hide search box and results
        searchBox.style.display = 'none';
        resultsDiv.style.display = 'none';

        // Show and update the display element
        displayElement.style.display = 'block';
        displayElement.innerHTML = `
            <div class="result-item" onclick="window.viewModel.showSearch('${type}')">
                <img src="${image}" 
                     alt="${id}" 
                     class="result-thumbnail"
                     onerror="this.src='assets/no_product_image.png'">
                <div class="result-content">
                    <div class="part-number">${id}</div>
                    <div class="part-details">${name}</div>
                </div>
            </div>
        `;

        // Maintain consistent height for the container
        const containerHeight = searchContainer.offsetHeight;
        displayElement.style.minHeight = `${containerHeight}px`;
    }

    showSearch(type) {
        const searchBox = type === 'connector' ? this.connectorSearchBox : this.toolSearchBox;
        const displayElement = type === 'connector' ? this.selectedConnectorDisplay : this.selectedToolDisplay;
        const resultsDiv = type === 'connector' ? this.connectorResults : this.toolResults;
        
        // Prevent any pending blur events from hiding the results
        clearTimeout(this._blurTimeout);
        
        // Set searching state before showing elements
        this.isSearching = true;
        
        // Hide the selected item display
        displayElement.style.display = 'none';
        
        // Show and focus the search box
        searchBox.style.display = 'block';
        searchBox.value = '';
        
        // Clear the selection and update results
        if (type === 'connector') {
            this.selectedConnector = null;
            this.updateConnectorResults();
        } else {
            this.selectedTool = null;
            this.updateToolResults();
        }

        // Show the results dropdown
        resultsDiv.style.display = 'block';
        
        // Focus the search box after showing results
        setTimeout(() => {
            searchBox.focus();
        }, 0);
    }

    hideSearch(type) {
        if (!this.isSearching) return;
        
        const searchBox = type === 'connector' ? this.connectorSearchBox : this.toolSearchBox;
        const resultsDiv = type === 'connector' ? this.connectorResults : this.toolResults;
        
        // Hide search box and results if we have a selection
        const selectedItem = type === 'connector' ? this.selectedConnector : this.selectedTool;
        if (selectedItem) {
            searchBox.style.display = 'none';
            resultsDiv.style.display = 'none';
        }
        
        this.isSearching = false;
    }

    filterConnectorsForTool(tool) {
        if (!tool) {
            // If no tool selected, revert to all compatible connectors
            this.updateCompatibleConnectors();
            return;
        }

        const toolSeries = tool['Tool Series'];
        if (!toolSeries) {
            console.log('No tool series found for tool:', tool['SKU']);
            return;
        }

        // First, get all connectors that match the current criteria
        this.updateCompatibleConnectors();
        const criteriaMatchedConnectors = this.compatibleConnectors;

        // Then filter these connectors to only those compatible with the tool's series
        this.compatibleConnectors = criteriaMatchedConnectors.filter(connector => {
            if (!connector) return false;

            // Check all possible series columns
            const seriesColumns = [
                'K50 Serie', 'K4 serie', 'K22 Serie', 'K13 Serie', 
                'K15 Serie', 'K25 Serie', 'K5', 'K05', 'K06', 
                'K95', 'K09', 'K02', 'K2', 'K93', 'K94',
                'EK30IDML', 'EK60VP', 'EKM60ID', 'EK60VPFT', 'EK120ID'
            ];

            return seriesColumns.some(series => {
                if (connector[series] === 'x') {
                    // Remove 'Serie' or 'serie' from the series name for comparison
                    const normalizedSeries = series.replace(/ Serie$/i, '');
                    return toolSeries.includes(normalizedSeries);
                }
                return false;
            });
        });

        console.log(`Filtered to ${this.compatibleConnectors.length} compatible connectors for tool ${tool['SKU']}`);

        // Update UI
        if (this.connectorSearchBox) {
            this.connectorSearchBox.value = '';
        }
        this.updateUI();
    }
}

// Initialize the ViewModel when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.viewModel = new ConfigurationViewModel();
    await window.viewModel.initialize();
});