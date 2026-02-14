import { GRID_SIZE, applyDirection, createInitialState, tick, togglePause } from "./snake-logic.js";
import {
  BREAKOUT_BOARD_SIZE,
  createInitialBreakoutState,
  nudgePaddle,
  tickBreakout,
  toggleBreakoutPause,
} from "./breakout-logic.js";

const FRAME_MS = 16;
const SNAKE_TICK_MS = 140;
const CANVAS_SIZE = 480;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const snakeGameBtn = document.getElementById("snake-game-btn");
const breakoutGameBtn = document.getElementById("breakout-game-btn");
const controlBtns = Array.from(document.querySelectorAll(".ctrl-btn"));

let activeGame = "snake";
let snakeState = createInitialState();
let breakoutState = createInitialBreakoutState();
let snakeAccumulatorMs = 0;
let timer = null;
const breakoutInput = { left: false, right: false };

function getActiveState() {
  return activeGame === "snake" ? snakeState : breakoutState;
}

function setActiveState(nextState) {
  if (activeGame === "snake") {
    snakeState = nextState;
  } else {
    breakoutState = nextState;
  }
}

function updateSwitcherUi() {
  snakeGameBtn.classList.toggle("is-active", activeGame === "snake");
  breakoutGameBtn.classList.toggle("is-active", activeGame === "breakout");
  hintEl.textContent =
    activeGame === "snake"
      ? "Snake: Arrow keys / WASD to move. Space to pause."
      : "Breakout: Left/Right or A/D to move paddle. Right-side tunnel leads to top. Higher rows score more.";
}

function setStatusText() {
  const state = getActiveState();
  statusEl.classList.remove("game-over", "paused");

  const isWin = activeGame === "breakout" && state.win;
  if (state.gameOver) {
    statusEl.textContent = isWin ? "You Win" : "Game Over";
    statusEl.classList.add("game-over");
    pauseBtn.textContent = "Pause";
    return;
  }

  if (state.paused) {
    statusEl.textContent = "Paused";
    statusEl.classList.add("paused");
    pauseBtn.textContent = "Resume";
    return;
  }

  if (state.countdownMs > 0) {
    const seconds = Math.ceil(state.countdownMs / 1000);
    statusEl.textContent = `Starting in ${seconds}`;
    pauseBtn.textContent = "Pause";
    return;
  }

  statusEl.textContent = "Running";
  pauseBtn.textContent = "Pause";
}

function drawSnakeBoard(state) {
  ctx.fillStyle = "#fcfaf5";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.strokeStyle = "#d7d1c3";
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i += 1) {
    const offset = i * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, CANVAS_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(CANVAS_SIZE, offset);
    ctx.stroke();
  }

  if (state.food) {
    ctx.fillStyle = "#b53a30";
    ctx.fillRect(state.food.x * CELL_SIZE + 2, state.food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  state.snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#2d7f4f" : "#3f9a60";
    ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  });

  if (state.countdownMs > 0 && !state.gameOver) {
    const seconds = Math.ceil(state.countdownMs / 1000);
    ctx.fillStyle = "rgba(30, 30, 30, 0.25)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 140px 'Trebuchet MS', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(seconds), CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  }
}

function drawBreakoutBoard(state) {
  ctx.fillStyle = "#fcfaf5";
  ctx.fillRect(0, 0, BREAKOUT_BOARD_SIZE, BREAKOUT_BOARD_SIZE);

  if (state.tunnel) {
    ctx.fillStyle = "rgba(40, 40, 40, 0.07)";
    ctx.fillRect(state.tunnel.x, state.tunnel.y, state.tunnel.w, state.tunnel.h);
  }

  state.bricks.forEach((brick) => {
    if (!brick.alive) return;
    ctx.fillStyle = brick.color;
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
  });

  ctx.fillStyle = "#2d7f4f";
  ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);

  ctx.fillStyle = "#b53a30";
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fill();

  if (state.countdownMs > 0 && !state.gameOver) {
    const seconds = Math.ceil(state.countdownMs / 1000);
    ctx.fillStyle = "rgba(30, 30, 30, 0.25)";
    ctx.fillRect(0, 0, BREAKOUT_BOARD_SIZE, BREAKOUT_BOARD_SIZE);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 140px 'Trebuchet MS', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(seconds), BREAKOUT_BOARD_SIZE / 2, BREAKOUT_BOARD_SIZE / 2);
  }
}

function render() {
  const state = getActiveState();
  scoreEl.textContent = String(state.score);
  updateSwitcherUi();
  setStatusText();

  if (activeGame === "snake") {
    drawSnakeBoard(state);
  } else {
    drawBreakoutBoard(state);
  }
}

function updateSnake(ms) {
  let remainingMs = ms;

  if (snakeState.countdownMs > 0 && !snakeState.paused && !snakeState.gameOver) {
    const consumed = Math.min(remainingMs, snakeState.countdownMs);
    snakeState = { ...snakeState, countdownMs: snakeState.countdownMs - consumed };
    remainingMs -= consumed;
    if (snakeState.countdownMs > 0) {
      snakeAccumulatorMs = 0;
      return;
    }
  }

  snakeAccumulatorMs += remainingMs;
  while (snakeAccumulatorMs >= SNAKE_TICK_MS) {
    snakeState = tick(snakeState);
    snakeAccumulatorMs -= SNAKE_TICK_MS;
    if (snakeState.gameOver || snakeState.paused) break;
  }
}

