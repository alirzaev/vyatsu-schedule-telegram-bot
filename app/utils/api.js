const axios = require('axios');

const BASE_API = process.env.BASE_API;

module.exports = {

    season: async () => {
        const resp = await axios.get(`${BASE_API}/v2/season/current`);
        const data = resp['data'];

        if (data['error']) {
            return null;
        } else {
            return data['season'];
        }
    },

    schedule: async (groupId, season) => {
        const resp = await axios.get(`${BASE_API}/v2/schedule/${groupId}/${season}`);
        const data = resp['data'];

        if (data['error']) {
            return null;
        } else {
            return data;
        }
    },

    groups: async () => {
        const resp = await axios.get(`${BASE_API}/v2/groups/by_faculty`);

        const data = resp['data'];

        if (data['error']) {
            return null;
        } else {
            return data;
        }
    }

};