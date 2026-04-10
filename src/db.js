// ─────────────────────────────────────────────────────────────────────────────
// db.js  —  In-memory data store (replace with a real DB in production)
//
// Everything that came from Ticketmaster or setlist.fm has been removed.
// All song / artist / album / playback data comes from Spotify.
//
// Collections:
//   users            – SonicSync user accounts (linked to Spotify)
//   friends          – current user's friend list + live Spotify playback state
//   feedPosts        – song / collection / concert-live posts
//   postComments     – comments keyed by post id
//   playlistRequests – crowdsourced playlist request threads
//   upcomingShows    – concerts the user or friends have marked (manual entry)
//   showHistory      – concerts the user has attended (manually logged)
//   artistMoments    – top 3 community Moments per artist name
//   momentsPosts     – Moments screen posts (15-sec clips / photos)
//   friendsTopSongs  – aggregated Spotify listening stats by time period
//   addStats         – how many times each Spotify track was saved from a post
//   vibeSyncSessions – active Vibe Sync listening sessions
// ─────────────────────────────────────────────────────────────────────────────

// ── Users ──────────────────────────────────────────────────────────────────
// In production each user has a spotifyId and stored OAuth tokens.
const users = [
  { id: "me",    name: "You",          handle: "yourusername", avatar: "https://i.pravatar.cc/150?img=68", spotifyId: null },
  { id: "u1",    name: "Maya Chen",    handle: "mayabeats",    avatar: "https://i.pravatar.cc/150?img=47", spotifyId: "spotify_u1" },
  { id: "u2",    name: "Jordan Lee",   handle: "jlee.wav",     avatar: "https://i.pravatar.cc/150?img=33", spotifyId: "spotify_u2" },
  { id: "u3",    name: "Sam Rivera",   handle: "samr_music",   avatar: "https://i.pravatar.cc/150?img=12", spotifyId: "spotify_u3" },
  { id: "u4",    name: "Alex Kim",     handle: "alexkim99",    avatar: "https://i.pravatar.cc/150?img=52", spotifyId: "spotify_u4" },
  { id: "u5",    name: "Priya Singh",  handle: "priyavibes",   avatar: "https://i.pravatar.cc/150?img=44", spotifyId: "spotify_u5" },
  { id: "anon1", name: "User #4821",   handle: "user4821",     avatar: "https://i.pravatar.cc/150?img=8",  spotifyId: null },
  { id: "anon2", name: "User #2039",   handle: "user2039",     avatar: "https://i.pravatar.cc/150?img=22", spotifyId: null },
];

// ── Friends + live Spotify playback ───────────────────────────────────────
// `song` and `artist` are populated in real-time from
//   GET https://api.spotify.com/v1/me/player/currently-playing
// for each friend who has granted the friend-access scope.
const friends = [
  { userId: "u1", listening: "Hozier",        song: "From Eden",          online: true,  spotifyTrackId: "1BfIDivHERyzJ1uTTQLTv5" },
  { userId: "u2", listening: "Hozier",        song: "From Eden",          online: true,  spotifyTrackId: "1BfIDivHERyzJ1uTTQLTv5" },
  { userId: "u3", listening: "Billie Eilish", song: "Birds of a Feather", online: true,  spotifyTrackId: "6dOtVTDdiauQNBQEDOtlAB" },
  { userId: "u4", listening: "Tame Impala",   song: "The Less I Know",    online: false, spotifyTrackId: "1OzWPXN7liDUVJfn2GYITM" },
  { userId: "u5", listening: "FKA twigs",     song: "cellophane",         online: true,  spotifyTrackId: "4SXggAqxFZ3BVnkFJqhAaI" },
];

