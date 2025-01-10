// ==== Variables ==== //
let healthSpot = document.querySelector(".healthSpot");
let mentalStateSpot = document.querySelector(".mentalStateSpot");
let moneySpot = document.querySelector(".moneySpot");
let whatHappensSpot = document.querySelector(".whatHappensSpot");
let upSpot = document.querySelector(".upSpot");
let rightSpot = document.querySelector(".rightSpot");
let downSpot = document.querySelector(".downSpot");
let leftSpot = document.querySelector(".leftSpot");
let health = 100;
let mentalState = 100;
let money = 1000;
let upButton = document.querySelector(".up");
let rightButton = document.querySelector(".right");
let downButton = document.querySelector(".down");
let leftButton = document.querySelector(".left");
// New Code To Add Keyboard Arrow Input
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case "ArrowUp":
            moveUp();
            break;
        case "ArrowRight":
            moveRight();
            break;
        case "ArrowDown":
            moveDown();
            break;
        case "ArrowLeft":
            moveLeft();
            break;
    }
});
// The above code should allow for usage of keyboard arrow keys to work exactly the same as the buttons on page.
let img = document.querySelector("#gameImage")
let OGMove = [moveUp, moveRight, moveLeft, moveDown]
let images = ["angryRandy.png", "randyLicking.png"]

// whatIsGoingOn.forward[0].move1();
let whatIsGoingOn = {
    forward: [
            {
                move1: moveUp,
                move2: moveUp,
                move3: moveUp,
                move4: moveUp,
                move5: moveUp
            },
        ],
    right: [
            {
                move1: moveRight,
                move2: moveRight,
                move3: moveRight,
                move4: moveRight,
                move5: moveRight
            }
        ],
    down: [
            {
                move1: moveDown,
                move2: moveDown,
                move3: moveDown,
                move4: moveDown,
                move5: moveDown
            },
        ],
    left: [
            {
                move1: moveLeft,
                move2: moveLeft,
                move3: moveLeft,
                move4: moveLeft,
                move5: moveLeft
            }
        ]
};

setStats();
console.log("Lets go on an adventure in Sunnyvale Trailer Park! Your current standing is:");
console.log("Health: " + health);
console.log("Mental State: " + mentalState);
console.log("Cash Balance: " + money)

// ==== Event Listeners ==== //
upButton.addEventListener("click", OGMove[0]);
rightButton.addEventListener("click", OGMove[1]);
downButton.addEventListener("click", OGMove[3]);
leftButton.addEventListener("click", OGMove[2]);

// ==== Move Functions ==== //
function moveUp() {
    move("forward");
}
function moveRight() {
    move("right");
}
function moveDown() {
    move("back");
}
function moveLeft() {
    move("left");
}

// ==== Functions ==== //

function imgChange(integer) {
    if (integer === 1) {
        img.src = images[0];
    } else if (integer === 2) {
        img.src = images[1]
    }

}
function setStats() {
    healthSpot.textContent = health;
    mentalStateSpot.textContent = mentalState;
    moneySpot.textContent = money;
}
function displayMessage(whatHappened) {
    whatHappensSpot.textContent = whatHappened;
}
function changeDirectionText(up, right, down, left) {
    upSpot.textContent = up;
    rightSpot.textContent = right;
    downSpot.textContent = down;
    leftSpot.textContent = left;
}

function move(direction) {
    let whatHappens;
    let responseUpText;
    let responseRightText;
    let responseDownText;
    let responseLeftText;
    switch (direction) {
        case "forward":
            whatHappens = "Randy yells for Mr. Lahey and tells you to frig off! You head over to Bubbles Shed";
            mentalState = mentalState - 25;
            responseUpText = "↑: Knock on Bubbles Shed";
            responseRightText = "→: Pet one of his cats";
            responseDownText = "↓: Go back to the entrance";
            responseLeftText = "←: Head over to Rickys shitmobile";
            break;
        case "back":
            whatHappens = "You walk back to the entrance, and Randy is now following you. Still has his popsicle.";
            mentalState = mentalState + 20;
            responseUpText = "↑: Tell Randy to Fuck Off!";
            responseRightText = "→: Yell for Jacob and Cory to get over here!";
            responseDownText = "↓: Leave the park";
            responseLeftText = "←: Head into his shack to get a Popsicle!";
            break;
        case "left":
            whatHappens = "You see a huge stack of popsicle sticks, and he looks at you and says \"What? It's low calorie!\"";
            money = money + 10;
            responseUpText = "↑: Ask Randy for a popsicle";
            responseRightText = "→: Knock over his popsicle stick house";
            responseDownText = "↓: Go back to the entrance";
            responseLeftText = "←: Call him a greasy cheeseburger walrus";
            break;
        case "right":
            whatHappens = "You walked right into Rickys shitmobile, and Ricky decides to use the clearing stick on you";
            health = health - 90;
            responseRightText = "You were knocked out";
            break;
    }
    setStats();
    changeDirectionText(responseUpText, responseRightText, responseDownText, responseLeftText)
    displayMessage(whatHappens);
    console.log(whatHappens);
    console.log("Health = " + health);
    console.log("Mental State = " + mentalState);
    console.log("Cash = " + money);
}
if (move === "forward") {
    imgChange(1);
    upButton.removeEventListener("click", OGMove[0]);
    upButton.addEventListener("click", TellRandytoFuckOff);
} else if (move === "right") {
    rightButton.removeEventListener("click", OGMove[1]);
    rightButton.addEventListener("click", TellRandytoFuckOff);
} else if (move === "down") {
    downButton.removeEventListener("click", OGMove[3]);
    downButton.addEventListener("click", TellRandytoFuckOff);
} else if (move === "left") {
    leftButton.removeEventListener("click", OGMove[2]);
    leftButton.addEventListener("click", TellRandytoFuckOff);
}
function TellRandytoFuckOff(direction) {
    let whatHappens;
    switch (direction) {
        case "forward":
            whatHappens = "You walked to SEAGINATORS house and spent a night coding";
            mentalState = mentalState - 25;
            break;
        case "back":
            whatHappens = "You walked into Mr. Lahey, you now are being told a story about shit hawks";
            mentalState = mentalState - 20;
            break;
        case "left":
            whatHappens = "You walked over to Bubbles Shed, and are now tasked with finding more shopping carts. He gives you $10 though!";
            money = money + 10;
            break;
        case "right":
            whatHappens = "You walked right into Rickys shitmobile, and Ricky decides to use the clearing stick on you";
            health = health - 10;
            break;
    }
    setStats();
    displayMessage(whatHappens);
    console.log(whatHappens);
    console.log("Health = " + health);
    console.log("Mental State = " + mentalState);
    console.log("Cash = " + money);
}

