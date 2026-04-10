// routes/feed.js  —  Feed post endpoints
const express  = require("express");
const { v4: uuid } = require("uuid");
const db       = require("../db");
const { hydrate, resolveUser } = require("../helpers");

const router = express.Router();

// ── GET /api/feed  ────────────────────────────────────────────────────────
router.get("/", (_req, res) => {
  res.json({ posts: db.feedPosts.map(hydrate) });
});

// ── POST /api/feed  ───────────────────────────────────────────────────────
// Body: { type, userId?, song, artist, cover, spotifyTrackId?, caption?,
//         collectionType?, collectionImg?, spotifyAlbumId?,
//         venue?, city?, setlistKnown?, topSong?,
//         tags?: string[], discover? }
router.post("/", (req, res) => {
  const {
    type = "song", userId = "me",
    song, artist, cover = null,
    spotifyTrackId = null, spotifyAlbumId = null,
    caption = "", collectionType, collectionImg,
    venue, city, setlistKnown, topSong,
    tags = [], discover = null,
  } = req.body;

  if (!song || !artist) {
    return res.status(400).json({ error: "song and artist are required" });
  }

  const post = {
    id: `fp_${uuid()}`,
    type, userId, song, artist, cover,
    spotifyTrackId, spotifyAlbumId,
    timeLabel: "Just now",
    likes: 0, comments: 0, adds: 0,
    caption, userLiked: false, discover, tags,
    ...(type === "collection"    && { collectionType, collectionImg }),
    ...(type === "concert-live"  && { venue, city, setlistKnown, topSong }),
    createdAt: new Date().toISOString(),
  };

  db.feedPosts.unshift(post);
  res.status(201).json(hydrate(post));
});

// ── POST /api/feed/:id/like  ──────────────────────────────────────────────
router.post("/:id/like", (req, res) => {
  const post = db.feedPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  post.userLiked = !post.userLiked;
  post.likes    += post.userLiked ? 1 : -1;
  res.json({ id: post.id, likes: post.likes, userLiked: post.userLiked });
});

// ── POST /api/feed/:id/add  ───────────────────────────────────────────────
// Record a playlist save; increment per-track stats.
router.post("/:id/add", (req, res) => {
  const post = db.feedPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  post.adds++;
  const key = post.spotifyTrackId || post.song;
  db.addStats[key] = (db.addStats[key] || 0) + 1;

  res.json({ id: post.id, adds: post.adds, totalSaves: db.addStats[key] });
});

// ── GET /api/feed/:id/comments  ──────────────────────────────────────────
router.get("/:id/comments", (req, res) => {
  const comments = (db.postComments[req.params.id] || []).map(c => ({
    ...c, user: resolveUser(c.userId),
  }));
  res.json({ comments });
});

// ── POST /api/feed/:id/comments  ─────────────────────────────────────────
router.post("/:id/comments", (req, res) => {
  const { userId = "me", text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const comment = { id: `c_${uuid()}`, userId, text, createdAt: new Date().toISOString() };
  if (!db.postComments[req.params.id]) db.postComments[req.params.id] = [];
  db.postComments[req.params.id].push(comment);

  const post = db.feedPosts.find(p => p.id === req.params.id);
  if (post) post.comments++;

  res.status(201).json({ ...comment, user: resolveUser(userId) });
});

module.exports = router;
