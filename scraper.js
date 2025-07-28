const cheerio = require('cheerio');
const fs = require('fs');

const username = "YOUR_USERNAME";
const inputfile = "list.txt"; // from playlistgrabber.js

main();

async function main() {
    // get list of songs from playlistgrabber.js
    const songlist = JSON.parse(fs.readFileSync(inputfile,'utf8'));
    // get timestamp for each song
    for (const song of songlist) {
        const url = CreateUrl(song.artists[0], song.title); // make last.fm url from song/artist
        const timestamp = await GetTimestamp(url);
        song.lastListen = timestamp;

        if (timestamp == 0)
            console.log(`ERROR: ${song.title} NOT FOUND`);
        
        await sleep(1000);
    }
    // sort songs by most recent listen (ascending). songs not found will be first  
    songlist.sort((a, b) => a.lastListen - b.lastListen);
    // save to output.txt
    fs.writeFile('output.txt', JSON.stringify(songlist), err => {
        if (err) {
            console.error(err);
        }
    });
}

// go to last.fm page of the user's library for a specific song. find the first timestamp (most recent listen) and log it.
async function GetTimestamp(url) {
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
    });

    const body = await res.text();
    const $ = cheerio.load(body);

    const timestamp = $('td.chartlist-timestamp span').first().attr('title');

    // should look like "Tuesday 22 Jul 2025, 1:36pm"
    if (timestamp) {
        const [, remainder] = timestamp.split(/^\w+ /); // splits off day of week
        const [datePart, timePart] = remainder.split(", "); // separates date and time
        // convert to 24hr time
        let [time, meridiem] = timePart.match(/(\d{1,2}:\d{2})(am|pm)/).slice(1, 3);
        let [hour, minute] = time.split(":").map(Number);
        if (meridiem === "pm" && hour !== 12) hour += 12;   // afternoon
        if (meridiem === "am" && hour === 12) hour = 0;     // midnight

        // Date friendly format
        const finalString = `${datePart} ${hour.toString().padStart(2, '0')}:${minute}`;

        const parsedDate = new Date(finalString);
        const unixTime = Math.floor(parsedDate.getTime() / 1000);
        return unixTime;
    }
    else return 0;
};

// last.fm url
function CreateUrl(band, song) {
    const encodedBand = encodeURIComponent(band);
    const encodedSong = encodeURIComponent(song);
    return `https://www.last.fm/user/${username}/library/music/${encodedBand}/_/${encodedSong}`;
}

// kindness is a virtue
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
