"use strict";

const apiPath = "http://localhost:8080"

const d = document
const div = "div"

let mainView
let gameView
let topBar
let topTitle
let gameCodeInput
let playerNameInput
let gameCode
let user
let player
let game
let selectedCard
let cardsArrangedByUser = []

let discardRefresh = false

const isNull = (value) => {
    return value === null || value === undefined
}

// util DOM

const se= (id) => {
    return document.querySelector("#"+id)
}

const ce = (element, options) => {
    return d.createElement(element, options)
}

const newContainer = () => {
    let container = ce("div")
    container.setAttribute("class", "container")
    return container
}

const newCardDeck = () => {
    let cardDeck = ce("div")
    cardDeck.setAttribute("class", "card-deck mb-2 text-center")
    return cardDeck
}

const newCardBox = () => {
    let cardBox = ce("div")
    cardBox.setAttribute("class", "card mb-6 shadow-sm")
    return cardBox
}

const newCardHeader = () => {
    let header = ce("div")
    header.setAttribute("class", "card-header")
    return header
}

const newCardBody = () => {
    let body = ce("div")
    body.setAttribute("class", "card-body")
    return body
}

const h = (size, text) => {
    let h = ce("h"+size)
    h.innerHTML = text
    return h
}

const img = (image) => {
    let img = ce("img")
    img.setAttribute("src", image)
    return img
}

const clear = () => {
    game = null
    gameCode = null
    player = null
    selectedCard = null
    cardsArrangedByUser = []
    if(mainView) mainView.parentNode.removeChild(mainView);
}

// game code

const showError = (message) => {
    alert(message)
}

const apiCall = (call) => {
    discardRefresh = true
    return call.catch((error) => {
        showError('Error when calling API:' + error.message)
    })
    .then((response) => {
        if(response.ok) {
            return response.json()
        } else {
            showError('Error when calling API')
        }
    }).then((response) => {
        if(response.success === false) {
            showError(response.description)
        }
        else {
            if(response.success === true) {
                console.log(response.description)
            }
            return response
        }
    })
}

const getApiCall = (url) => {
    return apiCall(fetch(url))
}

const postApiCall = (url, data) => {
    return apiCall(fetch(url, {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(data), // data can be `string` or {object}!
        headers:{
            'Content-Type': 'application/json'
        }
    }))
}

const registerUser = (nextAction) => {
    return () => {
        let playerName = playerNameInput.value.trim()
        if (playerName === "") {
            showError("Invalid player name")
        } else {
            let newUser = {name: playerName, age: 110, countryOfResidence: "Arisa"}
            postApiCall(apiPath + "/users", newUser)
                .then(() => {
                    user = newUser
                    topTitle.innerHTML = "Buggy Games Chinchonazo - Welcome " + newUser.name
                    nextAction()
                })
        }
    }
}

const createNewGame = () => {
    postApiCall(apiPath + "/games", {userName: user.name})
        .then((response) => {
            game = response.game
            gameCode = game.name
            createNewGameView()
        })
}

const newGame = () => {
    if(user) {
        createNewGame()
    }
    else {
        createRegisterPlayerView(createNewGame)
    }
}

const completeJoin = () => {
    postApiCall(apiPath + "/games/" + gameCode + "/players", {userName: user.name, gameName: gameCode})
        .then(() => {
            return getApiCall(apiPath + "/games/" + gameCode)
        })
        .then((response) => {
            updateGame(response)
            updateViewGame()
        })
}

const joinGame = () => {
    gameCode = gameCodeInput.value.trim()
    if (gameCode === "") {
        showError("Invalid game code")
    }
    else if(user) {
        completeJoin()
    }
    else {
        createRegisterPlayerView(completeJoin)
    }
}

const startGame = () => {
    postApiCall(apiPath + "/games/" + game.name + "/start", {name: game.name})
        .then(() => {
            return postApiCall(apiPath + "/games/" + game.name + "/start_round", {name: game.name})
        })
        .then(() => {
            return getApiCall(apiPath + "/games/" + gameCode)
        })
        .then((response) => {
            updateGame(response)
            createGameTableView()
        })
}

const updateGame = (updatedGame) => {
    game = updatedGame
    player = game.players.find(p => p.user.name === user.name)
}