// ── Feed posts ─────────────────────────────────────────────────────────────
// Each song post stores a `spotifyTrackId` so the frontend can call
//   GET https://api.spotify.com/v1/tracks/:id
// to fetch fresh metadata (artwork, preview URL, popularity, etc.)
const feedPosts = [
  {
    id: "fp1", type: "song",
    userId: "u1",
    song: "From Eden", artist: "Hozier",
    cover: "https://picsum.photos/seed/hozier/200",
    spotifyTrackId: "1BfIDivHERyzJ1uTTQLTv5",
    timeLabel: "Listening now", likes: 14, comments: 3, adds: 7,
    caption: "this song hits different at 2am 🌙",
    userLiked: false, discover: null, tags: [],
  },
  {
    id: "fp2", type: "concert-live",
    userId: "u2",
    song: "Movement", artist: "Hozier",
    cover: "https://picsum.photos/seed/hozier/200",
    spotifyTrackId: "1kJ7DKvjbJcTHe7NeOHpVi",
    venue: "Madison Square Garden", city: "New York, NY",
    // setlistKnown: true means the friend reported the current song manually
    // (there is no setlist.fm integration — users update this themselves)
    setlistKnown: true, topSong: "Take Me to Church",
    timeLabel: "At the show", likes: 52, comments: 18, adds: 0,
    caption: "MSG is ELECTRIC tonight 🔥",
    userLiked: true, discover: null, tags: ["u1"],
  },
  {
    id: "fp3", type: "collection", collectionType: "vinyl",
    userId: "u3",
    song: "Hit Me Hard and Soft", artist: "Billie Eilish",
    cover: "https://picsum.photos/seed/billie/200",
    spotifyAlbumId: "7alevJLG29dxzFeIQhXGSe",
    collectionImg: "https://picsum.photos/seed/vinyl1/400/320",
    timeLabel: "10 min ago", likes: 31, comments: 7, adds: 14,
    caption: "just picked this up!! the cover is gorgeous 💿",
    userLiked: false,
    discover: { artist: "Clairo", spotifyArtistId: "69GGBxA162lTqCwzJG5jLp", reason: "Because you like Billie Eilish" },
    tags: [],
  },
  {
    id: "fp4", type: "song",
    userId: "u5",
    song: "cellophane", artist: "FKA twigs",
    cover: "https://picsum.photos/seed/fkawigs/200",
    spotifyTrackId: "4SXggAqxFZ3BVnkFJqhAaI",
    timeLabel: "38 min ago", likes: 8, comments: 2, adds: 3,
    caption: "need this performed live again 🙏",
    userLiked: false,
    discover: { artist: "Sevdaliza", spotifyArtistId: "1TtYDya2oGKoRrDUMNUfGl", reason: "Similar to FKA twigs" },
    tags: [],
  },
  {
    id: "fp5", type: "collection", collectionType: "cd",
    userId: "u4",
    song: "Currents", artist: "Tame Impala",
    cover: "https://picsum.photos/seed/tame/200",
    spotifyAlbumId: "79dL7FLiJFOO0EoehUHQBv",
    collectionImg: "https://picsum.photos/seed/tame-show/400/320",
    timeLabel: "1 hr ago", likes: 22, comments: 5, adds: 9,
    caption: "finally found this at a record fair 💽 worth the hunt",
    userLiked: true, discover: null, tags: [],
  },
  {
    id: "fp6", type: "song",
    userId: "u3",
    song: "Birds of a Feather", artist: "Billie Eilish",
    cover: "https://picsum.photos/seed/billie/200",
    spotifyTrackId: "6dOtVTDdiauQNBQEDOtlAB",
    timeLabel: "2 hrs ago", likes: 19, comments: 4, adds: 11,
    caption: "ok i cannot stop", userLiked: false, discover: null, tags: [],
  },
];

// Comments keyed by post id
const postComments = {
  fp1: [
    { id: "c1", userId: "u2", text: "this is literally my driving anthem rn",  createdAt: "2026-04-05T01:00:00Z" },
    { id: "c2", userId: "u4", text: "you have impeccable taste 🙌",             createdAt: "2026-04-05T00:45:00Z" },
    { id: "c3", userId: "u1", text: "adding this to my morning playlist",        createdAt: "2026-04-05T00:30:00Z" },
  ],
};

