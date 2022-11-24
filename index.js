const fs = require("fs");
const puppeteer = require("puppeteer");
const urlCollections = require("./urlCollections.json");
class Data {
  #dirName;
  filePath;
  constructor(channelName, playlistName, dirName) {
    this.#dirName = dirName;
    this.filePath = `${dirName ?? "."}/${playlistName}-by-${channelName}.json`;
  }
  exist(path) {
    return fs.existsSync(path ?? this.filePath);
  }

  async #makeDir() {
    await fs.promises.mkdir(`./${this.#dirName}`, {
      recursive: true,
    });
    return {
      status: 201,
      message: "Directory was created successfully!",
      filePath: fs.realpathSync(this.#dirName),
    };
  }

  async save(data) {
    //make dir if required and didn't existed
    if (this.#dirName && !this.exist(this.#dirName)) await this.#makeDir();
    // save file
    await fs.promises.writeFile(this.filePath, JSON.stringify(data));
    return {
      status: 201,
      message: "File was created sussessfully!",
      filePath: fs.realpathSync(this.filePath),
    };
  }
}

const scrapPlaylist = async (playlistUrl, dirName) => {
  const status = {
    status: 201,
    message: "Scrapped Successfully!",
    path: null,
  };
  // start the browser
  const browser = await puppeteer.launch();
  try {
    //   opens a new tab
    const page = await browser.newPage();

    //goes to the particular url
    await page.goto(playlistUrl);

    //   gets the channel name
    const channelName = await page.evaluate(() =>
      document
        .querySelector(
          "#owner-text a.yt-simple-endpoint.style-scope.yt-formatted-string"
        )
        .innerText.replaceAll(" ", "_")
    );

    //   gets the playlist name
    const playlistTitle = await page.evaluate(() =>
      document
        .querySelector(
          "ytd-app #content #page-manager ytd-browse.style-scope.ytd-page-manager ytd-playlist-header-renderer.style-scope.ytd-browse .metadata-wrapper #container #text"
        )
        .innerText.replace(/( |\/|\\|\|)/g, "___")
    );

    // init new data
    const dataInfo = new Data(channelName, playlistTitle, dirName);

    // close if data already exists
    if (dataInfo.exist()) {
      status.status = 403;
      status.message = "File Already Exist!";
      status.path = dataInfo.filePath;

      browser.close();
      return status;
    }

    //   gets the playlist videos and serial numbers
    const data = await page.$$eval(
      "ytd-playlist-video-renderer.style-scope.ytd-playlist-video-list-renderer #content #container #meta #video-title",
      (elements) => elements.map((e, i) => ({ sl: ++i, title: e.innerText }))
    );

    //   saves data to json file
    const { filePath } = await dataInfo.save(data);
    status.path = filePath;
  } catch (error) {
    status.status = 409;
    status.message = error.message;
    status.path = null;
    //   closes the browser
    browser.close();
  }

  //   closes the browser
  browser.close();
  return status;
};

const resolveAllPromises = async (sunName) => {
  const pendingPromises = [];
  urlCollections[sunName].forEach(async (link, index) => {
    pendingPromises.push(scrapPlaylist(link, "Database"));
  });

  return await Promise.all(pendingPromises);
};

// resolveAllPromises("Business_Math").then((res) => {
//   console.log(res);
// });
console.log();