const takeCard = (fromDeck) => {
    return () => {
        postApiCall(apiPath + "/games/" + game.name + "/take_card", {gameName: game.name, playerName: player.user.name, fromDeck: fromDeck})
            .then(() => {
                return getApiCall(apiPath + "/games/" + gameCode)
            })
            .then((response) => {
                updateGame(response)
                updateViewGame()
            })
    }
}

const throwOrEndOrShowOrDiscard = (action, info, isShowOrDiscard) => {
    if(! isShowOrDiscard && isNull(selectedCard)) return
    postApiCall(apiPath + "/games/" + game.name + "/" + action, info)
        .then(() => {
            selectedCard = null;
            return getApiCall(apiPath + "/games/" + gameCode)
        })
        .then((response) => {
            updateGame(response)
            updateViewGame()
        })
}

const throwCard = () => {
    return throwOrEndOrShowOrDiscard("throw_card",
        {gameName: game.name, playerName: player.user.name, card: selectedCard}, false)
}

const joker1 = {suit: 5, number:102}
const joker2 = {suit: 5, number:103}

const isJoker = (card) => {
    return cardsAreEquals(card, joker1) || cardsAreEquals(card, joker2)
}

const moveIfJoker = (info) => {
    if(isJoker(info.a)) {
        info.a = cardsArrangedByUser[info.nextCardIndex]
        info.offset += 1
        info.nextCardIndex -= 1
    }
    return info
}

const lastCardInGame = (o) => {
    return (cardInGame(o) || isJoker(o.a)) // wildcard at the end is always part of the game
}

const cardInGame = (o) => {
    return (
        (o.a.suit === o.b.suit && Math.max(o.a.number, o.b.number) - (Math.min(o.a.number, o.b.number) + o.offset) === 0)  // sequence game
         ||
        (o.a.suit !== o.b.suit && o.a.number === o.b.number) // same card number game
    )
}

const isInGame = () => {
    let o = { a: cardsArrangedByUser[2], b: cardsArrangedByUser[3], nextCardIndex: 1, offset: 1 }
    o = moveIfJoker(o)
    return cardInGame(o)
}

const isValidNumber = (card, cards, jokers) => {
    return (
        cards.filter((c) => {
            return c.number !== card.number
        }).length === 0
        && cards.length + jokers < 5
        && cards.length + jokers > 2
    )
}

const isValidSuit = (jokers, cards) => {
    const validateSequence = (jokers, cardNumber, cards) => {
        if (cards.length === 0) {
            return true
        }
        else {
            if (cardNumber + 1 !== cards[0].number) {
                if (jokers < 1) {
                    return false
                }
                else {
                    return validateSequence(jokers - 1, cardNumber + 1, cards)
                }
            }
            else {
                return validateSequence(jokers, cards[0].number, cards.slice(1))
            }
        }
    }
    if (cards.slice(1).filter((c) => {return c.suit !== cards[0].suit}).length > 0) {
        return false
    }
    else {
        return validateSequence(jokers, cards[0].number, cards.slice(1))
    }
}


const isNotJoker = (card) => {
    return ! isJoker(card)
}

const sortBy = (property) => {
    return (a, b) => {
        if (a[property] < b[property]) return -1
        if (a[property] > b[property]) return 1
        return 0
    }
}

const isValidGame = (cards) => {
    let jokers = cards.filter(isJoker).length
    if (jokers > 1 && cards.length < 4) {
        return false
    }
    else {
        let withoutJoker = cards.filter(isNotJoker)
        return (
            isValidNumber(withoutJoker[0], withoutJoker, jokers)
            || isValidSuit(jokers, withoutJoker.sort(sortBy("number")))
        )
    }
}

const validateGame = (game) => {
    if(isValidGame(game)) {
        return game
    }
    else {
        return []
    }
}

