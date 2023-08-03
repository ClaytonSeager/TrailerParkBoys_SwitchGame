// ==== Variables ==== //
let healthSpot = document.querySelector(".healthSpot");
let mentalStateSpot = document.querySelector(".mentalStateSpot");
let moneySpot = document.querySelector(".moneySpot");
let whatHappensSpot = document.querySelector(".whatHappensSpot");
let health = 100;
let mentalState = 100;
let money = 1000;
let upButton = document.querySelector(".up");
let rightButton = document.querySelector(".right");
let downButton = document.querySelector(".down");
let leftButton = document.querySelector(".left");

setStats();
console.log("Lets go on an adventure in Sunnyvale Trailer Park! Your current standing is:");
console.log("Health: " + health);
console.log("Mental State: " + mentalState);
console.log("Cash Balance: " + money)

// ==== Event Listeners ==== //
upButton.addEventListener("click", moveUp);
rightButton.addEventListener("click", moveRight);
downButton.addEventListener("click", moveDown);
leftButton.addEventListener("click", moveLeft);

// ==== Functions ==== //
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

function setStats() {
    healthSpot.textContent = health;
    mentalStateSpot.textContent = mentalState;
    moneySpot.textContent = money;
}
function displayMessage(whatHappend) {
    whatHappensSpot.textContent = whatHappend;
}
function move(direction) {
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

