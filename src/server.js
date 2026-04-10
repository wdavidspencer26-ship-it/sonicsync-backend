// server.js  —  SonicSync API entry point
require("dotenv").config();


const express = require("express");
const cors    = require("cors");

const feedRouter    = require("./routes/feed");
const friendsRouter = require("./routes/friends");
const momentsRouter = require("./routes/moments");
const showsRouter   = require("./routes/shows");


const app  = express();
const PORT = process.env.PORT || 4000;
const axios = require("axios");
const authRouter = require("./routes/auth");
app.use("/api/auth", authRouter);
const redirectUri = "https://inflectional-cara-uromeric.ngrok-free.dev";

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
}));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────

app.use("/api/feed",     feedRouter);
app.use("/api/friends",  friendsRouter);
app.use("/api/moments",  momentsRouter);
app.use("/api/shows",    showsRouter);

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});


app.get("/api/login", (req, res) => {
  const scope = "user-top-read user-read-recently-played";

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: "http://127.0.0.1:4040/callback",
    scope: scope,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});


app.get("/api/callback", async (req, res) => {
  const code = req.query.code;

 if (!code) {
    return res.status(400).send("No code returned from Spotify");
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "https://inflectional-cara-uromeric.ngrok-free.dev",
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // Extract the access token from Spotify's response
    const access_token = response.data.access_token;

    // For now, just redirect to your frontend with the token
    res.redirect(`/?token=${access_token}`);
  } catch (err) {
    console.error(err);           // Log the error for debugging
    res.send("Login failed");     // Send a response to the browser
  }
});

app.listen(PORT, () => {
console.log(`SonicSync API running on http://localhost:${PORT}`);
});

module.exports = app;
