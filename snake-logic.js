export const GRID_SIZE = 20;
export const INITIAL_DIRECTION = "right";

const DIRECTION_OFFSETS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTIONS = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function randomInt(max, randomFn) {
  return Math.floor(randomFn() * max);
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

export function createFood(snake, gridSize = GRID_SIZE, randomFn = Math.random) {
  const occupied = new Set(snake.map(pointKey));
  const free = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) free.push({ x, y });
    }
  }

  if (free.length === 0) return null;
  return free[randomInt(free.length, randomFn)];
}

export function createInitialState(randomFn = Math.random, gridSize = GRID_SIZE) {
  const center = Math.floor(gridSize / 2);
  const snake = [{ x: center, y: center }];

  return {
    gridSize,
    snake,
    direction: INITIAL_DIRECTION,
    pendingDirection: INITIAL_DIRECTION,
    food: createFood(snake, gridSize, randomFn),
    score: 0,
    paused: false,
    gameOver: false,
  };
}

export function isDirectionChangeValid(currentDirection, nextDirection) {
  if (!DIRECTION_OFFSETS[nextDirection]) return false;
  if (nextDirection === currentDirection) return false;
  return OPPOSITE_DIRECTIONS[currentDirection] !== nextDirection;
}

export function applyDirection(state, nextDirection) {
  if (state.gameOver) return state;
  if (!isDirectionChangeValid(state.direction, nextDirection)) return state;

  return { ...state, pendingDirection: nextDirection };
}

function isOutOfBounds(head, gridSize) {
  return head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
}

function hasSelfCollision(nextHead, body) {
  return body.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
}

export function tick(state, randomFn = Math.random) {
  if (state.gameOver || state.paused) return state;

  const direction = state.pendingDirection;
  const offset = DIRECTION_OFFSETS[direction];
  const currentHead = state.snake[0];
  const nextHead = { x: currentHead.x + offset.x, y: currentHead.y + offset.y };
  const ateFood =
    state.food !== null && nextHead.x === state.food.x && nextHead.y === state.food.y;
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);

  if (isOutOfBounds(nextHead, state.gridSize) || hasSelfCollision(nextHead, collisionBody)) {
    return { ...state, direction, gameOver: true };
  }

  const grownSnake = [nextHead, ...state.snake];
  const snake = ateFood ? grownSnake : grownSnake.slice(0, -1);
  const food = ateFood ? createFood(snake, state.gridSize, randomFn) : state.food;

  return {
    ...state,
    direction,
    snake,
    food,
    score: ateFood ? state.score + 1 : state.score,
    gameOver: ateFood && food === null ? true : state.gameOver,
  };
}

export function togglePause(state) {
  if (state.gameOver) return state;
  return { ...state, paused: !state.paused };
}