const getGames = (toShowCards) => {
    let end
    let start
    if(isInGame()) {
        end = 4
        start = 4
    }
    else {
        end = 3
        start = 3
    }
    let game1 = cardsArrangedByUser.slice(0,end)
    let game2 = cardsArrangedByUser.slice(start,7)

    if(toShowCards) {
        game1 = validateGame(game1)
        game2 = validateGame(game2)
    }

    let o = { a: cardsArrangedByUser[5], b: cardsArrangedByUser[6], nextCardIndex: 4, offset: 1 }
    o = moveIfJoker(o)
    o = moveIfJoker(o)
    if(! lastCardInGame(o)) {
        game2.pop()
    }
    return Promise.resolve({game1: game1, game2: game2})
}

const endRound = () => {
    getGames(false).then((games) => {
        return throwOrEndOrShowOrDiscard("end_round",
            {gameName: game.name, playerName: player.user.name, card: selectedCard,
                        game1: games.game1, game2: games.game2},
            false)
        })
}

const showCards = () => {
    getGames(true).then((games) => {
        return throwOrEndOrShowOrDiscard("show_cards",
            {gameName: game.name, playerName: player.user.name, game1: games.game1, game2: games.game2},
            true)
    })
}

// refresh

const updateViewGame = () => {
    if(! game.started) {
        createNewGameView()
    }
    else {
        createGameTableView()
    }
}

const doRefresh = () => {
    if(discardRefresh) return
    if(isNull(gameCode) || gameCode.trim() === "") return

    getApiCall(apiPath + "/games/" + gameCode)
    .then((response) => {
        updateGame(response)
        updateViewGame()
    })
}

const getRefreshInterval = () => {
    if(! game.started) return 5000
    if(playingRound()) return 3000
    if(showingCards()) return 8000
}

const refresh = (now) => {
    discardRefresh = false
    if(now) doRefresh()
    setTimeout(doRefresh, getRefreshInterval())
}


// views

const newButton = (text, action) => {
    let newGameButton = ce("a")
    newGameButton.innerHTML = text
    newGameButton.setAttribute("class", "btn btn-success")
    newGameButton.setAttribute("href", "#")
    newGameButton.onclick = action
    return newGameButton
}

const createMainView = () => {
    mainView = ce("div")
    mainView.setAttribute("id", "main-view")
    document.body.appendChild(mainView)
}

const createTopBar = () => {
    topBar = ce("div")
    topBar.setAttribute("class", "d-flex flex-column flex-md-row align-items-center text-white-50 p-3 px-md-4 mb-3 bg-purple border-bottom shadow-sm")
    let playerName = user ? " - Welcome " + user.name : ""
    topTitle = h(5, "Buggy Games Chinchonazo" + playerName)
    topTitle.setAttribute("class", "my-0 mr-md-auto font-weight-normal text-white")
    let newGameButton = newButton("Home", startApp)
    topBar.appendChild(topTitle)
    topBar.appendChild(newGameButton)
    mainView.appendChild(topBar)
}

const createGameView = () => {
    if(gameView) gameView.parentNode.removeChild(gameView)
    gameView = ce("div")
    gameView.setAttribute("id", "game-view")
    mainView.appendChild(gameView)
}

const createJoinGameView = () => {
    createGameView()
    let section = ce("section")
    section.setAttribute("class","jumbotron text-left")
    let container = newContainer()
    let title = h(1, "Join Game")
    container.appendChild(title)
    let label = ce("p")
    label.setAttribute("class", "lead text-muted")
    label.innerHTML = "Please input the game code you want to join"
    container.appendChild(label)
    gameCodeInput = ce("input")
    let p = ce("p")
    p.appendChild(gameCodeInput)
    container.appendChild(p)
    let joinButton = newButton("Join", joinGame)
    p = ce("p")
    p.appendChild(joinButton)
    container.appendChild(p)
    label = ce("p")
    label.setAttribute("class", "lead text-muted")
    label.innerHTML = "Or create a new game and invite your friends"
    container.appendChild(label)
    let newGameButton = newButton("New Game", newGame)
    p = ce("p")
    p.appendChild(newGameButton)
    container.appendChild(p)
    section.appendChild(container)
    gameView.appendChild(section)
}

