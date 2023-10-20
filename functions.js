import axios from "axios";
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
  
  async function getAccessToken(clientId, clientSecret, code, redirectUri) {
    try {
        const response = await axios
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
        return response.data.access_token
    } catch (error) {
        
    }
  }
  
  async function getUser(access_token) {
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
  
  async function getPlaylistName(playlistId, rapidApiKey, rapidApiHost) {
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
  
  async function getPlaylistItems(playlistId, rapidApiKey, rapidApiHost) {
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
  
  async function makePlaylist(access_token, user, playlistId, name) {
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
  
  async function searchSpotify(access_token, query) {
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
  
  async function processPlaylist(access_token, playlistItems) {
    let spotifyURI = [];
    for (const song of playlistItems) {
      const title = filterSearchQuery(song.snippet.title);
      const uri = await searchSpotify(access_token, title);
      if (uri !== null) {
        spotifyURI.push(uri);
      }
    }
    return spotifyURI;
  }

  
export {processPlaylist, getAccessToken, makePlaylist, getPlaylistItems, getPlaylistName, getUser, generateRandomString}