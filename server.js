// [START app]
"use strict";
const moment = require("moment");
const express = require("express");
var time = require("time")(Date);
const app = express();
const fs = require("fs");
const { google } = require("googleapis");
const readline = require("readline");
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly"
];
// Locale configuration
var localeOptions = { timeZone: "UTC", timeZoneName: "short" };
const {
  validateQuery,
  findSlots,
  formatNum,
  isValidSlot,
  toDecimalHour
} = require("./utils.js");

const TOKEN_PATH = "token.json";
var oAuth2Client;
// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content));
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client);
    oAuth2Client.setCredentials(JSON.parse(token));
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */ function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


// get list of events for  a day
function getEvents(auth, timeMin, timeMax) {
  return new Promise(function(resolve, reject){
    const calendar = google.calendar({ version: "v3", auth });
    calendar.events.list(
      {
        calendarId: "primary",
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: "startTime",
        timeZone: "UTC"
      },
      (err, res) => {
        if (err) {
          reject(err);
        }
        const events = res.data.items;
        //console.log(events);
        if (events.length) {
          var startTimes = [];
          var endTimes = [];

          events.map((event, i) => {
            var startTime = event.start.dateTime || event.start.date;
            const startDateTime = new Date(startTime);
            startDateTime.setTimezone("UTC");
            const endDateTime = new Date(event.end.dateTime);
            endDateTime.setTimezone("UTC");
            startTime =
              formatNum(startDateTime.getHours()) +
              ":" +
              formatNum(startDateTime.getMinutes());

            const endTime =
              formatNum(endDateTime.getHours()) +
              ":" +
              formatNum(endDateTime.getMinutes());
            //add time if event falls between the working hours
            if (startTime >= "09:00" && endTime <= "17:00") {
              startTimes.push(startTime);
              endTimes.push(endTime);
            }
          });
          //findslots
          resolve(findSlots(startTimes, endTimes));
        } else {
          //No Booked windows so time window 9 to 5 is available
          const result = {
            timeslots: [{ startTime: "09:00", endTime: "17:00" }]
          };
          resolve(result);
        }
      }
    );

  });
}
// book appointment to the calendar with given start and end dateTime
function bookEvent(auth, startDateTime, endDateTime) {
  const calendar = google.calendar({ version: "v3", auth });
  return new Promise(function(resolve, reject) {
    var event = {
      summary: "Robot Massage booking",
      start: {
        dateTime: startDateTime
      },
      end: {
        dateTime: endDateTime
      }
    };

    calendar.events.insert(
      {
        auth: auth,
        calendarId: "primary",
        resource: event
      },
      function(err, event) {
        if (err) {
          reject("There was an error contacting the Calendar service: " + err);
        }
        resolve("Event created");
      }
    );
  });
}

// get list of events for  a day
function getEventsForDay(auth, timeMin, timeMax) {
  return new Promise(function(resolve, reject) {
    const calendar = google.calendar({ version: "v3", auth });
    calendar.events.list(
      {
        calendarId: "primary",
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: "startTime",
        timeZone: "UTC"
      },
      (err, res) => {
        if (err) {
          reject(err);
        }
        const events = res.data.items;
        //console.log(events);
        if (events.length) {
          var startTimes = [];
          var endTimes = [];

          events.map((event, i) => {
            var startTime = event.start.dateTime || event.start.date;
            const startDateTime = new Date(startTime);
            startDateTime.setTimezone("UTC");
            const endDateTime = new Date(event.end.dateTime);
            endDateTime.setTimezone("UTC");
            startTime =
              formatNum(startDateTime.getHours()) +
              ":" +
              formatNum(startDateTime.getMinutes());

            const endTime =
              formatNum(endDateTime.getHours()) +
              ":" +
              formatNum(endDateTime.getMinutes());
            //add time if event falls between the working hours
            if (startTime >= "09:00" && endTime <= "17:00") {
              startTimes.push(startTime);
              endTimes.push(endTime);
            }
          });
          //findslots
          resolve(findSlots(startTimes, endTimes));
        } else {
          //No Booked windows so time window 9 to 5 is available
          const result = {
            timeslots: [{ startTime: "09:00", endTime: "17:00" }]
          };
          resolve(result);
        }
      }
    );
  }); //end of promise
}

async function getDays(currentDate, startDate, endDate){
    var days = [];
    while (startDate < endDate) {
     // console.log("startdate", startDate.getDate());
      if(startDate < currentDate){
        //no slots for past days
        days.push({
          "day": startDate.getDate(),
          "hasTimeSlots":false
        })
      }else{
        //const dd = new Date.UTC(startDate.get)
        
        const month = startDate.getMonth();
        const date = startDate.getDate();
        const year = startDate.getFullYear();
        const start = new time.Date(year, month, date, 9,0,0,0,"UTC");
        const end = new time.Date(year, month, date, 17,0,0,0,"UTC");
        const r = await getEvents(oAuth2Client, start.toISOString(), end.toISOString());
        
        //no of available slots
        const count = r.timeslots.length;  
        var hasTimeSlots = true;
        if(count === 0){
          hasTimeSlots = false;
        }
        days.push({
          "day": startDate.getDate(),
          "hasTimeSlots":hasTimeSlots
        })
      }
  
      startDate.setDate(startDate.getDate() + 1);
      
    }
    return days;
}

