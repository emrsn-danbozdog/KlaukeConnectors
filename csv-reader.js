async function handleFileLoad() {
    try {
        const response = await fetch('documentation/connectoors_mapping.csv');
        
        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.statusText}`);
        }
        
        const csvData = await response.text();
        return new Promise((resolve) => {
            Papa.parse(csvData, {
                header: true,
                complete: function(results) {
                    resolve(results.data);
                }
            });
        });
    } catch (error) {
        alert(`Error: ${error.message}`);
        return [];
    }
}