import axios from 'axios';

const JAMENDO_API_URL = 'https://api.jamendo.com/v3.0/tracks';

export async function getSongs(options = {}) {

    const params = {
        client_id: process.env.JAMANDO_CLIENT_ID,
        format: 'json',
        limit: options.limit || 50,
        tags: options.tags || 'pop',
        order: options.order || 'downloads_week',
        audiodownload_allowed: true,
        audiodlformat: 'mp32'
    };

    try {
        const response = await axios.get(JAMENDO_API_URL, { params });
        return response.data.results;
    } catch (error) {
        console.error('Error fetching songs:', error);
        throw error;
    }
}