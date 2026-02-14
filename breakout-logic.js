export const BREAKOUT_BOARD_SIZE = 480;
export const BREAKOUT_START_COUNTDOWN_MS = 3000;

const PADDLE_WIDTH = 88;
const PADDLE_HEIGHT = 12;
const PADDLE_Y = BREAKOUT_BOARD_SIZE - 26;
const PADDLE_SPEED = 8;
const BALL_RADIUS = 6;
const INITIAL_BALL_SPEED_X = 3;
const INITIAL_BALL_SPEED_Y = -3;

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const TUNNEL_COL = BRICK_COLS - 1;
const BRICK_PADDING = 6;
const BRICK_TOP = 42;
const BRICK_SIDE = 22;
const BRICK_HEIGHT = 16;
const BRICK_WIDTH =
  (BREAKOUT_BOARD_SIZE - BRICK_SIDE * 2 - BRICK_PADDING * (BRICK_COLS - 1)) / BRICK_COLS;
const BRICK_ROW_STYLES = [
  { color: "#d94f3d", points: 5 },
  { color: "#e58a3a", points: 4 },
  { color: "#e3c53f", points: 3 },
  { color: "#5ca75d", points: 2 },
  { color: "#4f86d9", points: 1 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createBricks() {
  const bricks = [];
  for (let row = 0; row < BRICK_ROWS; row += 1) {
    const rowStyle = BRICK_ROW_STYLES[row] || BRICK_ROW_STYLES[BRICK_ROW_STYLES.length - 1];
    for (let col = 0; col < BRICK_COLS; col += 1) {
      if (col === TUNNEL_COL) continue;
      bricks.push({
        id: `${row}-${col}`,
        x: BRICK_SIDE + col * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
        w: BRICK_WIDTH,
        h: BRICK_HEIGHT,
        color: rowStyle.color,
        points: rowStyle.points,
        alive: true,
      });
    }
  }
  return bricks;
}

function intersectsCircleRect(ball, rect) {
  return (
    ball.x + ball.r >= rect.x &&
    ball.x - ball.r <= rect.x + rect.w &&
    ball.y + ball.r >= rect.y &&
    ball.y - ball.r <= rect.y + rect.h
  );
}

export function createInitialBreakoutState() {
  const tunnelX = BRICK_SIDE + TUNNEL_COL * (BRICK_WIDTH + BRICK_PADDING);
  const tunnelBottom = BRICK_TOP + BRICK_ROWS * (BRICK_HEIGHT + BRICK_PADDING) - BRICK_PADDING;

  return {
    boardSize: BREAKOUT_BOARD_SIZE,
    paddle: {
      x: BREAKOUT_BOARD_SIZE / 2 - PADDLE_WIDTH / 2,
      y: PADDLE_Y,
      w: PADDLE_WIDTH,
      h: PADDLE_HEIGHT,
      speed: PADDLE_SPEED,
    },
    ball: {
      x: BREAKOUT_BOARD_SIZE / 2,
      y: BREAKOUT_BOARD_SIZE - 58,
      vx: INITIAL_BALL_SPEED_X,
      vy: INITIAL_BALL_SPEED_Y,
      r: BALL_RADIUS,
    },
    tunnel: {
      x: tunnelX,
      y: 0,
      w: BRICK_WIDTH,
      h: tunnelBottom,
    },
    bricks: createBricks(),
    score: 0,
    countdownMs: BREAKOUT_START_COUNTDOWN_MS,
    paused: false,
    gameOver: false,
    win: false,
  };
}

export function toggleBreakoutPause(state) {
  if (state.gameOver || state.win) return state;
  return { ...state, paused: !state.paused };
}

export function nudgePaddle(state, direction) {
  const delta = direction === "left" ? -24 : direction === "right" ? 24 : 0;
  if (delta === 0) return state;
  return {
    ...state,
    paddle: {
      ...state.paddle,
      x: clamp(state.paddle.x + delta, 0, state.boardSize - state.paddle.w),
    },
  };
}

export function tickBreakout(state, input) {
  if (state.paused || state.gameOver || state.win || state.countdownMs > 0) return state;

  const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const paddleX = clamp(
    state.paddle.x + move * state.paddle.speed,
    0,
    state.boardSize - state.paddle.w
  );
  const paddle = { ...state.paddle, x: paddleX };

  let ball = {
    ...state.ball,
    x: state.ball.x + state.ball.vx,
    y: state.ball.y + state.ball.vy,
  };

  if (ball.x - ball.r <= 0 || ball.x + ball.r >= state.boardSize) {
    ball = {
      ...ball,
      vx: -ball.vx,
      x: clamp(ball.x, ball.r, state.boardSize - ball.r),
    };
  }

  if (ball.y - ball.r <= 0) {
    ball = { ...ball, vy: -ball.vy, y: ball.r };
  }

  const hitsPaddle =
    ball.vy > 0 &&
    ball.y + ball.r >= paddle.y &&
    ball.y - ball.r <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w;
  if (hitsPaddle) {
    const centerOffset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    ball = {
      ...ball,
      y: paddle.y - ball.r,
      vy: -Math.abs(ball.vy),
      vx: centerOffset * 4.25,
    };
  }

  let score = state.score;
  let collidedBrick = false;
  const bricks = state.bricks.map((brick) => {
    if (!brick.alive || collidedBrick) return brick;
    if (intersectsCircleRect(ball, brick)) {
      collidedBrick = true;
      score += brick.points;
      return { ...brick, alive: false };
    }
    return brick;
  });

  if (collidedBrick) {
    ball = { ...ball, vy: -ball.vy };
  }

  if (ball.y - ball.r > state.boardSize) {
    return { ...state, paddle, ball, gameOver: true };
  }

  const win = bricks.every((brick) => !brick.alive);
  return {
    ...state,
    paddle,
    ball,
    bricks,
    score,
    win,
    gameOver: win ? true : state.gameOver,
  };
}
