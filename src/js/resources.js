import WebFont from 'webfontloader';

/* Resources.js
 * This is simple an image loading utility. It eases the process of loading
 * image files so that they can be used within your game. It also includes
 * a simple "caching" layer so it will reuse cached images if you attempt
 * to load the same image multiple times.
 */
const resourceCache = {};
const readyCallbacks = [];

/* This is used by developer's to grab references to images they know
  * have been previously loaded. If an image is cached, this functions
  * the same as calling load() on that URL.
  */
const get = url => resourceCache[url];

/* This function determines if all of the images that have been requested
  * for loading have in fact been completed loaded.
  */
const isReady = () => Object.values(resourceCache).every(r => r);

/* This function will add a function to the callback stack that is called
  * when all requested images are properly loaded.
  */
const onReady = func => readyCallbacks.push(func);


/* This is our private image loader function, it is
  * called by the public image loader function.
  */
const loadImages = url => {
  if (!resourceCache[url]) {
    /* This URL has not been previously loaded and is not present
      * within our cache; we'll need to load this image.
      */
    const img = new Image();
    img.onload = () => {
      /* Once our image has properly loaded, add it to our cache
        * so that we can simply return this image if the developer
        * attempts to load this file in the future.
        */
      resourceCache[url] = img;

      /* Once the image is actually loaded and properly cached,
        * call all of the onReady() callbacks we have defined.
        */
      if (isReady()) {
        readyCallbacks.forEach(func => func());
      }
    };

    /* Set the initial cache value to false, this will change when
      * the image's onload event handler is called. Finally, point
      * the images src attribute to the passed in URL.
      */
    resourceCache[url] = false;
    img.src = url;
  }
};

const load = (...urls) => {
  urls.forEach(url => {
    loadImages(url);
  });
};

const loadFonts = (...fonts) => {
  resourceCache.fonts = false;
  const fontsLoaded = () => {
    resourceCache.fonts = true;
    if (isReady()) readyCallbacks.forEach(func => func());
  };
  WebFont.load({
    google: { families: fonts },
    active: fontsLoaded,
    inactive: fontsLoaded,
  });
};

/* This object defines the publicly accessible functions available to
  * developers by creating a global Resources object.
  */

const Resources = {
  load, loadFonts, get, onReady,
};

export default Resources;