const createRegisterPlayerView = (nextAction) => {
    createGameView()
    let section = ce("section")
    section.setAttribute("class","jumbotron text-left")
    let container = newContainer()
    let title = h(1, "Register")
    container.appendChild(title)
    let label = ce("p")
    label.setAttribute("class", "lead text-muted")
    label.innerHTML = "Please input your name"
    container.appendChild(label)
    playerNameInput = ce("input")
    let p = ce("p")
    p.appendChild(playerNameInput)
    container.appendChild(p)
    let registerButton = newButton("Register", registerUser(nextAction))
    p = ce("p")
    p.appendChild(registerButton)
    container.appendChild(p)
    section.appendChild(container)
    gameView.appendChild(section)
}

const createNewGameView = () => {
    createGameView()
    let section = ce("section")
    section.setAttribute("class","jumbotron text-left")

    let isOwner = game.owner === user.name

    // new game code
    //
    let container = newContainer()
    let text = isOwner ? "Congrats! You have created a new game" : "Congrats! You have joined a new game"
    let title = h(1, text)
    container.appendChild(title)
    let label = ce("p")
    label.setAttribute("class", "lead text-muted")
    text = isOwner ? "This is the code you must share with your friends so they can join the game you just created" : "You can invite more friends with this code"
    label.innerHTML = text
    container.appendChild(label)
    let gameCode = h(1, game.name)
    container.appendChild(gameCode)
    section.appendChild(container)

    // players in game
    //
    container = newContainer()

    // players
    //
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()
    let cardHeader = newCardHeader()
    title = h(4, "Players")
    cardHeader.appendChild(title)
    cardBox.appendChild(cardHeader)
    let cardBody = newCardBody()

    game.players.forEach((player)=> {
        let p = ce("p")
        p.innerHTML = player.user.name
        cardBody.appendChild(p)
    })

    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)

    // start button
    //
    cardBox = newCardBox()
    cardBody = newCardBody()
    if(isOwner) {
        let p = ce("p")
        let startGameButton = newButton("Start Game", startGame)
        p.appendChild(startGameButton)
        cardBody.appendChild(p)
        p = ce("p")
        let cardDeckImage = img("images/slice_4_1.png")
        p.appendChild(cardDeckImage)
        cardBody.appendChild(p)
    }
    else {
        let p = ce("p")
        p.innerHTML = "We need to wait for " + game.owner + " who is the owner of this game, to start the game"
        cardBody.appendChild(p)
    }
    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)

    container.appendChild(cardDeck)
    section.appendChild(container)

    gameView.appendChild(section)

    refresh()
}

const DECK = {}

const suitIndex = (suit) => {
    return suit -1
}

const numberIndex = (number) => {
    return number -1
}

const getImageName = (card) => {
    if(card === DECK) {
        return "images/slice_4_1.png"
    }
    else {
        let suit = suitIndex(card.suit)
        let number = numberIndex(card.number)
        return "images/slice_" + suit + "_" + number + ".png"
    }
}

const selectCard = (card, image) => {
    return () => {
        image.parentNode.parentNode.parentNode.childNodes.forEach(elem => {
            elem.childNodes[0].style.backgroundColor = "white"
        })
        image.parentNode.style.backgroundColor = "aliceblue"
        selectedCard = card
    }
}

const cardDragStart = (card) => {
    return (ev) => {
        discardRefresh = true
        ev.dataTransfer.setData("application/my-app", ev.target.id);
        ev.dataTransfer.dropEffect = "move";
        console.log("drag start handler: s:" + card.suit + " n: " + card.number)
    }
}

const cardDragoverHandler = (card) => {
    return (ev) => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";
        console.log("drag over handler: s:" + card.suit + " n: " + card.number)
    }
}

const getCardById = (id) => {
    return player.cards.find((c) => { return getCardId(c) === id })
}

const cardsAreEquals = (a, b) => {
    return a.suit === b.suit && a.number === b.number
}

