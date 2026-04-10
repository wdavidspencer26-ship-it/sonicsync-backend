// routes/shows.js  —  Shows, history, Spotify artist data, song search
//
// Everything that previously called Ticketmaster or setlist.fm now either:
//   - Uses the Spotify Web API (artist info, top tracks, track search)
//   - Relies on data entered manually by the user (show history, setlists)
const express  = require("express");
const { v4: uuid } = require("uuid");
const db       = require("../db");
const spotify  = require("../spotify");
console.log("SPOTIFY IMPORT:", require("../spotify"));
const { resolveUser } = require("../helpers");


const router = express.Router();

// ── GET /api/shows/upcoming  ─────────────────────────────────────────────
// Returns upcoming shows with hydrated going/interested user arrays.
router.get("/upcoming", (_req, res) => {
  const shows = db.upcomingShows.map(show => ({
    ...show,
    going:      show.going.map(resolveUser).filter(Boolean),
    interested: show.interested.map(resolveUser).filter(Boolean),
  }));
  res.json({ shows });
});

// ── POST /api/shows/upcoming  ────────────────────────────────────────────
// Add a new upcoming show (user manually enters details).
// Body: { artist, spotifyArtistId?, venue, city, date, price?, noCamera? }
router.post("/upcoming", (req, res) => {
  const { artist, spotifyArtistId = null, venue, city, date, price = "", img = null, noCamera = false } = req.body;
  if (!artist || !venue || !city || !date) {
    return res.status(400).json({ error: "artist, venue, city, and date are required" });
  }
  const show = {
    id: `us_${uuid()}`, artist, spotifyArtistId, venue, city, date,
    img, price, noCamera,
    going: [], interested: [],
    createdAt: new Date().toISOString(),
  };
  db.upcomingShows.push(show);
  res.status(201).json(show);
});

// ── POST /api/shows/upcoming/:id/rsvp  ───────────────────────────────────
// Body: { status: "going" | "interested" | null, userId? }
router.post("/upcoming/:id/rsvp", (req, res) => {
  const show = db.upcomingShows.find(s => s.id === req.params.id);
  if (!show) return res.status(404).json({ error: "Show not found" });

  const { status = null, userId = "me" } = req.body;
  show.going      = show.going.filter(id => id !== userId);
  show.interested = show.interested.filter(id => id !== userId);
  if (status === "going")      show.going.push(userId);
  if (status === "interested") show.interested.push(userId);

  res.json({
    id:         show.id,
    status,
    going:      show.going.map(resolveUser).filter(Boolean),
    interested: show.interested.map(resolveUser).filter(Boolean),
  });
});

// ── GET /api/shows/history  ──────────────────────────────────────────────
// Returns the current user's manually-logged concert history.
router.get("/history", (_req, res) => {
  res.json({ history: db.showHistory });
});

// ── GET /api/shows/history/:id  ──────────────────────────────────────────
router.get("/history/:id", (req, res) => {
  const show = db.showHistory.find(s => s.id === req.params.id);
  if (!show) return res.status(404).json({ error: "Show not found" });
  res.json(show);
});

// ── POST /api/shows/history  ─────────────────────────────────────────────
// Log a new show the user attended (all fields entered manually).
// Body: { artist, spotifyArtistId?, venue, city, date, seat?, noCamera?,
//         website?, setlist?: [], merch?: [] }
router.post("/history", (req, res) => {
  const {
    artist, spotifyArtistId = null, venue, city, date,
    seat = { section: "", row: "", seat: "" },
    noCamera = false, website = "",
    artistImg = null, img = null,
    setlist = [], merch = [],
  } = req.body;

  if (!artist || !venue || !city || !date) {
    return res.status(400).json({ error: "artist, venue, city, and date are required" });
  }

  // Count how many times this artist has been seen before
  const prior = db.showHistory.filter(s => s.artist === artist).length;

  const show = {
    id: `sh_${uuid()}`,
    artist, spotifyArtistId, timesSeen: prior + 1,
    img, artistImg, venue, city, date,
    seat, website, noCamera,
    setlist, merch,
    createdAt: new Date().toISOString(),
  };
  db.showHistory.unshift(show);
  res.status(201).json(show);
});