// ── Playlist requests ──────────────────────────────────────────────────────
const playlistRequests = [
  { id: "pr1", userId: "u2",    prompt: "late night solo drive on the freeway",    scope: "friends",   responses: 4  },
  { id: "pr2", userId: "u4",    prompt: "sunday morning cooking breakfast vibes",  scope: "community", responses: 12 },
  { id: "pr3", userId: "u5",    prompt: "going to a beach wedding next weekend 🌊", scope: "friends",   responses: 2  },
  { id: "pr4", userId: "anon1", prompt: "best indie songs for a rainy afternoon",  scope: "community", responses: 31 },
  { id: "pr5", userId: "anon2", prompt: "high-energy gym playlist, no rap please", scope: "community", responses: 18 },
  { id: "pr6", userId: "u1",    prompt: "movie score type stuff for studying",     scope: "friends",   responses: 6  },
];

// ── Upcoming shows ─────────────────────────────────────────────────────────
// Manually entered by users (no Ticketmaster integration).
// `spotifyArtistId` is used to pull the artist image and top tracks from Spotify.
const upcomingShows = [
  {
    id: "us1", artist: "Hozier",
    spotifyArtistId: "2FXC3k01zWAocFNFsjdKNi",
    venue: "Madison Square Garden", city: "New York, NY",
    date: "Apr 18, 2026",
    img: "https://picsum.photos/seed/hozier-concert/400/200",
    price: "$89–$220",
    going: ["u1", "u2"], interested: ["u3"],
    noCamera: false,
  },
  {
    id: "us2", artist: "Billie Eilish",
    spotifyArtistId: "6qqNVTkY8uBg9cP3Jd7DAH",
    venue: "Kia Forum", city: "Los Angeles, CA",
    date: "May 3, 2026",
    img: "https://picsum.photos/seed/billie-concert/400/200",
    price: "$120–$350",
    going: ["u3"], interested: [],
    noCamera: true,
  },
  {
    id: "us3", artist: "FKA twigs",
    spotifyArtistId: "6nBbkxuCPNKFkAIywXDeMd",
    venue: "Brooklyn Steel", city: "Brooklyn, NY",
    date: "Apr 27, 2026",
    img: "https://picsum.photos/seed/fka-concert/400/200",
    price: "$55–$95",
    going: [], interested: ["u5"],
    noCamera: false,
  },
];