const cardDropHandler = (card) => {
    let __id = nextId()
    return (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = ev.dataTransfer.getData("application/my-app");
        const elem = document.getElementById(data)
        let cardId = elem.dataset.cardId
        const droppedCard = getCardById(cardId)

        if(ev.target.dataset.isCard === "yes") {
            cardId = ev.target.dataset.cardId
        }
        if(ev.target.dataset.isCardHolder === "yes") {
           cardId = ev.target.childNodes[0].dataset.cardId
        }
        let cardAfter = getCardById(cardId)
        let found = false
        let foundAfterCard = false
        let movedCard = droppedCard
        for(let i = 0; i<cardsArrangedByUser.length; i++) {
            if(! found) {
                foundAfterCard = cardsAreEquals(cardsArrangedByUser[i], cardAfter)
                found = foundAfterCard || cardsAreEquals(cardsArrangedByUser[i], droppedCard)
            }
            if(found) {
                if (foundAfterCard) {
                    const temp = cardsArrangedByUser[i]
                    cardsArrangedByUser[i] = movedCard
                    if (cardsAreEquals(temp, droppedCard)) {
                        break;
                    }
                    movedCard = temp
                }
                else {
                    cardsArrangedByUser[i] = cardsArrangedByUser[i+1]
                    if (cardsAreEquals(cardsArrangedByUser[i], cardAfter)) {
                        cardsArrangedByUser[i+1] = movedCard
                        break;
                    }
                }
            }
        }
        refresh(true)
        console.log("drop handler: s:" + card.suit + " n: " + card.number + " id " + __id)
    }
}

const nextId = (function() {
    let _nextId = 1
    return () => {
        _nextId = _nextId+1
        return "elem" + _nextId
    }
}())

const getCardId = (card) => {
    return "id_" + card.suit + "_" + card.number
}

const drawCard = (cardDeck, card) => {
    let cardBox = newCardBox()
    let cardBody = newCardBody()
    cardBody.id = nextId()
    cardBody.dataset.isCardHolder = "yes"
    cardBody.ondrop = cardDropHandler(card)
    cardBody.ondragover = cardDragoverHandler(card)
    let cardImage = img(getImageName(card))
    cardImage.id = nextId()
    cardImage.dataset.cardId = getCardId(card)
    cardImage.onclick = selectCard(card, cardImage)
    cardImage.addEventListener("dragstart", cardDragStart(card))
    cardImage.draggable = true
    cardImage.ondrop = cardDropHandler(card)
    cardImage.ondragover = cardDragoverHandler(card)
    cardImage.dataset.isCard = "yes"
    cardBody.appendChild(cardImage)
    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)
}

const drawCards = (cardBody, cards) => {
    let container = newContainer()
    let cardDeck = newCardDeck()
    cardBody.appendChild(container)
    container.appendChild(cardDeck)

    cards.forEach((card) => {
        drawCard(cardDeck, card)
    })
}

const addButton = (buttonGroup, id, text, active, action) => {
    let label = ce("label")
    label.setAttribute("class", "btn btn-secondary " + active)
    let button = ce("input")
    button.setAttribute("type", "radio")
    button.setAttribute("name", "throw-action")
    button.setAttribute("id", id)
    button.onclick = action
    label.innerHTML = text
    label.appendChild(button)
    buttonGroup.appendChild(label)
}

const cardExists = (card) => {
    return (c) => {
        return c.suit === card.suit && c.number === card.number
    }
}

const updateCardIndex = () => {
    cardsArrangedByUser = cardsArrangedByUser.filter((card) => {
        return player.cards.filter(cardExists(card)).length > 0
    })
    player.cards.filter((card) => {
        return cardsArrangedByUser.filter(cardExists(card)).length === 0
    }).forEach((card) => {
        cardsArrangedByUser.push(card)
    })
}

const drawHand = (hand, toShowCards) => {
    updateCardIndex()

    let cardHeader = newCardHeader()
    let container = newContainer()
    let buttonGroup = ce("div")

    buttonGroup.setAttribute("class", "btn-group btn-group-toggle")
    buttonGroup.setAttribute("data-toggle", "buttons")

    if(toShowCards) {
        addButton(buttonGroup, "throw-action-show-cards", "Show Cards", "", showCards)
    }
    else {
        addButton(buttonGroup, "throw-action-trow", "Throw", "active", throwCard)
        addButton(buttonGroup, "throw-action-cut", "Cut", "", endRound)
    }

    container.appendChild(buttonGroup)
    cardHeader.appendChild(container)
    hand.appendChild(cardHeader)

    let cardBody = newCardBody()
    drawCards(cardBody, cardsArrangedByUser.slice(0, 4))
    drawCards(cardBody, cardsArrangedByUser.slice(4))
    hand.appendChild(cardBody)
}

