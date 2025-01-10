const quests = {
    cartHeist: {
        id: 'cartHeist',
        title: 'Shopping Cart Heist',
        description: 'Help Bubbles collect shopping carts',
        stages: [
            {
                description: 'Meet Bubbles at the cart corral',
                reward: { money: 50 }
            },
            {
                description: 'Distract the store manager',
                reward: { mentalState: 10 }
            },
            {
                description: 'Load carts into the van',
                reward: { money: 100, health: -10 }
            }
        ]
    }
} 