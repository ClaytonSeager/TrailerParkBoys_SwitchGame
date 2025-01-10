class GameEngine {
    constructor() {
        this.currentLocation = 'parkEntrance';
        this.locationHistory = ['parkEntrance'];
        this.inventory = [];
        this.stats = {
            health: 100,
            mentalState: 100,
            money: 1000,
            cheeseburgers: 0,
            randyFriendship: 50
        };
    }

    move(direction) {
        if (!locations[this.currentLocation]) {
            console.error(`Invalid location: ${this.currentLocation}`);
            return;
        }

        const location = locations[this.currentLocation];
        
        if (direction === 'down' && this.locationHistory.length > 1) {
            this.locationHistory.pop();
            this.currentLocation = this.locationHistory[this.locationHistory.length - 1];
            this.updateDisplay();
            return;
        }

        if (!location.options || !location.options[direction]) {
            console.error(`Invalid direction ${direction} for location ${this.currentLocation}`);
            return;
        }

        const option = location.options[direction];

        if (option.effect) {
            Object.entries(option.effect).forEach(([stat, value]) => {
                if (this.stats.hasOwnProperty(stat)) {
                    this.stats[stat] += value;
                }
            });
        }

        if (option.nextLocation && locations[option.nextLocation]) {
            this.currentLocation = option.nextLocation;
            this.locationHistory.push(this.currentLocation);
            this.updateDisplay();
        } else {
            console.error(`Invalid next location: ${option.nextLocation}`);
        }
    }

    updateDisplay() {
        const location = locations[this.currentLocation];
        if (!location) {
            console.error(`Cannot update display: invalid location ${this.currentLocation}`);
            return;
        }

        const descriptionElement = document.querySelector('.whatHappensSpot');
        if (descriptionElement) {
            descriptionElement.textContent = location.description || '';
        }

        const gameImage = document.getElementById('gameImage');
        if (gameImage && location.image) {
            gameImage.src = location.image;
        }

        ['up', 'left', 'right'].forEach(direction => {
            const optionElement = document.querySelector(`.direction-option .arrow-${direction}`);
            if (optionElement) {
                const parentElement = optionElement.parentElement;
                const textElement = parentElement.querySelector('.option-text');
                
                if (location.options && location.options[direction]) {
                    parentElement.style.display = 'flex';
                    if (textElement) {
                        textElement.textContent = location.options[direction].text;
                    }
                } else {
                    parentElement.style.display = 'none';
                }
            }
        });

        const backElement = document.querySelector(`.direction-option .arrow-down`);
        if (backElement) {
            const parentElement = backElement.parentElement;
            const textElement = parentElement.querySelector('.option-text');
            
            if (this.locationHistory.length > 1) {
                parentElement.style.display = 'flex';
                if (textElement) {
                    textElement.textContent = 'Go Back';
                }
            } else {
                parentElement.style.display = 'none';
            }
        }

        ['health', 'mentalState', 'money', 'cheeseburgers'].forEach(stat => {
            const element = document.querySelector(`.${stat}Spot`);
            if (element) {
                let value = this.stats[stat];
                if (stat === 'money') value = `$${value}`;
                element.textContent = value;
            }
        });
    }
} 