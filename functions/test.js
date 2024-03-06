exports = async function() {
    const url = 'https://api.example.com/data';
    const response = await fetch(url);
    const data = await response.json();
    return data;
};
