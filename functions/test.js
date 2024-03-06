const axios = require('axios');

exports = async function() {
    const url = 'https://api.example.com/data';
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
};