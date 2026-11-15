await Canvas();
// q5 draws images at half size by default (for retina screens). Turn that off
// so 1 image pixel = 1 canvas pixel, and img.scale / colliders line up.
defaultImageScale(1);

const PADDLE_SCALE = 5; // how much to enlarge the paddle pixel art
const PADDLE_SPEED = 70; // pixels per frame
const BALL_START_SPEED = 5;
const BALL_SPEEDUP = 200; // added to the ball's speed on every paddle hit
const BALL_MAX_SPEED = 25;
const MAX_BOUNCE_ANGLE = 55; // degrees, when the ball hits the very edge of a paddle
const SPIN_FROM_PADDLE = 2.5; // how much paddle movement spins the ball
const MAGNUS = 1; // how strongly spin curves the ball's path
const SPIN_DECAY = 0.99; // spin lost every frame (air resistance)
const WIN_SCORE = 3; //controls at what point the game is over
const WALL_THICKNESS = 20;


const cx = camera.x;
const cy = camera.y;
const left = cx - canvas.hw;
const right = cx + canvas.hw;
const top = cy - canvas.hh;
const bottom = cy + canvas.hh;

// world.gravity.y = 10; 

// ---------- Walls (top and bottom) ----------
// Static colliders: the ball bounces off them but they never move.
let topWall = new Sprite(cx, top + WALL_THICKNESS / 2, canvas.w, WALL_THICKNESS, 'static');
let bottomWall = new Sprite(cx, bottom - WALL_THICKNESS / 2, canvas.w, WALL_THICKNESS, 'static');
for (let wall of [topWall, bottomWall]) {
	wall.color = '#222';
	wall.stroke = '#222';
	wall.bounciness = 1;
	wall.friction = 0;
}

// ---------- Images ----------
let bgImg = await loadImage('background.png');
let trophyImg = await loadImage('trophy.png');

// ---------- Paddles ----------
// Each collider is sized to the visible (non-transparent) bar in its PNG.
// NOTE: p5play applies img.offset AFTER img.scale, so offsets are in the
// image's own pixels, not screen pixels. Don't multiply them by PADDLE_SCALE.
const EDGE_GAP = 30; // space between a paddle and the screen edge

// left wall.png is 15x35 with the bar at x 0-9, y 3-34 (10x32 bar)
const P1_W = 10 * PADDLE_SCALE;
const P1_H = 32 * PADDLE_SCALE;
// right_wall_noborder.png is 8x30 and fully filled (no padding)
const P2_W = 8 * PADDLE_SCALE;
const P2_H = 30 * PADDLE_SCALE;

// Kinematic = moved by our code, not pushed around by the ball.
let player1 = new Sprite(left + EDGE_GAP + P1_W / 2, cy, P1_W, P1_H, 'kinematic');
player1.img = 'left wall.png';
player1.img.scale = PADDLE_SCALE;
// image center (7.5, 17.5) minus bar center (5, 19)
player1.img.offset.x = 2.5;
player1.img.offset.y = -1.5;

let player2 = new Sprite(right - EDGE_GAP - P2_W / 2, cy, P2_W, P2_H, 'kinematic');
player2.img = 'right_wall_noborder.png';
player2.img.scale = PADDLE_SCALE; // no offset needed: the bar fills the image

for (let p of [player1, player2]) {
	p.bounciness = 1;
	p.friction = 0;
	p.rotationLock = true;
}

// ---------- Ball ----------
// Pixel-art ball with a highlight and shading, so you can see it spin.
const ballArt = `
...bbbb...
.bbyyxxbb.
.byyxxxxb.
byyxxxxxob
byxxxxxxob
bxxxxxxoob
bxxxxxxoob
.bxxxxoob.
.bboooobb.
...bbbb...`;
const BALL_PIXEL = 3;
let ball = new Sprite(cx, cy, 10 * BALL_PIXEL); // circle collider, 30px wide
ball.img = spriteArt(ballArt, BALL_PIXEL);
ball.bounciness = 1; // perfectly elastic: no speed lost on bounces
ball.friction = 0;
ball.drag = 0;
ball.rotationDrag = 0; // spin decay is handled manually below
ball.isSuperFast = true; // continuous collision so it never tunnels through a paddle

// ---------- Game state ----------
let score1 = 0;
let score2 = 0;
let ballSpeed = BALL_START_SPEED;
let serveTimer = 0; // frames until the next serve
let serveDir = random([1, -1]); // 1 = toward player2, -1 = toward player1
let winner = null;

function resetBall(dir) {
	ball.pos.x = cx;
	ball.pos.y = cy;
	ball.vel.x = 0;
	ball.vel.y = 0;
	ball.rotation = 0;
	ball.rotationSpeed = 0;
	ballSpeed = BALL_START_SPEED;
	serveDir = dir;
	serveTimer = 60; // one second pause before serving
}

function serve() {
	let angle = random(-30, 30);
	ball.direction = serveDir === 1 ? angle : 180 + angle;
	ball.speed = ballSpeed;
}