function updateBreakout(ms) {
  let remainingMs = ms;

  if (breakoutState.countdownMs > 0 && !breakoutState.paused && !breakoutState.gameOver) {
    const consumed = Math.min(remainingMs, breakoutState.countdownMs);
    breakoutState = { ...breakoutState, countdownMs: breakoutState.countdownMs - consumed };
    remainingMs -= consumed;
    if (breakoutState.countdownMs > 0) return;
  }

  const steps = Math.max(1, Math.floor(remainingMs / FRAME_MS));
  for (let i = 0; i < steps; i += 1) {
    breakoutState = tickBreakout(breakoutState, breakoutInput);
    if (breakoutState.gameOver || breakoutState.paused) break;
  }
}

function stepSimulation(ms) {
  if (activeGame === "snake") {
    updateSnake(ms);
  } else {
    updateBreakout(ms);
  }
}

function advanceByMs(ms) {
  let remaining = Math.max(0, ms);
  while (remaining > 0) {
    const chunk = Math.min(FRAME_MS, remaining);
    stepSimulation(chunk);
    remaining -= chunk;
  }
  render();
}

function restartActiveGame() {
  if (activeGame === "snake") {
    snakeState = createInitialState();
    snakeAccumulatorMs = 0;
  } else {
    breakoutState = createInitialBreakoutState();
    breakoutInput.left = false;
    breakoutInput.right = false;
  }
  render();
}

function togglePauseActiveGame() {
  if (activeGame === "snake") {
    snakeState = togglePause(snakeState);
  } else {
    breakoutState = toggleBreakoutPause(breakoutState);
  }
  render();
}

function setActiveGame(game) {
  activeGame = game;
  snakeAccumulatorMs = 0;
  breakoutInput.left = false;
  breakoutInput.right = false;
  render();
}

function onDirectionInput(direction) {
  if (activeGame === "snake") {
    snakeState = applyDirection(snakeState, direction);
  } else if (direction === "left" || direction === "right") {
    breakoutState = nudgePaddle(breakoutState, direction);
  }
  render();
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === " ") {
    event.preventDefault();
    togglePauseActiveGame();
    return;
  }

  if (key === "r") {
    event.preventDefault();
    restartActiveGame();
    return;
  }

  if (activeGame === "snake") {
    const map = {
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
    };
    if (key in map) {
      event.preventDefault();
      onDirectionInput(map[key]);
    }
    return;
  }

  if (key === "arrowleft" || key === "a") {
    event.preventDefault();
    breakoutInput.left = true;
  }
  if (key === "arrowright" || key === "d") {
    event.preventDefault();
    breakoutInput.right = true;
  }
}

function onKeyUp(event) {
  if (activeGame !== "breakout") return;
  const key = event.key.toLowerCase();
  if (key === "arrowleft" || key === "a") {
    breakoutInput.left = false;
  }
  if (key === "arrowright" || key === "d") {
    breakoutInput.right = false;
  }
}

pauseBtn.addEventListener("click", () => togglePauseActiveGame());
restartBtn.addEventListener("click", () => restartActiveGame());
snakeGameBtn.addEventListener("click", () => setActiveGame("snake"));
breakoutGameBtn.addEventListener("click", () => setActiveGame("breakout"));

controlBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const { direction } = btn.dataset;
    if (direction) onDirectionInput(direction);
  });
});

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

window.render_game_to_text = () => {
  if (activeGame === "snake") {
    return JSON.stringify({
      game: "snake",
      coordinateSystem: "origin=(0,0) top-left, +x right, +y down",
      gridSize: snakeState.gridSize,
      mode: snakeState.gameOver
        ? "game_over"
        : snakeState.paused
          ? "paused"
          : snakeState.countdownMs > 0
            ? "countdown"
            : "running",
      direction: snakeState.direction,
      pendingDirection: snakeState.pendingDirection,
      snake: snakeState.snake,
      food: snakeState.food,
      countdownMs: snakeState.countdownMs,
      score: snakeState.score,
    });
  }

  return JSON.stringify({
    game: "breakout",
    coordinateSystem: "origin=(0,0) top-left, +x right, +y down",
    mode: breakoutState.gameOver
      ? breakoutState.win
        ? "win"
        : "game_over"
      : breakoutState.paused
        ? "paused"
        : breakoutState.countdownMs > 0
          ? "countdown"
          : "running",
    paddle: breakoutState.paddle,
    ball: breakoutState.ball,
    tunnel: breakoutState.tunnel,
    bricksRemaining: breakoutState.bricks.filter((brick) => brick.alive).length,
    countdownMs: breakoutState.countdownMs,
    score: breakoutState.score,
  });
};

window.advanceTime = (ms) => {
  advanceByMs(ms);
};

function startLoop() {
  if (timer !== null) clearInterval(timer);
  timer = window.setInterval(() => advanceByMs(FRAME_MS), FRAME_MS);
}

render();
startLoop();
