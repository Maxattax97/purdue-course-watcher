# Purdue Course Watcher

Watches for class openings at Purdue and reports it to emails. This is
especially useful when using SMS emails such as `2025550134@txt.att.net`, which
will allow users to be notified of an opening immediately.

## Setup

This program is best used with an email account/server (it uses
[`nodemailer`](https://nodemailer.com/about/) internally). It will try to
create a temporary email for you, but this is blocked on most mail servers.

```
git clone https://github.com/Maxattax97/purdue-course-watcher
npm install
# add/edit email_auth.json with correct information
# add/edit watchlist with correct information
node index.js
```

Examples email authentication is available in the default `email_auth.json.example`.
If using GMail you must use app passwords.

Simply tweak `watchlist` to add new classes to be watched. The format is
simple:
```
# Comment

<Code Spring/Summer/Fall, Year> <Course Registration Number> <Comma Separated List of Emails>
```
Examples are available in the default `watchlist.example`.
