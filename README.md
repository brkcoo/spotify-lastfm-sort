run in order
  1. playlistgrabber.js
  2. scraper.js
  3. sorter.js

playlistgrabber:
  gets list of tracks from spotify playlist link (use share button)
  outputs as list.txt to be used in scraper.js

scraper:
  use for small playlists to not overload the website. uses a 1 second delay for requests
  checks list of tracks against a last.fm user to sort them by the time last listened to (ascending)
  unlistened to songs will be first
  outputs as output.txt to be used in sorter.js

sorter:
  authorize app's access to your account with link provided via the browser
  create a new playlist using the ordered list

spotify app w/ id and secret, usernames, etc. not included