app.get("/", (req, res) => {
  res.status(200).send(`Hello!`);
});

//send bookable days
app.get("/days", validateQuery(["year", "month"]), (req, res) => {
  const year = req.query.year;
  const month = req.query.month;
  const currentDate = new Date();
  currentDate.setTimezone("UTC");
  

  var startDate = new time.Date(year, month-1, 1, "UTC");
  const endDate = new time.Date(year, month, 1,"UTC");
  getDays(currentDate, startDate, endDate).then(
    function(result){
      res.status(200).send(result);
    }
  ).catch(err=>{
    console.log(err);
  });
  
});

//eturns a list of all timestamps available for that day as an array of objects that contain a startTime and endTime in ISO 8601 format.
app.get("/timeslots", validateQuery(["year", "month", "day"]), (req, res) => {
  //Month between 1 and 12.

  const year = req.query.year;
  const month = parseInt(req.query.month); // to make months start from 1
  const day = req.query.day;
  const dateQuery = new Date(year, month - 1, day);

  //valid values of the parameters
  if (dateQuery.toDateString() === "Invalid Date" || dateQuery === NaN) {
    res
      .status(502)
      .send(
        "Invalid parameters passed. Make sure month is between 1 to 12 and dates start from 1"
      );
  } else if (dateQuery.getDay() === 0 || dateQuery.getDay() === 6) {
    //timeslots are only for weekdays
    res.status(502).send("Bookings are only available from Monday to Friday");
  } else {
    //create start and end time for the day
    const startTime = new Date(Date.UTC(year, month - 1, day, 9, 0, 0)); //month - 1 to accomodate start month at 1
    const endTime = new Date(Date.UTC(year, month - 1, day, 17, 0, 0));
    getEventsForDay(
      oAuth2Client,
      startTime.toISOString(),
      endTime.toISOString()
    ).then(function(result) {
      //convert to iso date format
      result.timeslots.map(slot => {
        console.log(slot);
        var hour = slot.startTime.substring(0, slot.startTime.indexOf(":"));
        var min = slot.startTime.substring(slot.startTime.indexOf(":") + 1);
        slot.startTime = new Date(
          Date.UTC(year, month, day, hour, min)
        ).toISOString();
        hour = slot.endTime.substring(0, slot.endTime.indexOf(":"));
        min = slot.endTime.substring(slot.endTime.indexOf(":") + 1);
        slot.endTime = new Date(
          Date.UTC(year, month, day, hour, min)
        ).toISOString();
      });
      res.status(200).send(result);
    });
  }
});

// book an appointment
// Requires a year, month, day, hour, and minute.Returns a boolean field success. If the booking was successful, also return startTime and endTime.
app.post(
  "/book",
  validateQuery(["year", "month", "day", "hour", "minute"]),
  (req, res) => {
    const year = req.query.year;
    const month = parseInt(req.query.month); // to make months start from 1
    const day = req.query.day;
    const hour = req.query.hour;
    const minutes = req.query.minute;
    const bookTime = new Date(Date.UTC(year, month - 1, day, hour, minutes));
    const currentDateTime = new Date();
    var booked = false;
    if (bookTime - currentDateTime < 0) {
      // cannot book in past
      res.status(502).send({
        success: false,
        message: "cannot book time in the past"
      });
    } else if (bookTime - currentDateTime < 24) {
      // atleat 24 hours for booking
      res.status(502).send({
        success: false,
        message: "cannot book with less than 24 hours in advance."
      });
    } else if (
      bookTime.getDay() === 0 ||
      bookTime.getDay() === 6 ||
      parseInt(hour) < 9 ||
      parseInt(hour) > 17
    ) {
      res.status(502).send({
        success: false,
        message:
          "The time slot provided was not on a weekday between 9 am and 5 pm"
      });
      //TODO: time 17:50??
    } else {
      //get available slots for the day
      const startTime = new Date(Date.UTC(year, month - 1, day, 9, 0, 0)); //month - 1 to accomodate start month at 1
      const endTime = new Date(Date.UTC(year, month - 1, day, 17, 0, 0));
      getEventsForDay(
        oAuth2Client,
        startTime.toISOString(),
        endTime.toISOString()
      ).then(function(result) {
        console.log(result);
        result.timeslots.map(function(slot) {
          const bookHourMinute = formatNum(hour) + ":" + formatNum(minutes);
          if (isValidSlot(slot, bookHourMinute)) {
            console.log("can be booked in time window", slot);
            //book and return
            const endTime = new Date(bookTime.getTime() + 40 * 60000);
            console.log(bookTime.toISOString());
            console.log(endTime.toISOString());
            booked = true;
            bookEvent(oAuth2Client, bookTime, endTime)
              .then(function(result) {
                res.status(200).send({
                  success: true,
                  startTime: bookTime.toISOString(),
                  endTime: endTime.toISOString()
                });
                return;
              })
              .catch(error => {
                console.log("cannot book appointment", error);
              });
          }
        });
        if (booked === false) {
          res.status(502).send({
            success: false,
            message: "Invalid time slot"
          });
        }
      });
    }
  }
);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("Press Ctrl+C to quit.");
});
// [END app]
