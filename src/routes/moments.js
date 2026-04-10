// routes/moments.js  —  Moments posts, pinned moment, tagging
const express  = require("express");
const { v4: uuid } = require("uuid");
const db       = require("../db");
const { hydrate, resolveUser } = require("../helpers");

const router = express.Router();

// ── GET /api/moments  ────────────────────────────────────────────────────
router.get("/", (_req, res) => {
  res.json({ posts: db.momentsPosts.map(hydrate) });
});

// ── POST /api/moments  ───────────────────────────────────────────────────
// Body: { userId?, event, img, song, spotifyTrackId?, caption?,
//         tags?: string[], mediaType }
// No-camera policy is enforced by checking showHistory.noCamera for the artist.
router.post("/", (req, res) => {
  const { userId = "me", event, img, song, spotifyTrackId = null, caption = "", tags = [], mediaType = "video" } = req.body;
  if (!event || !img || !song) {
    return res.status(400).json({ error: "event, img, and song are required" });
  }

  const artistName  = event.split(" @ ")[0]?.trim();
  const historyShow = db.showHistory.find(s => s.artist === artistName);
  if (historyShow?.noCamera) {
    return res.status(403).json({
      error: `${artistName} has a no-camera policy. Posting from this show is disabled.`,
    });
  }

  const post = {
    id: `mp_${uuid()}`,
    userId, event, img, song, spotifyTrackId,
    caption, tags, mediaType,
    durationSec: mediaType === "video" ? 15 : null,
    likes: 0, comments: 0,
    time: "Just now",
    createdAt: new Date().toISOString(),
  };
  db.momentsPosts.unshift(post);
  res.status(201).json(hydrate(post));
});

// ── POST /api/moments/:id/like  ──────────────────────────────────────────
router.post("/:id/like", (req, res) => {
  const post = db.momentsPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Moment not found" });
  post.likes++;
  res.json({ id: post.id, likes: post.likes });
});

// ── PATCH /api/moments/:id/tags  ─────────────────────────────────────────
router.patch("/:id/tags", (req, res) => {
  const post = db.momentsPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Moment not found" });
  post.tags = req.body.tags || [];
  res.json({ id: post.id, tags: post.tags.map(resolveUser).filter(Boolean) });
});

// ── GET /api/moments/pinned  ─────────────────────────────────────────────
router.get("/pinned", (req, res) => {
  if (db.pinnedMomentId) {
    const post = db.momentsPosts.find(p => p.id === db.pinnedMomentId);
    if (post) return res.json(hydrate(post));
  }
  res.json(hydrate(db.defaultPinnedMoment));
});

// ── PUT /api/moments/pinned  ─────────────────────────────────────────────
// Body: { momentId: string | null }
router.put("/pinned", (req, res) => {
  db.pinnedMomentId = req.body.momentId || null;
  res.json({ pinnedMomentId: db.pinnedMomentId });
});

module.exports = router;
