// routes/friends.js  —  Friends, playlist requests, top songs, Vibe Sync
const express  = require("express");
const { v4: uuid } = require("uuid");
const db       = require("../db");
const spotify  = require("../spotify");
const { hydrate, hydrateFriend, resolveUser } = require("../helpers");

const router = express.Router();

// ── GET /api/friends  ────────────────────────────────────────────────────
// Returns friends list. For each online friend with a Spotify token,
// optionally refreshes their currently-playing track in real time.
// Query: ?live=true  to trigger live Spotify refresh (production behaviour)
router.get("/", async (req, res) => {
  const friends = db.friends.map(hydrateFriend).filter(Boolean);

  if (req.query.live === "true") {
    await Promise.allSettled(
      friends.filter(f => f.online && f.spotifyId).map(async f => {
        try {
          const cp = await spotify.getCurrentlyPlaying(f.userId);
          if (cp?.item) {
            f.song      = cp.item.name;
            f.listening = cp.item.artists?.[0]?.name;
            f.spotifyTrackId = cp.item.id;
          }
        } catch { /* token expired or no active device — leave stale data */ }
      })
    );
  }

  res.json({ friends });
});

// ── POST /api/friends/:userId/nudge  ─────────────────────────────────────
router.post("/:userId/nudge", (req, res) => {
  const { message } = req.body;
  const user = resolveUser(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  // In production: push notification / WebSocket event to target user
  res.json({ success: true, to: user.name, message });
});

// ── GET /api/friends/playlist-requests  ──────────────────────────────────
// Query: ?scope=friends|community
router.get("/playlist-requests", (req, res) => {
  const { scope } = req.query;
  let list = db.playlistRequests;
  if (scope === "friends" || scope === "community") {
    list = list.filter(r => r.scope === scope);
  }
  res.json({ requests: list.map(r => ({ ...r, user: resolveUser(r.userId) })) });
});

// ── POST /api/friends/playlist-requests  ─────────────────────────────────
router.post("/playlist-requests", (req, res) => {
  const { userId = "me", prompt, scope = "friends" } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });
  if (!["friends", "community"].includes(scope)) {
    return res.status(400).json({ error: "scope must be friends or community" });
  }
  const request = { id: `pr_${uuid()}`, userId, prompt, scope, responses: 0, createdAt: new Date().toISOString() };
  db.playlistRequests.unshift(request);
  res.status(201).json({ ...request, user: resolveUser(userId) });
});

// ── GET /api/friends/top-songs  ──────────────────────────────────────────
// Query: ?period=week|month|year
// In production, aggregate from Spotify's /me/top/tracks for all friends.
router.get("/top-songs", (req, res) => {
  const period = ["week", "month", "year"].includes(req.query.period) ? req.query.period : "week";
  const songs  = db.friendsTopSongs[period].map(s => ({
    ...s,
    listeners: s.listenerIds.map(resolveUser).filter(Boolean),
  }));
  res.json({ period, songs });
});

// ── GET /api/friends/vibe-sync  ──────────────────────────────────────────
router.get("/vibe-sync", (_req, res) => {
  const sessions = Object.values(db.vibeSyncSessions).map(s => ({
    ...s,
    host:         resolveUser(s.hostId),
    participants: s.participantIds.map(resolveUser).filter(Boolean),
  }));
  res.json({ sessions });
});

// ── POST /api/friends/vibe-sync  ─────────────────────────────────────────
// Start a new Vibe Sync session.
// Body: { hostId?, spotifyPlaylistId, playlistName, spotifyTrackId }
// In production, calls Spotify queue API for each participant.
router.post("/vibe-sync", async (req, res) => {
  const { hostId = "me", spotifyPlaylistId = null, playlistName = "My Playlist", spotifyTrackId = null } = req.body;
  const sessionId = `vs_${uuid()}`;

  db.vibeSyncSessions[sessionId] = {
    sessionId,
    hostId,
    participantIds: [hostId],
    spotifyPlaylistId,
    playlistName,
    currentTrackId: spotifyTrackId,
    startedAt: new Date().toISOString(),
  };

  // Queue the track on Spotify for the host (best-effort)
  if (spotifyTrackId) {
    try { await spotify.queueTrack(hostId, spotifyTrackId); } catch { /* no active device */ }
  }

  res.status(201).json(db.vibeSyncSessions[sessionId]);
});

// ── POST /api/friends/vibe-sync/:sessionId/invite  ───────────────────────
router.post("/vibe-sync/:sessionId/invite", async (req, res) => {
  const session = db.vibeSyncSessions[req.params.sessionId];
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  if (!session.participantIds.includes(userId)) {
    session.participantIds.push(userId);
    // Queue the current track for the new participant (best-effort)
    if (session.currentTrackId) {
      try { await spotify.queueTrack(userId, session.currentTrackId); } catch { /* no active device */ }
    }
  }

  res.json({ sessionId: session.sessionId, participants: session.participantIds.map(resolveUser) });
});

// ── DELETE /api/friends/vibe-sync/:sessionId  ────────────────────────────
router.delete("/vibe-sync/:sessionId", (req, res) => {
  if (!db.vibeSyncSessions[req.params.sessionId]) {
    return res.status(404).json({ error: "Session not found" });
  }
  delete db.vibeSyncSessions[req.params.sessionId];
  res.json({ success: true });
});

module.exports = router;
