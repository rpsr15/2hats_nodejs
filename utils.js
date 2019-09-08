

// method to find time slots , takes already made appointments for the day and generates time slots
// for further appointments
function findSlots(beginTimes, endTimes) {
    var eventTimes = [
      "09:00",
      "17:00"
    ];
    eventTimes = eventTimes.concat(endTimes);
    eventTimes = eventTimes.concat(beginTimes);
    eventTimes.sort();
  
    var started = false;
    var ended = false;
    var startTime;
    var endTime;
    var timeSlots = [];
  
    for (var i = 0; i < eventTimes.length; i++) {
      var x = eventTimes[i];
      if (beginTimes.includes(x)) {
        if (started) {
          endTime = decreaseBy5(x);
          ended = true;
        }
      } else if (endTimes.includes(x)) {
        //incremente by 5 minutes
        startTime = incrementBy5(x);
        started = true;
      } else {
        if (started === true) {
          endTime = x;
          ended = true;
        } else {
          startTime = x;
          started = true;
        }
      }
      if (ended === true) {
        if (timeDiff(startTime, endTime))
          timeSlots.push({ startTime: startTime, endTime: endTime });
        started = false;
        ended = false;
        startTime = "";
        endTime = "";
      }
    }
  
    return {"timeslots":timeSlots};
  }

//covert a number into two digit string format
function formatNum(n) {
    return n > 9 ? "" + n : "0" + n;
}

//return true if difference between time is more or equal to 45 minutes
function timeDiff(startTime, endTime) {
    const hrDiff = parseInt(endTime.substring(0, endTime.indexOf(":"))) - parseInt(startTime.substring(0, startTime.indexOf(":")));
    const minDiff = parseInt(endTime.substring(endTime.indexOf(":") + 1)) - parseInt(startTime.substring(startTime.indexOf(":") + 1));
    if (hrDiff * 60 + minDiff >= 40) {
        return true;
    }
    else {
        return false;
    }
}

//increase time by 5 minutes
function incrementBy5(time) {
    var hour = parseInt(time.substring(0, time.indexOf(":")));
    var min = parseInt(time.substring(time.indexOf(":") + 1));
    min += 5;
    if (min >= 60) {
        min = min % 60;
        hour += 1;
    }
    return formatNum(hour) + ":" + formatNum(min);
}

//decrease time by 5 minutes
function decreaseBy5(time) {
    var hour = parseInt(time.substring(0, time.indexOf(":")));
    var min = parseInt(time.substring(time.indexOf(":") + 1));
    min -= 5;
    if (min < 0) {
        min = min + 60;
        hour -= 1;
    }
    return formatNum(hour) + ":" + formatNum(min);

}

//method to check for params in the query
function validateQuery(fields) {
    return (req, res, next) => {
        for (const field of fields) {
            if (!req.query[field]) { // Field isn't present, end request
                return res
                    .status(400)
                    .send(`${field} is missing`);
            }
        }
        next(); // All fields are present, proceed
    };
}
function toDecimalHour(timeString){
    const hour = parseInt(timeString.substring(0,timeString.indexOf(":")));
    const minute = parseInt(timeString.substring(timeString.indexOf(":")+1));
    return hour+(minute/60);
  }
  
  function isValidSlot(timeslot, bookTime){
    const startTime = toDecimalHour(timeslot.startTime);
    const endTime = toDecimalHour(timeslot.endTime);
    const bookStartTime = toDecimalHour(bookTime);
    const bookEndTime = bookStartTime + (40/60);
    if(bookStartTime >= startTime && bookEndTime <= endTime){
      return true;
    }else{
      return false;
    }
  
  }

module.exports = {
    formatNum,
    incrementBy5,
    decreaseBy5,
    timeDiff,
    validateQuery,
    findSlots,
    toDecimalHour,
    isValidSlot
};