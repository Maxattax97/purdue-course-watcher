var fs = require("fs");
var readline = require("readline");
var Email = require("email").Email;
var scrape = require("scrape");

var watchlist = [];
var interval = 62 * 2;
var cooldown = 0;

function main(args) {
    console.log("Reading watchlist ...");

    var reader = readline.createInterface({
        input: fs.createReadStream("watchlist")
    });

    var lineNum = 0;
    reader.on("line", function(line) {
        lineNum++;

        if (line && line.charAt(0) != "#") {
            var parts = line.split(" ");

            var term = parts[0];
            var crn = parts[1];
            var emails = parts[2];

            if (parts && crn && emails) {
                watchlist.push({
                    term: term,
                    crn: crn,
                    emails: emails,
                    notified: false
                });
            } else {
                console.log("Error on line " + lineNum + ": unexpected format (<term> <crn> <email list>)");
            }
        }
    });

    reader.on("close", function() {
        console.log("Parsed " + watchlist.length + " courses into the watchlist"); //, watchlist);
        console.log("Beginning watch ...");

        watchlist = shuffle(watchlist);

        checkOpening(watchlist[0]);
        var i = 1;
        setInterval(function() {
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

// We'll shuffle to ensure the overload doesn't constantly effect the same course.
function shuffle(array) {
    var current = array.length;
    var temp;
    var randomIndex;

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
    return "[" + (new Date().toISOString()) + "]";
}

function checkOpening(item) {
    return new Promise(function(resolve, reject) {
        getAvailability(item.term, item.crn).then(function(classObj) {
            if (classObj.remaining > 0) {
                if (!item.notified) {
                    console.log(timestamp() + " " + classObj.shortName + " (" + classObj.longName + ") has " + classObj.remaining + " open seats. Notifying " + item.emails.split(",").length + " contacts ...");
                    notifyEmails(item.emails, classObj);
                    item.notified = true;
                }
                //else {
                    //console.log(timestamp() + " " + classObj.shortName + " (" + classObj.longName + ") has " + classObj.remaining + " open seats.");
                //}
            } else {
                if (item.notified === true) {
                    console.log(timestamp() + " " + classObj.shortName + " (" + classObj.longName + ") has no remaining seats.");
                }
                item.notified = false;
            }

            resolve();
        }).catch(function(err) {
            console.error(err);

            console.log(timestamp() + " Site overload detected. Breaking and setting a timer.");
            cooldown = 3;
            resolve();
        });
    });
}

function getAvailability(term, crn) {
    return new Promise(function(resolve, reject) {
        console.log(timestamp() + " Scraping CRN " + crn + " (term " + term + ") ...");
        scrape.request("https://selfservice.mypurdue.purdue.edu/prod/bwckschd.p_disp_detail_sched?term_in=" + term + "&crn_in=" + crn,
            function(err, $) {
                if (err) {
                    reject(err);
                } else {
                    var className = $("table.datadisplaytable").find("th").first();
                    if (className) {
                        className = className.text;
                        var openSeats = parseInt($("td.dddefault")[3].children[0].data, 10);
                        if (!isNaN(openSeats)) {
                            resolve({longName: className.split(" - ")[0], shortName: className.split(" - ")[2], remaining: openSeats});
                        } else {
                            reject(new Error("Could not read remaining seats"));
                        }
                    } else {
                        reject(new Error("Class " + term + " (CRN " + crn + ") does not exist"))
                    }
                }
            });
    });
}

function notifyEmails(recipient, classObj) {
    var payload = new Email({
        from: "resolute@maxocull.com",
        to: recipient.split(","),
        subject: "Seat Opened",
        body: "There are " + classObj.remaining + " open seats in " + classObj.shortName + " (" + classObj.longName + ")"
    });

    // Sendmail must be available
    payload.send(function(err) {
        if (err) {
            console.error(err);
        }
    });
}

main();
