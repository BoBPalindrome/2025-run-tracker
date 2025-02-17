const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to fetch Google Sheets data
app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get('https://script.google.com/macros/s/AKfycbxrEUFOCZ8TL9HCVR2LPkSytsVG44Hc5wwvSVwhUF0D8soUXk61OmgX8QKBEJSRy7A6/exec');
        
        let rawData = response.data;
        if (typeof rawData === 'string') {
            try {
                rawData = JSON.parse(rawData);
            } catch (e) {
                console.error('Failed to parse response:', e);
            }
        }
        
        if (!Array.isArray(rawData)) {
            console.error('Response is not an array:', typeof rawData);
            return res.status(500).json({ error: 'Invalid response format' });
        }

        // Process the data into the format needed for the heatmap
        const processedData = rawData.map(row => {
            try {
                // Extract date and mileage from the row
                const dateStr = row.Date;
                const mileage = parseFloat(row["Total Mileage"]) || 0;

                // Skip empty entries
                if (!dateStr || mileage === 0) {
                    return null;
                }

                // Parse the ISO date string and convert to YYYY-MM-DD
                const date = new Date(dateStr);
                const formattedDate = date.toISOString().split('T')[0];

                return {
                    date: formattedDate,
                    value: mileage
                };
            } catch (e) {
                console.error('Error processing row:', row, e);
                return null;
            }
        }).filter(item => item !== null);

        console.log('Sample of processed data:', processedData.slice(0, 3));
        
        res.json(processedData);
    } catch (error) {
        console.error('Error details:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        res.status(500).json({ error: 'Failed to fetch data: ' + error.message });
    }
});

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Add a catch-all route for 404s
app.get('*', (req, res) => {
    res.status(404).send('Not Found');
});

// Only listen if we're running directly (not in Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export the app for Vercel
module.exports = app; 