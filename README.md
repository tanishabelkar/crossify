Hi there! Welcome to Crossify's repository! I am yet to host the project because it is still in development mode and awaiting [extension of quota from Spotify.](https://developer.spotify.com/blog/2021-05-27-improving-the-developer-and-user-experience-for-third-party-apps)

# Crossify
Crossify is a tool to clone your favourite public playlists from Youtube or Youtube Music to your Spotify account in one click! Simply login with your Spotify account, enter the URL of the Youtube playlist you want and wait for a few seconds. Voila! Now you can find the playlist in your library.

# Usage

## Setup
1. Create an application on the spotify developer console,
2. Note the client ID and client secrect
3. Add "http://localhost:3000/callback" as one of the redirect URIs.
4. Save your application.
5. Next, make an account on Rapid API, and obtain your Rapid API key for the Youtube-v3 API.

## Installation
1. Clone the repository to your local device
2. Make a `.env` file and add the following variables-
`CLIENT_ID=<your client id>
CLIENT_SECRET=<your client secret>
REDIRECT_URI = "http://localhost:3000/callback"
RAPID_API_KEY=<your Rapid API key>
RAPID_API_HOST="youtube-v31.p.rapidapi.com"
COOKIE_KEY1=<your hash key>
COOKIE_KEY2=<your second hash key>`
3. Install the required packages with `npm` or `yarn`

# Feedback and Contribution
I would love to hear feedback on what can be improved and suggestions about more features. Reach out to me at tanishabelkar26@gmail.com !

