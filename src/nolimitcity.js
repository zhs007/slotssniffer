const puppeteer = require('puppeteer');
const { intercept, patterns } = require('puppeteer-interceptor');
const fs = require("fs");

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};

function genmsgfn() {
    while (true) {
        const rn = Math.floor(Math.random() * 100000);
        const fn = "msgs" + rn + ".json";
        if (!fs.existsSync(fn)) {
            fs.writeFileSync(fn, '');

            return fn
        }
    }

    return '';
}

const data = fs.readFileSync('game.js', 'binary');
var gameFrame = undefined;
var gamemsgs = [];
var curfn = genmsgfn();

const mpos = [
    [730, 130],
    [420, 443],
    [730, 380],
];

var mposi = 0;

async function findTargetFrame(page) {
    const frames = await page.frames();
    for (const frame of frames) {
        const isme = await frame.evaluate(() => {
            if (window.gGameMsgs != undefined) {
                return true;
            }

            return false;
        });

        if (isme) {
            return frame;
        }
    }

    return undefined;
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ["--disable-features=site-per-process", "--disable-site-isolation-trials"]
    });
    const page = await browser.newPage();

    intercept(page, patterns.Script('*'), {
        onInterception: event => {
            console.log(`${event.request.url} intercepted.`)
        },
        onResponseReceived: event => {
            console.log(`${event.request.url} intercepted, going to modify`)
            if (event.request.url == 'https://demo.nolimitcdn.com/games/XwaysHoarder/1.1.23/game.js') {
                console.log(event.response.body.length);
                console.log(data.length);
                event.response.body = data;
            }
            // event.response.body += `\n;console.log("This script was modified inline");`
            return event.response;
        }
    });

    await page.goto('https://www.nolimitcity.com/games/xways-hoarder-xsplit/');

    while (true) {
        await wait(200);

        if (gameFrame == undefined) {
            gameFrame = await findTargetFrame(page);
        } else {
            const msg = await gameFrame.evaluate(() => {
                if (window.gGameMsgs != undefined) {
                    if (window.gGameMsgs.length > 0) {
                        const msg = window.gGameMsgs[0];
                        window.gGameMsgs.splice(0, 1);
                        return msg;
                    }
                }

                return "";
            });

            if (msg != undefined && msg.length > 0) {
                console.log(msg);

                gamemsgs.push(msg);

                fs.writeFileSync(curfn, JSON.stringify(gamemsgs));

                if (gamemsgs.length >= 300) {
                    gamemsgs = [];

                    curfn = genmsgfn();
                }
            }
        }

        if (gamemsgs.length >= 3) {
            await page.mouse.move(mpos[mposi][0], mpos[mposi][1], { delay: 100 });
            await page.mouse.click(mpos[mposi][0], mpos[mposi][1], { delay: 100 });
            mposi++;
            if (mposi >= mpos.length) {
                mposi = 0;
            }
        }
    }
    // await page.screenshot({ path: 'example.png' });

    // for() {

    // }
    // await browser.close();
})();