// ── Show history ───────────────────────────────────────────────────────────
// Manually logged by the user after attending a show.
// No Ticketmaster sync — users enter venue, date, and seat themselves.
// `setlist` is entered manually by the user (or left empty).
// `spotifyArtistId` lets us pull artist art + top tracks from Spotify.
const showHistory = [
  {
    id: "sh1", artist: "Hozier", timesSeen: 3,
    spotifyArtistId: "2FXC3k01zWAocFNFsjdKNi",
    img:       "https://picsum.photos/seed/hozier-show/400/200",
    artistImg: "https://picsum.photos/seed/hozier-art/300/300",
    venue: "Madison Square Garden", city: "New York, NY", date: "Oct 14, 2023",
    seat: { section: "Floor GA", row: "General Admission", seat: "—" },
    website: "hozier.com", noCamera: false,
    // Setlist entered manually by the user
    setlist: [
      { num: 1,  song: "De Selby (Part 1)",   note: "opener", spotifyTrackId: null },
      { num: 2,  song: "NFWMB",                               spotifyTrackId: null },
      { num: 3,  song: "Cherry Wine",                         spotifyTrackId: "26GqPOxyxBRWY6NuXlRqv9" },
      { num: 4,  song: "Movement",                            spotifyTrackId: "1kJ7DKvjbJcTHe7NeOHpVi" },
      { num: 5,  song: "To Be Alone",                         spotifyTrackId: null },
      { num: 6,  song: "Almost (Sweet Music)",                spotifyTrackId: null },
      { num: 7,  song: "Like Real People Do",                 spotifyTrackId: null },
      { num: 8,  song: "In a Week",                           spotifyTrackId: null },
      { num: 9,  song: "Nina Cried Power",                    spotifyTrackId: null },
      { num: 10, song: "Work Song",                           spotifyTrackId: null },
      { num: 11, song: "Someone New",                         spotifyTrackId: null },
      { num: 12, song: "From Eden",            note: "encore",spotifyTrackId: "1BfIDivHERyzJ1uTTQLTv5" },
      { num: 13, song: "Take Me to Church",    note: "closer",spotifyTrackId: "1hKdDCpiI9mqz1jVHRKG0E" },
    ],
    merch: [
      { name: "Unreal Unearth Tee", price: "$35", img: "https://picsum.photos/seed/merch1/160/160", url: "https://hozier.com/store" },
      { name: "Tour Hoodie",        price: "$65", img: "https://picsum.photos/seed/merch2/160/160", url: "https://hozier.com/store" },
      { name: "Vinyl LP",           price: "$28", img: "https://picsum.photos/seed/merch3/160/160", url: "https://hozier.com/store" },
    ],
  },
  {
    id: "sh2", artist: "Tame Impala", timesSeen: 2,
    spotifyArtistId: "5INjqkS1o8h1imAzPqGZng",
    img:       "https://picsum.photos/seed/tame-show/400/200",
    artistImg: "https://picsum.photos/seed/tame-art/300/300",
    venue: "Red Rocks Amphitheatre", city: "Morrison, CO", date: "Aug 5, 2022",
    seat: { section: "Row 23", row: "Row 23", seat: "Seat 14" },
    website: "tameimpala.com", noCamera: false,
    setlist: [
      { num: 1,  song: "One More Year",                  note: "opener", spotifyTrackId: null },
      { num: 2,  song: "Breathe Deeper",                               spotifyTrackId: null },
      { num: 3,  song: "Elephant",                                      spotifyTrackId: null },
      { num: 4,  song: "Eventually",                                    spotifyTrackId: null },
      { num: 5,  song: "Let It Happen",                                 spotifyTrackId: null },
      { num: 6,  song: "Borderline",                                    spotifyTrackId: null },
      { num: 7,  song: "Lost in Yesterday",                             spotifyTrackId: null },
      { num: 8,  song: "Is It True",                                    spotifyTrackId: null },
      { num: 9,  song: "The Less I Know the Better",                    spotifyTrackId: "1OzWPXN7liDUVJfn2GYITM" },
      { num: 10, song: "New Person, Same Old Mistakes", note: "closer", spotifyTrackId: null },
    ],
    merch: [
      { name: "Currents Tee",   price: "$32", img: "https://picsum.photos/seed/merch4/160/160", url: "https://tameimpala.com/store" },
      { name: "Slowrush Print", price: "$20", img: "https://picsum.photos/seed/merch5/160/160", url: "https://tameimpala.com/store" },
    ],
  },
  {
    id: "sh3", artist: "Billie Eilish", timesSeen: 1,
    spotifyArtistId: "6qqNVTkY8uBg9cP3Jd7DAH",
    img:       "https://picsum.photos/seed/billie-show/400/200",
    artistImg: "https://picsum.photos/seed/billie-art/300/300",
    venue: "United Center", city: "Chicago, IL", date: "Mar 12, 2022",
    seat: { section: "Section 104", row: "Row G", seat: "Seat 12" },
    website: "billieeilish.com", noCamera: true,
    setlist: [
      { num: 1,  song: "bury a friend",              note: "opener", spotifyTrackId: null },
      { num: 2,  song: "I Didn't Change My Number",                  spotifyTrackId: null },
      { num: 3,  song: "NDA",                                        spotifyTrackId: null },
      { num: 4,  song: "Therefore I Am",                             spotifyTrackId: null },
      { num: 5,  song: "Oxytocin",                                   spotifyTrackId: null },
      { num: 6,  song: "Happier Than Ever",                          spotifyTrackId: null },
      { num: 7,  song: "Lost Cause",                                 spotifyTrackId: null },
      { num: 8,  song: "Your Power",                                 spotifyTrackId: null },
      { num: 9,  song: "Ocean Eyes",                note: "encore",  spotifyTrackId: null },
      { num: 10, song: "bad guy",                   note: "closer",  spotifyTrackId: "2Fxmhks0live1pIiKyqn2eY" },
    ],
    merch: [
      { name: "HTE World Tee", price: "$40", img: "https://picsum.photos/seed/merch6/160/160", url: "https://shop.billieeilish.com" },
      { name: "Blohsh Cap",    price: "$30", img: "https://picsum.photos/seed/merch7/160/160", url: "https://shop.billieeilish.com" },
      { name: "Racer Jacket",  price: "$90", img: "https://picsum.photos/seed/merch8/160/160", url: "https://shop.billieeilish.com" },
    ],
  },
];

