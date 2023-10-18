const axios = require("axios");
const express = require("express");
const path = require("path");
const querystring = require("querystring");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const PORT = 3000;

//Get from .env file
require("dotenv").config();
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const rapidApiKey = process.env.RAPID_API_KEY;
const rapidApiHost = process.env.RAPID_API_HOST;
const key1 = process.env.COOKIE_KEY1;
const key2 = process.env.COOKIE_KEY2;

//Configure app
const app = express();
app.set("view engine", "ejs");

//Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: "spotify-auth",
    keys: [key1, key2],
    maxAge: 60 * 60 * 1000, // one hour
  })
);

//Helper functions
function generateRandomString(size) {
  let dictionary =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let str = "";
  for (let i = 0; i < size; i++) {
    str += dictionary[Math.floor((dictionary.length - 1) * Math.random())];
  }
  return str;
}

function serialize(obj) {
  var str = [];
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  }
  return str.join("&");
}

async function getUser() {
  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: "Bearer " + access_token,
      },
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

async function getPlaylistName(playlistId) {
  try {
    const response = await axios.get(
      "https://youtube-v31.p.rapidapi.com/playlists",
      {
        params: {
          id: playlistId,
          part: "snippet",
        },
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": rapidApiHost,
        },
      }
    );
    return response.data.items[0].snippet.title;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getPlaylistItems(playlistId) {
  try {
    const response = await axios.get(
      "https://youtube-v31.p.rapidapi.com/playlistItems",
      {
        params: {
          playlistId: playlistId,
          part: "snippet",
          maxResults: 50,
        },
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": rapidApiHost,
        },
      }
    );
    return response.data.items;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function makePlaylist(playlistId, name) {
  try {
    const playlist = await axios.post(
      "https://api.spotify.com/v1/users/" + user.id + "/playlists",
      {
        name: name,
        description:
          "Playlist cloned from https://www.youtube.com/playlist?list=" +
          playlistId +
          " with Crossify.",
        public: true,
      },
      {
        headers: {
          Authorization: "Bearer " + access_token,
          "Content-Type": "application/json",
        },
      }
    );
    return playlist.data;
  } catch (error) {
    console.log(error);
    return null;
  }
}

function filterSearchQuery(title) {
  const regFilter =
    /video song|music video|lyrics|lyric|lyrical|official|oficial|full video|video|audio|[\[\]\(\)\-\|\,\.]/gi;
  let newTitle = title.replace(regFilter, "");
  // console.log(newTitle);
  return newTitle;
}

async function searchSpotify(query) {
  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: query,
        type: "track",
        limit: 1,
      },
      headers: {
        Authorization: "Bearer " + access_token,
      },
    });
    return response.data.tracks.items[0].uri;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function processPlaylist(playlistItems) {
  let spotifyURI = [];
  for (const song of playlistItems) {
    const title = filterSearchQuery(song.snippet.title);
    const uri = await searchSpotify(title);
    if (uri !== null) {
      spotifyURI.push(uri);
    }
  }
  return spotifyURI;
}

//Global Variables
let user = null;
let access_token = null;

//Routes
app.get("/", async function (req, res) {
  access_token = req.session.access_token;
  if (access_token) {
    user = await getUser();
    res.render("pages/index.ejs", { user: user });
  } else {
    res.render("pages/login.ejs", {user: null});
  }
});

app.get("/callback", async function (req, res) {
  console.log("callback called");
  let code = req.query.code || null;
  let state = req.query.state || null;
  let error = req.query.error || null;
  if (state === null) {
    res.send("state mismatch");
  } else {
    await axios
      .post(
        "https://accounts.spotify.com/api/token",
        serialize({
          code: code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
        {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          },
        }
      )
      .then((response) => {
        if (response.status === 200) {
          req.session.access_token = response.data.access_token;
          //localStorage.setItem("refresh_token", response.data.refresh_token);
          res.redirect("/");
        } else {
          res.send("There was some trouble logging in. Please try later.");
        }
      })
      .catch((error) => {
        console.error(error);
        res.send(error.response.statusText);
      });
  }
});

app.get("/login", function (req, res) {
  let state = generateRandomString(16);
  let scope =
    "user-read-private user-read-email playlist-read-private ugc-image-upload playlist-modify-private playlist-modify-public";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: clientId,
        scope: scope,
        redirect_uri: redirectUri,
        state: state,
      })
  );
});

app.get("/test", function (req, res) {
  res.render("pages/playlist.ejs", {
    user: user,
    status: false,
    loggedIn: true,
  });
});

app.get("/logout", function (req, res) {
  req.session.access_token = null;
  req.session = null;
  res.redirect("/");
});

app.get("/error", function (req, res) {
  res.send("error");
});

app.post("/make-playlist", async function (req, res) {
  try {
    if (access_token === null || user === null) {
      return res.redirect("/login");
    }

    const link = req.body.link;
    const reg = /.*(?:youtube|youtu\.be)\.com\/.*list=([A-Za-z0-9_-]*)/gm;
    const playlistId = reg.exec(link)[1];

    let name = await getPlaylistName(playlistId);
    if (name === null) name = "My crossify playlist"
    const playlistItems = await getPlaylistItems(playlistId);

    if (!playlistItems) {
      return res.send("Cannot get playlist items");
    }

    const spotifyURI = await processPlaylist(playlistItems);
    const spotifyPlaylist = await makePlaylist(playlistId, name);

    if (!spotifyPlaylist) {
      return res.render("pages/playlist.ejs", {
        status: false,
        loggedIn: true,
        user: user,
      });
    }

    async function addItemsToPlaylist(spotifyPlaylist, spotifyURI) {
      try {
        const response = await axios.post(
          "https://api.spotify.com/v1/playlists/" +
            spotifyPlaylist.id +
            "/tracks",
          { uris: spotifyURI, position: 0 },
          {
            headers: {
              Authorization: "Bearer " + access_token,
            },
          }
        );
        return response;
      } catch (error) {
        throw error; // You can handle this error further up in the call chain
      }
    }
    const addItems = await addItemsToPlaylist(spotifyPlaylist, spotifyURI);

    if (addItems.status === 201) {
      return res.render("pages/playlist.ejs", {
        status: true,
        user: user,
        playlist_url: spotifyPlaylist.external_urls.spotify,
        playlist_name: name
      });
    } else {
      console.log(addItems);
      return res.render("pages/playlist.ejs", {
        status: false,
        user: user,
      });
    }
  } catch (error) {
    console.log(error);
    return res.render("pages/playlist.ejs", {
      status: false,
      user: user,
      loggedIn: true,
    });
  }
});

app.listen(PORT, () => {
  console.log("server started on port " + PORT);
});
