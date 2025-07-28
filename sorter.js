const fs = require('fs');
const http = require('http');
const querystring = require('querystring');
const url = require('url');

// output is required for this script to work, just a list of the desired songs in order
// output comes from scraper.js
const songlist = JSON.parse(fs.readFileSync('output.txt', 'utf8'));

// from spotify dev dashboard
const client_id = "YOUR_CLIENT_ID";
const client_secret = "YOUR_CLIENT_SECRET";
const redirect_uri = 'http://localhost:3000';

let token;

main();

async function main() {
    startCallbackServer();
    GetAuthToken();
}

// get link to authorize the app to access your spotify account, returns an auth code for getting access token
async function GetAuthToken() {
    const state = RandomString(16);
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';

    const url = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
        response_type: 'code',
        client_id,
        scope,
        redirect_uri,
        state
    });
    console.log('Please authorize access to continue: ' + url);
}

// start a local server to handle the redirect uri
function startCallbackServer() {
    const server = http.createServer((req, res) => {
        const reqUrl = url.parse(req.url, true);

        if (reqUrl.pathname === '/') {
            const code = reqUrl.query.code;
            const state = reqUrl.query.state;

            if (!code) {
                res.writeHead(400);
                res.end('Missing code');
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Authorization code received. You can close this window.');

            console.log('Authorization code:', code);
            console.log('State:', state);

            // next step
            GetAccessToken(code);

            server.close();
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(3000, () => {
        console.log('Waiting for Spotify callback at http://localhost:3000/callback');
    });
}

// create ordered playlist for the user
async function MakeReorderedPlaylist() {
    // make new playlist
    let user = await GetUsername();
    let res = await fetch(`https://api.spotify.com/v1/users/${user}/playlists`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
            name: "Yuor super cool reorderd",
            description: "yippie"
        })
    });
    const data = await res.json();
    const playlist_id = data.id;
    console.log(playlist_id);
    // add songs to playlist in batches of 100
    const songCount = songlist.length;
    let loops = Math.ceil(songCount / 100);
    let remainder = songCount % 100;
    for (let i = 0; i < loops; i++) {
        let trackUris = [];
        let length = (i < loops - 1) ? 100 : remainder;
        for (let j = 0; j < length; j++) {
            let href = songlist[i * 100 + j]?.href;
            if (!href) continue;
            let id = href.replace("https://open.spotify.com/track/", "").split("?")[0];
            let uri = `spotify:track:${id}`;
            trackUris.push(uri);
        }
        await apiReorderSongs(trackUris, playlist_id);
        await sleep(1000);
    }
}

// get spotify user id from access token
async function GetUsername() {
    let res = await fetch('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        method: 'GET',
    });
    const data = await res.json();
    return data.id;
}

/* 
    description: make api request to spotify to add songs to playlist
    trackUris: array of songs to be added in order
    playlist_id: spotify id of the playlist
*/
async function apiReorderSongs(trackUris, playlist_id) {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify({
            uris: trackUris,
        })
    }
    );
    //console.log(res);
    return await res.json();
}

// get access token for spotify user, requires auth_code
async function GetAccessToken(auth_code) {
    const url = "https://accounts.spotify.com/api/token";
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            body: new URLSearchParams({
                "grant_type": "authorization_code",
                "code": auth_code,
                "redirect_uri": redirect_uri
            })
        });
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const data = await res.json();
        token = data.access_token;
        console.log(token);

        // next step
        MakeReorderedPlaylist();
    }
    catch (error) {
        console.error(error.message);
    }
}

// generate random string for the state
function RandomString(length) {
    const charas = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
    let randString = '';
    for (let i = 0; i < length; i++) {
        let index = Math.floor(Math.random() * charas.length);
        randString += charas[index];
    }
    return randString;
}

// avoid overloading spotify api
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