// ── Artist moments (top 3 Moments per artist) ──────────────────────────────
const artistMoments = {
  "Hozier": [
    { id: "am1", img: "https://picsum.photos/seed/hm1/200/150", song: "Work Song",        userId: "u1", spotifyTrackId: null },
    { id: "am2", img: "https://picsum.photos/seed/hm2/200/150", song: "Nina Cried Power", userId: "u2", spotifyTrackId: null },
    { id: "am3", img: "https://picsum.photos/seed/hm3/200/150", song: "Cherry Wine",      userId: "u3", spotifyTrackId: "26GqPOxyxBRWY6NuXlRqv9" },
  ],
  "Tame Impala": [
    { id: "am4", img: "https://picsum.photos/seed/tm1/200/150", song: "Let It Happen",    userId: "u4", spotifyTrackId: null },
    { id: "am5", img: "https://picsum.photos/seed/tm2/200/150", song: "Elephant",         userId: "u1", spotifyTrackId: null },
    { id: "am6", img: "https://picsum.photos/seed/tm3/200/150", song: "Borderline",       userId: "u3", spotifyTrackId: null },
  ],
  "Billie Eilish": [
    { id: "am7", img: "https://picsum.photos/seed/bm1/200/150", song: "Happier Than Ever",userId: "u3", spotifyTrackId: null },
    { id: "am8", img: "https://picsum.photos/seed/bm2/200/150", song: "bad guy",           userId: "u5", spotifyTrackId: "2Fxmhks0live1pIiKyqn2eY" },
    { id: "am9", img: "https://picsum.photos/seed/bm3/200/150", song: "Ocean Eyes",        userId: "u2", spotifyTrackId: null },
  ],
};

// ── Moments posts (concert clips / photos) ─────────────────────────────────
// `spotifyTrackId` is the song detected or selected by the user at post time.
// In production, auto-detection would use Spotify's audio recognition flow.
const momentsPosts = [
  {
    id: "mp1", userId: "u1",
    event: "Hozier @ MSG",
    img: "https://picsum.photos/seed/concert1/400/300",
    song: "Work Song", spotifyTrackId: null,
    likes: 48, comments: 12, time: "2d ago",
    tags: ["u2", "u4"], mediaType: "video", durationSec: 15,
  },
  {
    id: "mp2", userId: "u3",
    event: "Billie Eilish Tour",
    img: "https://picsum.photos/seed/concert2/400/300",
    song: "Happier Than Ever", spotifyTrackId: null,
    likes: 63, comments: 9, time: "1w ago",
    tags: ["u1", "u5"], mediaType: "photo", durationSec: null,
  },
];

// Pinned Moment
let pinnedMomentId = null;
const defaultPinnedMoment = {
  id: "pinned0", userId: "me",
  event: "Hozier @ MSG",
  img: "https://picsum.photos/seed/pinnedmoment/400/320",
  song: "Take Me to Church", spotifyTrackId: "1hKdDCpiI9mqz1jVHRKG0E",
  likes: 94, comments: 22, time: "Oct 2023",
  tags: ["u1", "u2"], mediaType: "video", durationSec: 15,
};

