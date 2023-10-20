import {
  processPlaylist,
  makePlaylist,
  getPlaylistItems,
  getPlaylistName,
  getUser,
  generateRandomString,
  getAccessToken,
} from "./functions.js";

import axios from "axios";
import express from "express";
import queryString from "query-string";
import cookieSession from "cookie-session";
import "dotenv/config";

//Get from .env file
const PORT = process.env.PORT || 3000;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const rapidApiKey = process.env.RAPID_API_KEY;
const rapidApiHost = process.env.RAPID_API_HOST;
const key1 = process.env.COOKIE_KEY1;
const key2 = process.env.COOKIE_KEY2;
const redirectUri = process.env.REDIRECT_URI;

//Configure app
const app = express();
app.set("view engine", "ejs");

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("styles"));
app.use(
  cookieSession({
    name: "session",
    keys: [key1, key2],
    maxAge: 60 * 60 * 1000, // one hour
  })
);
app.use("/home", function (req, res, next) {
  // console.log(req.session);
  if (
    req.session.access_token === null ||
    req.session.access_token === undefined
  ) {
    return res.render("pages/login.ejs");
  } else {
    next();
  }
});

//Routes
app.get("/login", function (req, res) {
  // console.log("for /login- ");
  // console.log(req.session);
  let state = generateRandomString(16);
  let scope =
    "user-read-private user-read-email playlist-read-private ugc-image-upload playlist-modify-private playlist-modify-public";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      queryString.stringify({
        response_type: "code",
        client_id: clientId,
        scope: scope,
        redirect_uri: redirectUri,
        state: state,
      })
  );
});

app.get("/callback", async function (req, res) {
  // console.log("callback called" + req.session);
  let code = req.query.code || null;
  let state = req.query.state || null;
  if (state === null) {
    res.send("state mismatch");
  } else {
    let access_token = await getAccessToken(
      clientId,
      clientSecret,
      code,
      redirectUri
    );
    // console.log(access_token);
    req.session.access_token = access_token;
    res.redirect("/home");
  }
});

app.get("/", async function (req, res) {
  res.render("pages/login.ejs");
});

app.get("/home", async function (req, res) {
  console.log("for home - ");
  let token = req.session.access_token;
  let user = await getUser(token);
  return res.render("pages/index.ejs", { user: user });
});

app.get("/logout", function (req, res) {
  req.session.access_token = null;
  req.session = null;
  res.redirect("/");
});

app.get("/error", function (req, res) {
  return res.send("error");
});

app.post("/make-playlist", async function (req, res) {
  // console.log("for mp- " + req.session);
  try {
    if (req.session.access_token === null) {
      return res.redirect("/login");
    }

    const link = req.body.link;
    let token = req.session.access_token;
    const reg = /.*(?:youtube|youtu\.be)\.com\/.*list=([A-Za-z0-9_-]*)/gm;
    const playlistId = reg.exec(link)[1];

    let name = await getPlaylistName(playlistId, rapidApiKey, rapidApiHost);
    if (name === null) name = "My crossify playlist";
    const playlistItems = await getPlaylistItems(
      playlistId,
      rapidApiKey,
      rapidApiHost
    );

    if (!playlistItems) {
      return res.send("Cannot get playlist items");
    }

    let user = await getUser(token);
    const spotifyURI = await processPlaylist(token, playlistItems);
    const spotifyPlaylist = await makePlaylist(token, user, playlistId, name);

    if (!spotifyPlaylist) {
      return res.render("pages/playlist.ejs", {
        status: false,
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
              Authorization: "Bearer " + token,
            },
          }
        );
        return response;
      } catch (error) {
        throw error;
      }
    }
    const addItems = await addItemsToPlaylist(spotifyPlaylist, spotifyURI);

    if (addItems.status === 201) {
      return res.render("pages/playlist.ejs", {
        status: true,
        user: user,
        playlist_url: spotifyPlaylist.external_urls.spotify,
        playlist_name: name,
      });
    } else {
      // console.log(addItems);
      return res.render("pages/playlist.ejs", {
        status: false,
        user: user,
        playlist_name: "Failed to make playlist",
      });
    }
  } catch (error) {
    console.log(error);
    return res.render("pages/playlist.ejs", {
      status: false,
      playlist_name: "Failed to make playlist",
    });
  }
});

app.listen(PORT, () => {
  console.log("server started on port " + PORT);
});