function movePaddle(p, upKey, downKey) {
	if (kb.pressing(upKey)) p.vel.y = -PADDLE_SPEED;
	else if (kb.pressing(downKey)) p.vel.y = PADDLE_SPEED;
	else p.vel.y = 0;

	// Kinematic sprites go straight through static walls, so clamp manually
	let minY = top + WALL_THICKNESS + p.h / 2;
	let maxY = bottom - WALL_THICKNESS - p.h / 2;
	if (p.y + p.vel.y < minY) {
		p.y = minY;
		p.vel.y = 0;
	} else if (p.y + p.vel.y > maxY) {
		p.y = maxY;
		p.vel.y = 0;
	}
}

// Bounce angle depends on where the ball hits the paddle (classic Pong),
// and the paddle's movement puts spin on the ball.
function hitPaddle(p, side) {
	let offset = constrain((ball.y - p.y) / (p.h / 2), -1, 1);
	let angle = offset * MAX_BOUNCE_ANGLE;

	ballSpeed = min(ballSpeed + BALL_SPEEDUP, BALL_MAX_SPEED);
	ball.direction = side === 1 ? angle : 180 - angle;
	ball.speed = ballSpeed;

	// Friction between the paddle surface and the ball: the paddle drags the
	// side of the ball it touches, which spins it (left paddle moving down → counter-clockwise).
	ball.rotationSpeed = -side * p.vel.y * SPIN_FROM_PADDLE;

	// Push the ball clear of the paddle so it can't get stuck inside it
	let face = p.x + side * (p.w / 2 + ball.d / 2 + 1);
	if (side * (ball.x - face) < 0) ball.x = face;
}

resetBall(serveDir);

// Runs every frame, before physics: input & game logic go here
q5.update = function () {
	ball.visible = !winner; // hide the ball so it doesn't cover the trophy
	if (winner) {
		player1.vel.y = player2.vel.y = 0;
		if (kb.presses('space')) {
			score1 = score2 = 0;
			winner = null;
			resetBall(random([1, -1]));
		}
		return;
	}

	movePaddle(player1, 'w', 's');
	movePaddle(player2, 'arrowUp', 'arrowDown');

	if (serveTimer > 0) {
		serveTimer--;
		if (serveTimer === 0) serve();
		return;
	}

	if (ball.collides(player1) && ball.vel.x < 0) hitPaddle(player1, 1);
	if (ball.collides(player2) && ball.vel.x > 0) hitPaddle(player2, -1);
	if (ball.collides(topWall) || ball.collides(bottomWall)) {
		// Some spin gets scrubbed off when the ball skids along a wall
		ball.rotationSpeed *= 0.6;
	}

	// Magnus effect: a spinning ball curves through the air.
	// Rotating the direction keeps the speed constant.
	if (ball.speed > 0) {
		ball.direction += ball.rotationSpeed * MAGNUS;
		ball.speed = ballSpeed;
	}
	ball.rotationSpeed *= SPIN_DECAY;

	// Never let the ball go nearly vertical (it would bounce forever between walls)
	let minVX = ballSpeed * 0.35;
	if (abs(ball.vel.x) < minVX) {
		ball.vel.x = minVX * (ball.vel.x < 0 ? -1 : 1);
		ball.speed = ballSpeed;
	}

	// Scoring: ball fully past the left or right edge
	if (ball.x < left - ball.d) {
		score2++;
		resetBall(-1); // serve toward the player who was scored on
	} else if (ball.x > right + ball.d) {
		score1++;
		resetBall(1);
	}

	if (score1 >= WIN_SCORE) winner = 'Player 1';
	else if (score2 >= WIN_SCORE) winner = 'Player 2';
};

// Runs after physics, every frame (sprites are drawn after this)
q5.draw = function () {
	// Background image, scaled to cover the whole canvas without stretching
	let bgScale = max(canvas.w / bgImg.width, canvas.h / bgImg.height);
	push();
	imageMode(CENTER);
	image(bgImg, cx, cy, bgImg.width * bgScale, bgImg.height * bgScale);
	pop();

	// Dashed center line
	stroke('#ccc');
	strokeWeight(4);
	for (let y = top + WALL_THICKNESS; y < bottom - WALL_THICKNESS; y += 30) {
		line(cx, y, cx, y + 15);
	}
	noStroke();

	// Scores
	fill('#999');
	textAlign(CENTER, CENTER);
	textSize(64);
	text(score1, cx - 100, top + WALL_THICKNESS + 60);
	text(score2, cx + 100, top + WALL_THICKNESS + 60);

	textSize(16);
	text('W / S', cx - 100, top + WALL_THICKNESS + 110);
	text('↑ / ↓', cx + 100, top + WALL_THICKNESS + 110);

	if (winner) {
		// Dim the court so the victory screen stands out
		fill(0, 0, 0, 150);
		rect(left, top, canvas.w, canvas.h);

		// Trophy
		let trophySize = min(220, canvas.h * 0.35);
		push();
		imageMode(CENTER);
		image(trophyImg, cx, cy - trophySize / 2 - 10, trophySize, trophySize);
		pop();

		fill('white');
		textSize(48);
		text(winner + ' wins!', cx, cy + 40);
		textSize(20);
		text('Press SPACE to play again', cx, cy + 90);
	}
};