// ── Friends top songs ──────────────────────────────────────────────────────
// Populated from Spotify's /me/top/tracks endpoint for each friend.
// `spotifyTrackId` lets the frontend link to the track on Spotify.
const friendsTopSongs = {
  week: [
    { rank: 1, song: "From Eden",         artist: "Hozier",           cover: "https://picsum.photos/seed/hozier/200",      spotifyTrackId: "1BfIDivHERyzJ1uTTQLTv5", plays: 28, listenerIds: ["u1","u2"] },
    { rank: 2, song: "Birds of a Feather",artist: "Billie Eilish",     cover: "https://picsum.photos/seed/billie/200",      spotifyTrackId: "6dOtVTDdiauQNBQEDOtlAB", plays: 21, listenerIds: ["u3","u4"] },
    { rank: 3, song: "cellophane",        artist: "FKA twigs",         cover: "https://picsum.photos/seed/fkawigs/200",     spotifyTrackId: "4SXggAqxFZ3BVnkFJqhAaI", plays: 14, listenerIds: ["u5"]      },
  ],
  month: [
    { rank: 1, song: "Espresso",                  artist: "Sabrina Carpenter", cover: "https://picsum.photos/seed/sabrina/200",     spotifyTrackId: "2qSkIjg1o9h3YT9RAgYN75", plays: 103, listenerIds: ["u1","u3","u5"] },
    { rank: 2, song: "From Eden",                 artist: "Hozier",            cover: "https://picsum.photos/seed/hozier/200",      spotifyTrackId: "1BfIDivHERyzJ1uTTQLTv5", plays: 88,  listenerIds: ["u1","u2"]      },
    { rank: 3, song: "The Less I Know the Better",artist: "Tame Impala",       cover: "https://picsum.photos/seed/tame/200",        spotifyTrackId: "1OzWPXN7liDUVJfn2GYITM", plays: 74,  listenerIds: ["u3","u4"]      },
  ],
  year: [
    { rank: 1, song: "Vampire",   artist: "Olivia Rodrigo", cover: "https://picsum.photos/seed/olivia/200",       spotifyTrackId: "1kuGVB7EU95pJObxwvfwUs", plays: 412, listenerIds: ["u1","u3","u4"]      },
    { rank: 2, song: "Flowers",   artist: "Miley Cyrus",    cover: "https://picsum.photos/seed/miley/200",        spotifyTrackId: "7a7I9qdSUXNqpgBLMboO5B", plays: 389, listenerIds: ["u2","u5"]            },
    { rank: 3, song: "Anti-Hero", artist: "Taylor Swift",   cover: "https://picsum.photos/seed/taylorswift/200",  spotifyTrackId: "0V3wPSX9ygBnCm8psDIegu", plays: 341, listenerIds: ["u1","u3","u4","u5"]  },
  ],
};

// ── Song save/add stats ────────────────────────────────────────────────────
// Keyed by Spotify track id for precision; fallback to song name for manual entries.
const addStats = {
  "1BfIDivHERyzJ1uTTQLTv5": 7,   // From Eden
  "6dOtVTDdiauQNBQEDOtlAB": 14,  // Birds of a Feather
  "4SXggAqxFZ3BVnkFJqhAaI": 3,   // cellophane
  "1OzWPXN7liDUVJfn2GYITM": 9,   // The Less I Know the Better
  "1kJ7DKvjbJcTHe7NeOHpVi": 5,   // Movement
};

// ── Vibe Sync sessions ─────────────────────────────────────────────────────
// In production, Vibe Sync calls Spotify's queue API on behalf of each
// participant to keep them in sync:
//   PUT https://api.spotify.com/v1/me/player/queue?uri=spotify:track:{id}
const vibeSyncSessions = {};

// ── Exports ────────────────────────────────────────────────────────────────
module.exports = {
  users,
  friends,
  feedPosts,
  postComments,
  playlistRequests,
  upcomingShows,
  showHistory,
  artistMoments,
  momentsPosts,
  defaultPinnedMoment,
  get pinnedMomentId()  { return pinnedMomentId; },
  set pinnedMomentId(v) { pinnedMomentId = v; },
  friendsTopSongs,
  addStats,
  vibeSyncSessions,
};
