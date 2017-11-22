var SlackBot = require("slackbots");
var Email = require("email").Email;
var scrape = require("scrape");

function main(args) {
    if (args.length < 5) {
        console.log("Usage: node index.js <term> <crn> <email>[,email,...]");
        process.exit(0);
    }

    getAvailability(args[2], args[3]).then(function(classObj) {
        notifyEmail(args[4], classObj);
    }).catch(console.error);
}

function getAvailability(term, crn) {
    return new Promise(function(resolve, reject) {
        scrape.request("https://selfservice.mypurdue.purdue.edu/prod/bwckschd.p_disp_detail_sched?term_in=" + term + "&crn_in=" + crn,
            function(err, $) {
                if (err) {
                    reject(err);
                } else {
                    var className = $("table.datadisplaytable").find("th").first().text; //.innerText;
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

function notifyEmail(recipient, classObj) {
    var payload = new Email({
        from: "resolute@maxocull.com",
        to: recipient.split(","),
        subject: "Seat Opened",
        body: "There are " + classObj.remaining + " open seats in " + classObj.shortName + " (" + classObj.longName + ")"
    });

    // Sendmail must be available
    payload.send(function(err) {
        console.error(err);
    });
}

//var bot = new SlackBot({
    //token: require("./token.json").value,
    //name: "Course Watcher"
//});

//bot.on("start", function() {
    //console.log("Course Watcher bot is running...");

    //var params = {
        //icon_emoji: ":mortar_board:"
    //};

    //bot.postMessageToUser("max", "Testing", params).fail(console.err);
//});

//bot.on("message", function(data) {
    //if (data.type == "message") {
        //var user = data.user;
        //var text = data.text;
        //console.log(data.user + ": " + data.text);
    //} else {
        //// console.log(data);
    //}
//});

main(process.argv);
