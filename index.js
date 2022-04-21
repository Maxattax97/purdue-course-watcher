/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */

const fs = require('fs');
const readline = require('readline');
const nodemailer = require('nodemailer');
const scrape = require('scrape');

let watchlist = [];
const interval = 62 * 2;
let cooldown = 0;
let emailOptions = null;
let etherealAccount = null;

// We'll shuffle to ensure the overload doesn't constantly effect the same course.
function shuffle(array) {
  let current = array.length;
  let temp;
  let randomIndex;

  while (current !== 0) {
    randomIndex = Math.floor(Math.random() * current);
    current--;

    temp = array[current];
    array[current] = array[randomIndex];
    array[randomIndex] = temp;
  }

  return array;
}

function timestamp() {
  return `[${new Date().toISOString()}]`;
}

async function notifyEmails(recipient, classObj) {
  try {
    if (!emailOptions && !etherealAccount) {
      etherealAccount = await nodemailer.createTestAccount();
      console.log('Made an Ethereal account:', etherealAccount);

      emailOptions = {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass,
        },
      };
    }

    const transporter = nodemailer.createTransport(emailOptions);

    const info = await transporter.sendMail({
      from: 'maxocull.com@gmail.com',
      to: recipient,
      subject: 'Seat Opened',
      text: `There are ${classObj.remaining} open seats in ${classObj.shortName} (${classObj.longName})`,
    });

    if (etherealAccount) {
      console.log('Message sent:', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error(err);
  }
}

function getAvailability(term, crn) {
  return new Promise(((resolve, reject) => {
    console.log(`${timestamp()} Scraping CRN ${crn} (term ${term}) ...`);
    scrape.request(`https://selfservice.mypurdue.purdue.edu/prod/bwckschd.p_disp_detail_sched?term_in=${term}&crn_in=${crn}`,
      (err, $) => {
        if (err) {
          reject(err);
        } else {
          let className = $('table.datadisplaytable').find('th').first();
          if (className) {
            className = className.text;
            const openSeats = parseInt($('td.dddefault')[3].children[0].data, 10);
            if (!Number.isNaN(openSeats)) {
              resolve({ longName: className.split(' - ')[0], shortName: className.split(' - ')[2], remaining: openSeats });
            } else {
              reject(new Error('Could not read remaining seats'));
            }
          } else {
            reject(new Error(`Class ${term} (CRN ${crn}) does not exist`));
          }
        }
      });
  }));
}

function checkOpening(item) {
  return new Promise(((resolve) => {
    getAvailability(item.term, item.crn).then((classObj) => {
      if (classObj.remaining > 0) {
        if (!item.notified) {
          console.log(`${timestamp()} ${classObj.shortName} (${classObj.longName}) has ${classObj.remaining} open seats. Notifying ${item.emails.split(',').length} contacts ...`);
          notifyEmails(item.emails, classObj);
          item.notified = true;
        }
        // else {
        // console.log(timestamp() + " " + classObj.shortName + " (" + classObj.longName + ") has " + classObj.remaining + " open seats.");
        // }
      } else {
        if (item.notified === true) {
          console.log(`${timestamp()} ${classObj.shortName} (${classObj.longName}) has no remaining seats.`);
        }
        item.notified = false;
      }

      resolve();
    }).catch((err) => {
      console.error(err);

      console.log(`${timestamp()} Site overload detected. Breaking and setting a timer.`);
      cooldown = 3;
      resolve();
    });
  }));
}

function main() {
  try {
    console.log('Reading email auth ...');
    emailOptions = JSON.parse(fs.readFileSync('email_auth.json', 'utf8'));
  } catch (err) {
    console.error('Failed to read email, skipping', err);
  }

  console.log('Reading watchlist ...');

  const reader = readline.createInterface({
    input: fs.createReadStream('watchlist'),
  });

  let lineNum = 0;
  reader.on('line', (line) => {
    lineNum++;

    if (line && line.charAt(0) !== '#') {
      const parts = line.split(' ');

      const term = parts[0];
      const crn = parts[1];
      const emails = parts[2];

      if (parts && crn && emails) {
        watchlist.push({
          term,
          crn,
          emails,
          notified: false,
        });
      } else {
        console.log(`Error on line ${lineNum}: unexpected format (<term> <crn> <email list>)`);
      }
    }
  });

  reader.on('close', () => {
    console.log(`Parsed ${watchlist.length} courses into the watchlist`); // , watchlist);
    console.log('Beginning watch ...');

    watchlist = shuffle(watchlist);

    checkOpening(watchlist[0]);
    let i = 1;
    setInterval(() => {
      if (cooldown > 0) {
        cooldown--;
        return;
      }

      if (i > watchlist.length) {
        watchlist = shuffle(watchlist);
        i = 0;
      }

      checkOpening(watchlist[i]);
      i++;
    }, 1000 * interval);
  });
}

main();
