const locations = {
    parkEntrance: {
        id: 'parkEntrance',
        description: 'You walk up to the entrance and Randy wants to know if you are here to see Ricky',
        image: 'story/images/randyLicking.png',
        options: {
            up: {
                text: 'Tell Randy to Fuck Off!',
                nextLocation: 'confrontRandy',
                effect: {
                    mentalState: -10,
                    health: -5
                }
            },
            left: {
                text: 'Get a Popsicle',
                nextLocation: 'randysPopsicles',
                effect: {
                    money: -2,
                    mentalState: +5
                }
            },
            right: {
                text: 'Call Jacob and Cory',
                nextLocation: 'jacobAndCory',
                effect: {
                    money: -5,
                    mentalState: +10
                }
            }
        }
    },
    
    confrontRandy: {
        id: 'confrontRandy',
        description: '"Frig off! The pants are coming off!" Randy yells as he starts removing his pants...',
        image: 'story/images/RandyAngryPants.webp',
        options: {
            up: {
                text: 'Square up with Randy',
                nextLocation: 'randyFight',
                effect: {
                    health: -20,
                    mentalState: -15
                }
            },
            right: {
                text: 'Run to Julian\'s trailer',
                nextLocation: 'juliansTrailer',
                effect: {
                    mentalState: -5
                }
            },
            left: {
                text: 'Offer him a cheeseburger',
                nextLocation: 'randyReconcile',
                effect: {
                    cheeseburgers: -1,
                    randyFriendship: +15
                }
            }
        }
    },

    randyFight: {
        id: 'randyFight',
        description: 'Randy charges at you with his greasy belly! Mr. Lahey watches from his trailer, drink in hand.',
        image: 'story/images/RandyNoPants.png',
        options: {
            up: {
                text: 'Try to dodge the belly',
                nextLocation: 'dodgeRandy',
                effect: {
                    health: -10,
                    mentalState: -5
                }
            },
            right: {
                text: 'Call for Bubbles\' help',
                nextLocation: 'bubblesHelps',
                effect: {}
            },
            left: {
                text: 'Throw a cheeseburger distraction',
                nextLocation: 'cheeseburgerDistraction',
                effect: {
                    cheeseburgers: -1,
                    randyFriendship: +10
                }
            }
        }
    },

    dodgeRandy: {
        id: 'dodgeRandy',
        description: 'You barely dodge Randy\'s belly attack! Suddenly, you hear Lahey yell "RANDY!"',
        image: 'story/images/laheyYelling.png',
        options: {
            up: {
                text: 'Watch the show unfold',
                nextLocation: 'laheyIntervention',
                effect: {
                    mentalState: +10
                }
            },
            right: {
                text: 'Sneak away to Ricky\'s',
                nextLocation: 'rickyTrailer',
                effect: {}
            },
            left: {
                text: 'Hide in Bubbles\' shed',
                nextLocation: 'bubblesShed',
                effect: {}
            }
        }
    },

    cheeseburgerDistraction: {
        id: 'cheeseburgerDistraction',
        description: 'Randy stops mid-charge as the cheeseburger flies through the air. "A man\'s gotta eat..."',
        image: 'story/images/RandyGettingCheeseburger.jpg',
        options: {
            up: {
                text: 'Make peace with Randy',
                nextLocation: 'randyFriendship',
                effect: {
                    randyFriendship: +20,
                    mentalState: +10
                }
            },
            right: {
                text: 'Go to the Dirty Burger',
                nextLocation: 'dirtyBurger',
                effect: {}
            },
            left: {
                text: 'Ask about Mr. Lahey',
                nextLocation: 'randyLaheyStory',
                effect: {
                    randyFriendship: +5
                }
            }
        }
    },

    juliansTrailer: {
        id: 'juliansTrailer',
        description: 'Julian is sitting in his chair, rum and coke in hand, planning something greasy...',
        image: 'julianDrink.png',
        options: {
            up: {
                text: 'Ask about his latest scheme',
                nextLocation: 'julianScheme',
                effect: {
                    mentalState: +10
                }
            },
            right: {
                text: 'Go see Bubbles',
                nextLocation: 'bubblesShack',
                effect: {}
            },
            left: {
                text: 'Steal his drink',
                nextLocation: 'julianAngry',
                effect: {
                    health: -30,
                    mentalState: -20
                }
            }
        }
    },

    laheyInterrupts: {
        id: 'laheyInterrupts',
        description: '"Randy! What in the liquor is going on here?!" Lahey stumbles in, drink in hand.',
        image: 'story/images/laheyDrunk.png',
        options: {
            up: {
                text: 'Explain yourself to Lahey',
                nextLocation: 'laheyConfrontation',
                effect: {
                    mentalState: -10
                }
            },
            right: {
                text: 'Run away',
                nextLocation: 'parkEntrance',
                effect: {
                    mentalState: -5
                }
            },
            left: {
                text: 'Hide behind Randy',
                nextLocation: 'randyProtection',
                effect: {}
            }
        }
    },

    randyProtection: {
        id: 'randyProtection',
        description: '"Mr Lahey, leave them alone, they just gave me a cheeseburger!"',
        image: 'story/images/randyProtecting.png',
        options: {
            up: {
                text: 'Give Randy another cheeseburger',
                nextLocation: 'randyHappy',
                effect: {
                    cheeseburgers: -1,
                    randyFriendship: +15
                },
                condition: {
                    cheeseburgers: 1
                }
            },
            right: {
                text: 'Sneak away while they argue',
                nextLocation: 'parkEntrance',
                effect: {}
            },
            left: {
                text: 'Try to calm Lahey down',
                nextLocation: 'laheyCalming',
                effect: {}
            }
        }
    },

    dirtyBurger: {
        id: 'dirtyBurger',
        description: 'The Dirty Burger stand is open! "Want a burger?" Randy asks hopefully.',
        image: 'story/images/dirtyBurger.png',
        options: {
            up: {
                text: 'Buy a cheeseburger ($5)',
                nextLocation: 'dirtyBurger',
                effect: {
                    money: -5,
                    cheeseburgers: +1,
                    randyFriendship: +5
                }
            },
            right: {
                text: 'Ask about Mr. Lahey',
                nextLocation: 'randyLaheyStory',
                effect: {}
            },
            left: {
                text: 'Compliment his cooking',
                nextLocation: 'randyProud',
                effect: {
                    randyFriendship: +10
                }
            }
        }
    },

    randysPopsicles: {
        id: 'randysPopsicles',
        description: '"Want a popsicle? They\'re melting all over my chest..."',
        image: 'story/images/randyPopsicle.png',
        options: {
            up: {
                text: 'Accept the melted popsicle',
                nextLocation: 'meltedPopsicle',
                effect: {
                    mentalState: -15,
                    randyFriendship: +10
                }
            },
            right: {
                text: 'Ask why he\'s not wearing a shirt',
                nextLocation: 'randyShirtless',
                effect: {
                    mentalState: -5
                }
            },
            left: {
                text: 'Offer to buy all his popsicles',
                nextLocation: 'popsicleDealer',
                effect: {
                    money: -20,
                    mentalState: +10,
                    randyFriendship: +15
                }
            }
        }
    },

    jacobAndCory: {
        id: 'jacobAndCory',
        description: 'Jacob and Cory show up looking sketchy as usual. "We\'re supposed to be helping Ricky with something greasy!"',
        image: 'story/images/jacobCory.png',
        options: {
            up: {
                text: 'Join their sketchy plan',
                nextLocation: 'greasyScheme',
                effect: {
                    mentalState: +15,
                    money: +50,
                    health: -10
                }
            },
            right: {
                text: 'Ask about Julian',
                nextLocation: 'juliansLocation',
                effect: {}
            },
            left: {
                text: 'Send them to distract Randy',
                nextLocation: 'distractRandy',
                effect: {
                    mentalState: +20
                }
            }
        }
    },

    goFuckYourself: {
        id: 'goFuckYourself',
        description: '"Yeah? Well the pants are coming off AND I\'m telling Mr. Lahey!" Randy storms off, his bare chest glistening with popsicle juice.',
        image: 'story/images/randyAngry.png',
        options: {
            up: {
                text: 'Whatever, gut Cassidy',
                nextLocation: 'parkEntrance',
                effect: {
                    randyFriendship: -20
                }
            },
            right: {
                text: 'Yell "Frig off, Randy!"',
                nextLocation: 'parkEntrance',
                effect: {
                    mentalState: +5,
                    randyFriendship: -10
                }
            },
            left: {
                text: 'Throw a cheeseburger at him',
                nextLocation: 'angryCheeseburger',
                effect: {
                    cheeseburgers: -1,
                    randyFriendship: -5
                }
            }
        }
    }
}; 