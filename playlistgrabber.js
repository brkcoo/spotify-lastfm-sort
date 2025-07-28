const fs = require('node:fs');
const readline = require('node:readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// from spotify dev dashboard
const client_id = "YOUR_CLIENT_ID";
const client_secret = "YOUR_CLIENT_SECRET";

let token;

let sp_playlist;

main();

async function main() {
    // get playlist id from user 
    const playlistLink = await GetUserInput(`paste link to spotify playlist: `);
    sp_playlist = playlistLink.replace("https://open.spotify.com/playlist/", "").split("?")[0];
    // get token from spotify
    await GetAccessToken();
    // get playlist track info
    let playlist = await GetPlaylist();
    // save
    let content = JSON.stringify(playlist);
    fs.writeFile('list.txt', content, err => {
        if (err) {
            console.error(err);
        }
    });
}

// get user input
function GetUserInput(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// spotify-provided generic fetch
async function fetchWebApi(endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        method,
        body: JSON.stringify(body)
    });
    return await res.json();
}

// yay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// get access token for app to use spotify api
async function GetAccessToken() {
    const url = "https://accounts.spotify.com/api/token";
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret
            })
        });
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const data = await res.json();
        token = data.access_token;
    }
    catch (error) {
        console.error(error.message);
    }
}

async function GetPlaylist() {
    const allTracks = [];
    let offset = 0;         // skips this amount of songs in the request
    const limit = 100;      // tracks per request, 100 is the max
    let nextPage = true;    // are there more songs?

    while (nextPage) {
        const res = await fetchWebApi(
            `playlists/${sp_playlist}/tracks?limit=${limit}&offset=${offset}`,
            'GET'
        );

        if (!res.items || res.items.length === 0) {
            nextPage = false;
        }
        else {
            // transform each item in res.items into a track with desired fields
            const obj = res.items.map(item => {
                const track = item.track;
                return {
                    title: track.name,
                    artists: track.artists.map(artist => artist.name),
                    album: track.album.name,
                    href: track.external_urls.spotify
                };
            });

            allTracks.push(...obj);
            offset += limit;
            nextPage = res.items.length === limit;

            await sleep(250); // avoid hitting rate limit
        }
    }
    return allTracks;
}