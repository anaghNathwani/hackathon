# Prompts Entered

## Prompt #1
Hello! We are creating a game in q5play. We are coidng this in JavaScript. Why does the following code result in a black error screen?:
// sketch.js
await Canvas
let player;

q5.update = function () {
	//input _ game logic go here

	player = new Sprite()
	player.diameter = 20;
	player.physics = DYNAMIC;
	player.color = 'red';
	
	
	//Assigning keybord input to the player
	if (kb.isPressed('ArrowUp')) {
		player.applyForce(0, -0.5);
	}
	if (kb.isPressed('ArrowDown')) {
		player.applyForce(0, 0.5);
	}
};

//runs after physics, every frame

q5.draw = function () {
	
	background('white'); // this can change later
	
}
## Prompt 2
Can you make the hitboxes fit the sprite? Also the right_wall_nobody.png file isn't showing up. Make background.png the background and trophy.png the trophy at victory.




## Prompt 3 
yo bro remove the green bordes dawg