const createPlayingRound = () => {
    let container = newContainer()

    // table
    //

    // deck
    //
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()
    let cardBody = newCardBody()
    let cardImage = img(getImageName(DECK))
    cardImage.onclick = takeCard(true)
    cardBody.appendChild(cardImage)
    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)

    // card on table
    //
    cardBox = newCardBox()
    cardBody = newCardBody()
    if (game.onTable.length > 0) {
        cardImage = img(getImageName(game.onTable[0]))
        cardImage.onclick = takeCard(false)
        cardBody.appendChild(cardImage)
    }
    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)

    container.appendChild(cardDeck)
    gameView.appendChild(container)

    // hand
    //
    container = newContainer()
    cardDeck = newCardDeck()
    cardBox = newCardBox()

    drawHand(cardBox, false)

    cardDeck.appendChild(cardBox)
    container.appendChild(cardDeck)

    let p = ce("p")
    p.innerHTML = "Game: " + gameCode + " - " +
        (isMyTurn() ? " Pick a card" : " Waiting for " + nextPlayer().user.name + " to pick a card")
    container.appendChild(p)

    gameView.appendChild(container)
}

const drawShowCards = (hand, player) => {

    let cardHeader = newCardHeader()
    let container = newContainer()
    container.appendChild(h(3, player.user.name))
    cardHeader.appendChild(container)
    hand.appendChild(cardHeader)

    let cardBody = newCardBody()
    drawCards(cardBody, player.game1)
    drawCards(cardBody, player.game2)
    hand.appendChild(cardBody)
}

const showCardsOfOtherPlayer = (player) => {
    let container = newContainer()
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()

    drawShowCards(cardBox, player)

    cardDeck.appendChild(cardBox)
    container.appendChild(cardDeck)

    gameView.appendChild(container)
}

const showMyCards = () => {
    let container = newContainer()
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()

    container.appendChild(h(3,"Arrange your game and click on Show cards button"))
    container.appendChild(h(5,"You can see the game of other players bellow your own hand"))

    drawHand(cardBox, true)

    cardDeck.appendChild(cardBox)
    container.appendChild(cardDeck)

    gameView.appendChild(container)
}

const createShowingCards = () => {

    showMyCards()

    let self = player

    game.players.forEach((player) => {

        if(player.user.name !== self.user.name) {
            showCardsOfOtherPlayer(player)
        }
    })

    let container = newContainer()
    let p = ce("p")
    p.innerHTML = "Game: " + gameCode + " - Arrange your game and click on 'Show Cards' button. You can see the game of other players bellow your own hand"
    container.appendChild(p)
    gameView.appendChild(container)
}

const roundFinished = () => {
    return game.rounds[game.rounds.length-1].finished
}

const playingRound = () => {
    return game.started && ! roundFinished()
}

const showingCards = () => {
    return roundFinished() && ! cardsShowed()
}

const cardsShowed = () => {
    return game.rounds[game.rounds.length-1].cardsShowed
}

const cardsDiscarded = () => {
    return game.rounds[game.rounds.length-1].cardsDiscarded
}

const createGameTableView = () => {
    createGameView()

    if(! roundFinished()) {
        createPlayingRound()
    }
    else if(! cardsShowed()) {
        createShowingCards()
    }
    else if(! cardsDiscarded()) {

    }

    if(! isMyTurn() || showingCards()) refresh()
}

const nextPlayer = () => {
    return game.rounds[game.rounds.length -1].nextPlayer
}

const isMyTurn = () => {
    return nextPlayer().user.name === user.name
}

const startApp = () => {
    discardRefresh = true
    clear()
    createMainView()
    createTopBar()
    createJoinGameView()
}

const main = () => {
    mainView = se("main-view")
    //startApp()
}

// these dummy declarations helps intellij to highlight errors
//
let dummyResponse = {game: {}}
let dummyCard = {suit: 1, number: 1}
let dummyGame = {rounds: [], players: [], onTable: [], onDeck: [], started: false, owner: {}}
let dummyRound = {nextPlayer: "", cardsShowed: false, finished: false, cardsDiscarded: false, scores: []}
let dummyPlayer = {cards: []}