// ── GET /api/shows/artists  ──────────────────────────────────────────────
// Aggregated stats per unique artist from show history.
router.get("/artists", (_req, res) => {
  const map = {};
  db.showHistory.forEach(show => {
    if (!map[show.artist]) {
      map[show.artist] = {
        artist:         show.artist,
        spotifyArtistId:show.spotifyArtistId,
        artistImg:      show.artistImg,
        timesSeen:      0,
        lastDate:       show.date,
        noCamera:       show.noCamera,
        website:        show.website,
        setlistCount:   0,
        merch:          show.merch,
        showIds:        [],
      };
    }
    map[show.artist].timesSeen   += show.timesSeen;
    map[show.artist].setlistCount += show.setlist.length;
    map[show.artist].showIds.push(show.id);
  });
  res.json({ artists: Object.values(map) });
});

// ── GET /api/shows/artists/:artist/moments  ──────────────────────────────
// Top 3 community Moments for an artist.
router.get("/artists/:artist/moments", (req, res) => {
  const artist  = decodeURIComponent(req.params.artist);
  const moments = (db.artistMoments[artist] || []).map(m => ({ ...m, user: resolveUser(m.userId) }));
  res.json({ artist, moments });
});

// ── GET /api/shows/artists/:artist/spotify  ──────────────────────────────
// Fetches live artist data from Spotify (image, genres, popularity, top tracks).
// Query: ?userId=me  (needs a valid Spotify token)
router.get("/artists/:artist/spotify", async (req, res) => {
  const show = db.showHistory.find(s =>
    s.artist.toLowerCase() === decodeURIComponent(req.params.artist).toLowerCase()
  );
  if (!show?.spotifyArtistId) {
    return res.status(404).json({ error: "No Spotify artist ID stored for this artist" });
  }

  const userId = req.query.userId || "me";
  try {
    const [artistData, topTracks] = await Promise.all([
      spotify.getArtist(show.spotifyArtistId, userId),
      spotify.getArtistTopTracks(show.spotifyArtistId, userId),
    ]);
    res.json({ artist: artistData, topTracks: topTracks.tracks?.slice(0, 5) });
  } catch (err) {
    res.status(502).json({ error: `Spotify error: ${err.message}` });
  }
});

// ── GET /api/shows/songs/search  ─────────────────────────────────────────
// Proxies Spotify track search — used for "Post a Song" modal.
// Query: ?q=searchTerm&userId=me&limit=10
router.get("/songs/search", async (req, res) => {
  const { q = "top", limit = "10" } = req.query;
if (!q) {return res.status(400).json({ error: "Missing query parameter q" });
}
  try {
    const results = await spotify.searchTracks(q, parseInt(limit, 10));
    const songs = results.map(t => ({
      id:         t.id,
      song:       t.name,
      artist:     t.artists,
      album:      t.album,
      cover:      t.cover,
      previewUrl: t.previewUrl,
      spotifyTrackId: t.spotifyTrackId
    }));
    res.json({ songs });
  } catch (err) {
    res.status(502).json({ error: `Spotify search error: ${err.message}` });
  }
});




// ── GET /api/shows/songs/stats  ──────────────────────────────────────────
// Per-song playlist save counts (keyed by Spotify track id or song name).
router.get("/songs/stats", (_req, res) => {
  res.json({ stats: db.addStats });
});

// ── GET /api/shows/songs/:trackId  ───────────────────────────────────────
// Fetch full Spotify track metadata.
// Query: ?userId=me
router.get("/songs/:trackId", async (req, res) => {
  const userId = req.query.userId || "me";
  try {
    const track = await spotify.getTrack(req.params.trackId, userId);
    res.json({
      id:         track.id,
      song:       track.name,
      artist:     track.artists?.[0]?.name,
      album:      track.album?.name,
      cover:      track.album?.images?.[0]?.url,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls?.spotify,
      popularity: track.popularity,
    });
  } catch (err) {
    res.status(502).json({ error: `Spotify error: ${err.message}` });
  }
});

// ── GET /api/shows/recommendations  ──────────────────────────────────────
// Spotify recommendations for discovery tags.
// Query: ?userId=me&seedArtists=id1,id2&seedTracks=id1,id2&limit=5
router.get("/recommendations", async (req, res) => {
  const { userId = "me", seedArtists = "", seedTracks = "", limit = "5" } = req.query;
  try {
    const data  = await spotify.getRecommendations(userId, {
      seedArtists: seedArtists ? seedArtists.split(",") : [],
      seedTracks:  seedTracks  ? seedTracks.split(",")  : [],
      limit: parseInt(limit, 10),
    });
    const songs = (data.tracks || []).map(t => ({
      id:    t.id,
      song:  t.name,
      artist:t.artists?.[0]?.name,
      cover: t.album?.images?.[0]?.url,
    }));
    res.json({ songs });
  } catch (err) {
    res.status(502).json({ error: `Spotify error: ${err.message}` });
  }
});



module.exports = router;
