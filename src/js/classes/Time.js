const SPEED_DEFAULT = 1;
const SPEED_LOWER_BOUND = 0.1;
const SPEED_UPPER_BOUND = 2;
const SPEED_RANGE_ERROR = new RangeError(`Speed must be in the range [${SPEED_LOWER_BOUND}, ${SPEED_UPPER_BOUND}]`);
let speed;
let timeZero;

const Time = {
  init: () => timeZero = Date.now(),
  now: () => {
    const now = Date.now();
    if (!timeZero) Time.speed = SPEED_DEFAULT;
    return (now - timeZero) * speed;
  },
  set speed(newSpeed) {
    if (newSpeed < SPEED_LOWER_BOUND || SPEED_UPPER_BOUND < newSpeed) throw SPEED_RANGE_ERROR;
    timeZero = Date.now();
    speed = newSpeed;
  },
};

export default Time;
