// spotify.js — Spotify helper
const fetch = require("node-fetch");

let accessToken = null;
let tokenExpiresAt = 0;

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt) return accessToken;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!res.ok) throw new Error("Failed to get Spotify access token");

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in - 60) * 1000;
  return accessToken;
}

async function searchTracks(query, limit = 10) {
  const token = await getAccessToken();
  const res = await 
fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify search failed: ${text}`);
  }

  const data = await res.json();
  return data.tracks.items.map(t => ({
    id: t.id,
    name: t.name,
    artists: t.artists.map(a => a.name).join(", "),
    album: t.album.name,
    cover: t.album.images[0]?.url || null,
    spotifyTrackId: t.id,
    previewUrl: t.preview_url
  }));
}

module.exports = { searchTracks };

