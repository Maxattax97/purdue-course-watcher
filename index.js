var fs = require("fs");
var readline = require("readline");
var Email = require("email").Email;
var scrape = require("scrape");

var watchlist = [];
var interval = 60;

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

        checkOpenings();
        setInterval(function() {
            checkOpenings();
        }, interval * 1000);
    });
}

function checkOpenings() {
    watchlist.forEach(function(item) {
        getAvailability(item.term, item.crn).then(function(classObj) {
            var timestamp =  "[" + (new Date().toISOString()) + "]";
            if (classObj.remaining > 0) {
                if (!item.notified) {
                    console.log(timestamp + " " + classObj.shortName + " (" + classObj.longName + ") has " + classObj.remaining + " open seats. Notifying " + item.emails.split(",").length + " contacts ...");
                    notifyEmails(item.emails, classObj);
                    item.notified = true;
                } else {
                    console.log(timestamp + " " + classObj.shortName + " (" + classObj.longName + ") has " + classObj.remaining + " open seats.");
                }
            } else {
                item.notified = false;
            }
        }).catch(console.error);
    });
}

function getAvailability(term, crn) {
    return new Promise(function(resolve, reject) {
        scrape.request("https://selfservice.mypurdue.purdue.edu/prod/bwckschd.p_disp_detail_sched?term_in=" + term + "&crn_in=" + crn,
            function(err, $) {
                if (err) {
                    reject(err);
                } else {
                    var className = $("table.datadisplaytable").find("th").first().text;
                    var openSeats = parseInt($("td.dddefault")[3].children[0].data, 10);
                    if (!isNaN(openSeats)) {
                        resolve({longName: className.split(" - ")[0], shortName: className.split(" - ")[2], remaining: openSeats});
                    } else {
                        reject(new Error("Could not read remaining seats"));
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
