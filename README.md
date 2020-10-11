# Phrogger

[![Vanilla JS](http://vanilla-js.com/assets/button.png)](http://vanilla-js.com/)

## To play online

[Click here!](https://phrogger.web.app/)

## To play (or play with) locally

You'll need [Node.js](https://nodejs.org/en/) installed. Then:

1. Fork and/or clone this repository and `cd` into the project's directory
1. Run `npm install` to install the project's [dependencies](#technical-details)
1. Run `npm run start-dev` to build and serve the game

## Deploying

The project is configured to deploy (and [is deployed](https://phrogger.web.app)) to [Firebase](https://firebase.google.com/):

1. Run `npm run deploy-init` and...
    1. Provide login credentials
    1. Select `Hosting`
    1. `Create a new project` or, if you've set one up already, `Use an existing project`, then follow the prompts until...
    1. Use `dist` as your public directory
    1. The remainder of the configuration choices are unimportant, so feel free to use defaults
1. Run `npm run deploy` to build and deploy to Firebase

## Technical details

Phrogger is built using only the [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) without any frameworks. The only module bundled in with the app is [Web Font Loader](https://github.com/typekit/webfontloader#readme) to handle loading a [Google Fonts](https://fonts.google.com/) typeface before the game runs.

Dev dependencies also include:

- [ESLint](https://eslint.org/)
    - Responsible for yelling at you when your code is problematic. I highly recommend using it when working in JavaScript. I use [Visual Studio Code](https://code.visualstudio.com/) with [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) extensions.
- [Firebase CLI](https://firebase.google.com/docs/cli)
    - For deployment in this project
- [Live Server](https://github.com/tapio/live-server#readme)
    - To serve the game and automatically reload upon saving when in development
- [webpack](https://webpack.js.org/)
    - To bundle, minify and inline the JavaScript and CSS code into `index.html`
