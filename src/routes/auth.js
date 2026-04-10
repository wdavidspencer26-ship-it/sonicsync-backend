const express = require("express");
const router = express.Router();

const clientId     = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri  = "http://127.0.0.1:3000/callback";

router.get("/spotify", (req, res) => {
  const scope = [
    "user-top-read",
    "user-read-recently-played",
    "user-read-currently-playing",
    "user-read-playback-state",
  ].join(" ");

  const url = "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      client_id:     clientId,
      response_type: "code",
      redirect_uri:  redirectUri,
      scope,
    });

  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code from Spotify");

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:   "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json();

    res.send(`<html><body><script>
      window.opener && window.opener.postMessage({
        access_token: "${data.access_token}",
        refresh_token: "${data.refresh_token}",
        expires_in: ${data.expires_in}
      }, "*");
      window.close();
    </script></body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Login failed");
  }
});

module.exports = router;
