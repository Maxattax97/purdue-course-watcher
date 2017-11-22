# Purdue Course Watcher

Watches for class openings at Purdue and reports it to emails. This is
especially useful when using SMS emails such as `2025550134@txt.att.net`, which
will allow users to be notified of an opening immediately.

## Setup

This program requires `sendmail`

```
git clone https://github.com/Maxattax97/purdue-course-watcher
npm install
# add/edit watchlist with correct information
node index.js
```

Simply tweak `watchlist` to add new classes to be watched. The format is
simple:
```
# Comment

<Code Spring/Summer/Fall, Year> <Course Registration Number> <Comma Separated List of Emails>
```
Examples are available in the default watchlist.
