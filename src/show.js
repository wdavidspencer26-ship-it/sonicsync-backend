const express = require("express");
const router = express.Router();
const spotify = require("../spotify");

router.get("/songs/search", async (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q) return res.status(400).json({ error: "Missing query parameter q" });

  try {
    const results = await spotify.searchTracks(q, parseInt(limit, 10));
    res.json({ songs: results });
  } catch (err) {
    res.status(502).json({ error: `Spotify search error: ${err.message}` });
  }
});

module.exports = router;

