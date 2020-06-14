"use strict";

// TO be able to edit and continue :P
// const apiPath = "http://localhost:8080"
const apiPath = ""

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
let cardsArrangedByUser = []  // my hand state in browser
let otherPlayers = []         // others hand state in browser

let blankCard = {}
let blankCardInGame1 = {suit: 5, number: 3}
let blankCardInGame2 = {suit: 5, number: 4}

let cancelRefresh = false

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

const apiCall = (call, isForPost) => {
    cancelRefresh = true
    return call.catch((error) => {
        showError('Error when calling API:' + error.message)
        return Promise.reject()
    })
    .then((response) => {
        if(response.ok) {
            return response.json()
        } else {
            showError('Error when calling API')
            return Promise.reject()
        }
    }).then((response) => {
        if(isForPost === true && response.success === false) {
            showError(response.description)
        }
        return response
    })
}

const getApiCall = (url) => {
    return apiCall(fetch(url))
}

const ifSuccess = (block) => {
    return (response) => {
        if(! isNull(response) && response.success === true) {
            return block(response)
        }
        else {
            return Promise.reject()
        }
    }
}

const postApiCall = (url, data) => {
    return apiCall(fetch(url, {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(data), // data can be `string` or {object}!
        headers:{
            'Content-Type': 'application/json'
        }
    }), true)
}

const registerUser = (nextAction) => {
    return () => {
        let playerName = playerNameInput.value.trim()
        if (playerName === "") {
            showError("Invalid player name")
        } else {
            let newUser = {name: playerName, age: 110, countryOfResidence: "Arisa"}
            postApiCall(apiPath + "/users", newUser)
                .then(ifSuccess(() => {
                    user = newUser
                    topTitle.innerHTML = "Buggy Games Chinchonazo - Welcome " + newUser.name
                    nextAction()
                }))
        }
    }
}

const createNewGame = () => {
    postApiCall(apiPath + "/games", {userName: user.name})
        .then(ifSuccess((response) => {
            game = response.game
            gameCode = game.name
            createNewGameView()
        }))
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
        .then(ifSuccess(startRound))
}

const startRound = () => {
    // clean state of round
    otherPlayers = []
    cardsArrangedByUser = []

    postApiCall(apiPath + "/games/" + game.name + "/start_round", {name: game.name})
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

const throwOrEndOrShowOrDiscard = (action, info, isShowOrDiscard, isDiscard) => {
    if(! isShowOrDiscard && isNull(selectedCard)) return Promise.reject()
    return postApiCall(apiPath + "/games/" + game.name + "/" + action, info)
        .then(ifSuccess(() => {
            selectedCard = null;
            if(isDiscard) {
                otherPlayers = []
                cardsArrangedByUser = []
            }
            return getApiCall(apiPath + "/games/" + gameCode)
        }))
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

const moveIfJoker = (info, cards) => {
    if(isJoker(info.a)) {
        info.a = cards[info.nextCardIndex]
        info.offset += 1
        info.nextCardIndex -= 1
    }
    return info
}

const lastCardInGame = (o, cards) => {
    return (cardInGame(o, cards) || isJoker(o.a)) // wildcard at the end is always part of the game
}

const cardInGame = (o, cards) => {
    let jokers = cards.filter(isJoker).length
    let withoutJoker = cards.filter(isNotJoker)
    if(o.a == undefined || o.b == undefined) {
        debugger
        throw new Error("invalid state for object o")
    }
    return (
        (
            o.a.suit === o.b.suit
            && Math.max(o.a.number, o.b.number) - (Math.min(o.a.number, o.b.number) + o.offset) === 0  // sequence game
            && isValidSuit(jokers, withoutJoker.sort(sortBy("number")))
        ) || (
            o.a.suit !== o.b.suit && o.a.number === o.b.number
            && isValidNumber(cards[0], withoutJoker, jokers)
        ) // same card number game
    )
}

const fourthCardIsInGame = (cards) => {
    let o = { a: cards[2], b: cards[3], nextCardIndex: 1, offset: 1 }
    o = moveIfJoker(o, cards)
    o = moveIfJoker(o, cards)
    return cardInGame(o, cards)
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
    let game1 = []
    let game2 = []
    if(cardsArrangedByUser.length > 0) {
        let end
        let start
        if(fourthCardIsInGame(cardsArrangedByUser.slice(0,4))) {
            end = 4
            start = 4
        }
        else {
            end = 3
            start = 3
        }
        game1 = cardsArrangedByUser.slice(0,end)
        game2 = cardsArrangedByUser.slice(start,7)

        if(toShowCards) {
            game1 = validateGame(game1)
            if(game2.length > 3 &&  ! fourthCardIsInGame(game2)) {
                game2 = game2.slice(0,3)
            }
            game2 = validateGame(game2)
        }

        if(game2.length > 3) {
            let o = {a: game2[2], b: game2[3], nextCardIndex: 1, offset: 1}
            o = moveIfJoker(o, game2)
            o = moveIfJoker(o, game2)
            if (!lastCardInGame(o, game2.slice(0, 3))) {
                game2.pop()
            }
        }
    }
    return Promise.resolve({game1: game1, game2: game2})
}

const getDiscardedCards = () => {
    return Promise.resolve(
        otherPlayers.map(p => {
            return {
                playerName: p.user.name,
                game1: p.game1,
                game2: p.game2,
                discardedCards: p.game1.filter(c => c.discarded === true).concat(p.game2.filter(c => c.discarded === true))
            }
        })
    )
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

const discardCards = () => {
    getDiscardedCards().then((discardedCards) => {
        return throwOrEndOrShowOrDiscard("discard_cards",
            {gameName: game.name, playerName: player.user.name, discard: discardedCards},
            true, true)
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
    if(cancelRefresh) return
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
    if(waitingForRoundToStart()) return 3000
    debugger
    throw new Error("Can't get refresh interval")
}

const refresh = (now) => {
    cancelRefresh = false
    if(now) {
        doRefresh()
    }
    setTimeout(doRefresh, getRefreshInterval())
}


// views
let copyArea

const createCopyArea = () => {
    copyArea = document.createElement("textarea");
    copyArea.className = "offscreen"
    copyArea.setAttribute('aria-hidden', 'true')
    document.body.appendChild(copyArea)
}

const copy = (text) => {
    return () => {
        copyArea.value= text
        copyArea.select();
        copyArea.setSelectionRange(0, 99999)
        document.execCommand("copy")
    }
}

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
    let gameCode = h(1, game.name + "    ")
    let copyButton = newButton("Copy", copy(game.name))
    gameCode.appendChild(copyButton)
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
        cancelRefresh = true
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

const getOthersHandById = (playerName, id) => {
    let player = otherPlayers.find((p) => {return p.user.name === playerName})
    if(isNull(player)) {
        player = game.players.find((p) => {
            return p.user.name === playerName
        })
        otherPlayers.push(player)
    }
    if(isBlankCard(id)) {
        let game = isBlankCardGame1(id) ? player.game1 : player.game2
        return {otherPlayerGame: game, cardAfter: blankCard}
    }
    else {
        let card = player.game1.find((c) => {
            return getCardId(c) === id
        })
        if (card) {
            return {otherPlayerGame: player.game1, cardAfter: card}
        }
        card = player.game2.find((c) => {
            return getCardId(c) === id
        })
        if (card) {
            return {otherPlayerGame: player.game2, cardAfter: card}
        }
    }
}

const cardsAreEquals = (a, b) => {
    if(a == undefined || b == undefined) {
        debugger
        throw new Error("invalid state for objects a and b")
    }
    return a.suit === b.suit && a.number === b.number
}

const cardDropHandlerMyCards = (card) => {
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

const cardDropHandlerOtherCards = (card) => {
    let __id = nextId()
    return (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = ev.dataTransfer.getData("application/my-app");
        const elem = document.getElementById(data)
        let cardId = elem.dataset.cardId
        const droppedCard = getCardById(cardId)
        let playerName

        if(ev.target.dataset.isCard === "yes") {
            cardId = ev.target.dataset.cardId
            playerName = ev.target.dataset.playerName
        }
        if(ev.target.dataset.isCardHolder === "yes") {
            cardId = ev.target.childNodes[0].dataset.cardId
            playerName = ev.target.childNodes[0].dataset.playerName
        }

        removeCardInOtherGames(droppedCard)

        let {otherPlayerGame, cardAfter} = getOthersHandById(playerName, cardId)
        let found = false
        let movedCard = droppedCard
        if(cardAfter === blankCard) {
            otherPlayerGame[otherPlayerGame.length] = movedCard
        }
        else {
            for (let i = 0, count = otherPlayerGame.length + 1; i < count; i++) {
                if (!found) {
                    found = cardsAreEquals(otherPlayerGame[i], cardAfter)
                }
                if (found) {
                    const temp = otherPlayerGame[i]
                    otherPlayerGame[i] = movedCard
                    movedCard = temp
                }
            }
        }
        discardCard(droppedCard)

        refresh(true)
        console.log("drop handler: s:" + card.suit + " n: " + card.number + " id " + __id)
    }
}

const removeCardInOtherGames = (card) => {
    otherPlayers.forEach(p => {
        p.game1 = removeCard(p.game1, card)
        p.game2 = removeCard(p.game2, card)
    })
}

const isBlankCardGame1 = (cardId) => {
    return getCardId(blankCardInGame1) === cardId
}

const isBlankCardGame2 = (cardId) => {
    return getCardId(blankCardInGame2) === cardId
}

const isBlankCard = (cardId) => {
    return isBlankCardGame1(cardId) || isBlankCardGame2(cardId)
}

const removeCard = (cards, card) => {
    let id = getCardId(card)
    return cards.filter(c=> getCardId(c) !== id)
}

const discardCard = (card) => {
    card.discarded = true
    const id = getCardId(card)
    card = cardsArrangedByUser.find((c) => { return getCardId(c) === id })
    card.discarded = true
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

const setDragAndDropMyCards = (cardBody, cardImage, card) => {
    cardBody.ondrop = cardDropHandlerMyCards(card)
    cardImage.ondrop = cardDropHandlerMyCards(card)
    setDragAndDrop(cardBody, cardImage, card)
}

const setDragAndDropOthersCards = (playerName) => {
    return (cardBody, cardImage, card) => {
        cardImage.dataset.playerName = playerName
        cardBody.ondrop = cardDropHandlerOtherCards(card)
        cardImage.ondrop = cardDropHandlerOtherCards(card)
        setDragAndDrop(cardBody, cardImage, card)
    }
}

const setDragAndDrop = (cardBody, cardImage, card) => {
    cardBody.ondragover = cardDragoverHandler(card)
    cardBody.dataset.isCardHolder = "yes"
    cardImage.dataset.cardId = getCardId(card)
    cardImage.draggable = true
    cardImage.dataset.isCard = "yes"
    cardImage.ondragover = cardDragoverHandler(card)
    cardImage.addEventListener("dragstart", cardDragStart(card))
}

const getCardIdBody = (card) => {
    return "B_" + getCardId(card)
}

const getCardIdImage = (card) => {
    return "I_" + getCardId(card)
}

const getCardBodyByCard = (card) => {
    let elem = document.getElementById(getCardIdBody(card))
    if(isNull(elem)) {
        debugger
        throw new Error("Can't get an element for card " + card)
    }
    return elem
}

const getCardImageByCard = (card) => {
    let elem = document.getElementById(getCardIdImage(card))
    if(isNull(elem)) {
        debugger
        throw new Error("Can't get an element for card " + card)
    }
    return elem
}

const drawCard = (cardDeck, card, setDragAndDrop) => {
    let cardBox = newCardBox()
    let cardBody = newCardBody()
    cardBody.id = getCardIdBody(card)
    if(card.discarded) {
        cardBody.style.backgroundColor = "navajowhite"
    }
    let cardImage = img(getImageName(card))
    cardImage.id = getCardIdImage(card)
    cardImage.onclick = selectCard(card, cardImage)
    setDragAndDrop(cardBody, cardImage, card)
    cardBody.appendChild(cardImage)
    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)
}

const drawCards = (cardBody, cards, setDragAndDrop, showDiscarded, blankCard) => {
    let container = newContainer()
    let cardDeck = newCardDeck()
    cardBody.appendChild(container)
    container.appendChild(cardDeck)

    cards.forEach((card) => {
        if(card.discarded !== true || showDiscarded === true) {
            drawCard(cardDeck, card, setDragAndDrop)
        }
    })

    if(blankCard !== undefined && cards.length > 0) {
        drawCard(cardDeck, blankCard, setDragAndDrop)
    }
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
        if(! cardsShowed()) {
            addButton(buttonGroup, "throw-action-show-cards", "Show Cards", "", showCards)
        }
        else {
            addButton(buttonGroup, "throw-action-discard-cards", "Discard Cards", "", discardCards)
        }
    }
    else {
        addButton(buttonGroup, "throw-action-trow", "Throw", "active", throwCard)
        addButton(buttonGroup, "throw-action-cut", "Cut", "", endRound)
    }

    container.appendChild(buttonGroup)
    cardHeader.appendChild(container)
    hand.appendChild(cardHeader)

    let cardBody = newCardBody()
    drawCards(cardBody, cardsArrangedByUser.slice(0, 4), setDragAndDropMyCards)
    drawCards(cardBody, cardsArrangedByUser.slice(4), setDragAndDropMyCards)
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

const colorInGame = (card, color) => {
    getCardBodyByCard(card).style.backgroundColor = color
}

const colorInGame1 = (card) => colorInGame(card, "lightblue")
const colorInGame2 = (card) => colorInGame(card, "yellow")

const putColorInGame = () => {
    getGames(true).then((games) => {
        games.game1.forEach(colorInGame1)
        games.game2.forEach(colorInGame2)
    })
}

const drawShowCardsOfOtherPlayer = (hand, player, showDiscarded) => {

    let cardHeader = newCardHeader()
    let container = newContainer()
    container.appendChild(h(3, player.user.name))
    cardHeader.appendChild(container)
    hand.appendChild(cardHeader)

    let cardBody = newCardBody()

    let updatedPlayer = otherPlayers.find((p) => {return p.user.name === player.user.name}) || player

    drawCards(cardBody, updatedPlayer.game1, setDragAndDropOthersCards(updatedPlayer.user.name), showDiscarded, blankCardInGame1)
    drawCards(cardBody, updatedPlayer.game2, setDragAndDropOthersCards(updatedPlayer.user.name), showDiscarded, blankCardInGame2)
    hand.appendChild(cardBody)
}

const showCardsOfOtherPlayer = (player) => {
    let container = newContainer()
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()

    drawShowCardsOfOtherPlayer(cardBox, player, true)

    cardDeck.appendChild(cardBox)
    container.appendChild(cardDeck)

    gameView.appendChild(container)
}

const showMyCards = () => {
    let container = newContainer()
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()

    if(! cardsShowed()) {
        container.appendChild(h(3, "Arrange your game and click on Show cards button"))
        container.appendChild(h(5, "You can see the game of other players bellow your own hand"))
    }
    else {
        container.appendChild(h(3, "Try to discard your cards in others games"))
        container.appendChild(h(5, "You can see the game of other players bellow your own hand. When ready press the discard button"))
    }

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

const createStartRound = () => {
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()
    let cardHeader = newCardHeader()
    let title = h(4, "Round end")
    cardHeader.appendChild(title)
    cardBox.appendChild(cardHeader)
    let cardBody = newCardBody()

    let isOwner = game.owner === user.name
    let nextAction = cardsInRoundDiscarded() ? "Click the button to start the new round" : "Wait for other players to discard cards"
    let text = "The round has finished. " + (isOwner ? nextAction : "Waiting for " + game.owner + " to start the round")
    title = h(4, text)
    let container = newContainer()
    container.appendChild(title)
    if(isOwner && cardsInRoundDiscarded()) {
        let startRoundButton = newButton("Start round", startRound)
        container.appendChild(startRoundButton)
    }

    cardBody.appendChild(container)
    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)

    container = newContainer()
    container.appendChild(cardDeck)
    let section = ce("section")
    section.appendChild(container)

    gameView.appendChild(section)
}

const createGameHasFinished = () => {
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()
    let cardHeader = newCardHeader()
    let title = h(4, "Game has finished")
    cardHeader.appendChild(title)
    cardBox.appendChild(cardHeader)
    let cardBody = newCardBody()

    let text = "The game has finished go to home to start or join a new game"
    title = h(4, text)
    let container = newContainer()
    container.appendChild(title)
    let startRoundButton = newButton("Home", startApp)
    container.appendChild(startRoundButton)

    cardBody.appendChild(container)
    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)

    container = newContainer()
    container.appendChild(cardDeck)
    let section = ce("section")
    section.appendChild(container)

    gameView.appendChild(section)
}

const showScore = () => {
    let cardDeck = newCardDeck()
    let cardBox = newCardBox()
    let cardHeader = newCardHeader()
    let title = h(4, "Scores")
    cardHeader.appendChild(title)
    cardBox.appendChild(cardHeader)
    let cardBody = newCardBody()

    if(game.finished) {
        let winner = game.players.sort(sortBy("score"))[0]
        title = h(3, "The winner is " + winner.user.name)
        cardBody.appendChild(title)
    }

    game.players.forEach(player => {
        let result = ce("p")
        result.setAttribute("class", "lead text-muted")
        result.innerHTML = player.user.name + ": " + player.score;
        cardBody.appendChild(result)
    })

    cardBox.appendChild(cardBody)
    cardDeck.appendChild(cardBox)
    let container = newContainer()
    container.appendChild(cardDeck)
    let section = ce("section")
    section.appendChild(container)

    gameView.appendChild(section)
}

const currentRound = () => {
    return game.rounds[0] // list in scala are stacks so new elements are in head
}

const roundFinished = () => {
    return currentRound().finished
}

const playingRound = () => {
    return game.started && ! roundFinished()
}

const showingCards = () => {
    return roundFinished() && (! cardsShowed() || ! cardsDiscarded())
}

const waitingForRoundToStart = () => {
    return roundFinished() && cardsShowed() && cardsDiscarded()
}

const cardsShowed = () => {
    return currentRound().cardsShowed || player.cardsShowed
}

const cardsDiscarded = () => {
    return currentRound().cardsDiscarded  || player.cardsDiscarded
}

const discardingCards = () => {
    return roundFinished() && (! cardsInRoundDiscarded())
}

const cardsInRoundDiscarded = () => {
    return currentRound().cardsDiscarded
}

const createGameTableView = () => {
    createGameView()

    if(game.finished) {
        createGameHasFinished()
    }
    else if(! roundFinished()) {
        createPlayingRound()
    }
    else if(! cardsShowed() || ! cardsDiscarded()) {
        createShowingCards()
    }
    else if(cardsDiscarded()) {
        createStartRound()
    }
    else {
        debugger
        throw new Error("Y ahora que hacemo papuchi")
    }

    putColorInGame()
    showScore()

    if(! isMyTurn() || showingCards() || discardingCards()) {
        refresh()
    }
    else {
        console.log("isMyTurn() " + isMyTurn() )
        console.log("showingCards() " + showingCards() )
    }
}

const nextPlayer = () => {
    return currentRound().nextPlayer
}

const isMyTurn = () => {
    return ! currentRound().finished && nextPlayer().user.name === user.name
}

const startApp = () => {
    cancelRefresh = true
    clear()
    createMainView()
    createTopBar()
    createJoinGameView()
    createCopyArea()
}

const main = () => {
    mainView = se("main-view")
    startApp()
}

// these dummy declarations helps intellij to highlight errors
//
let dummyResponse = {game: {}}
let dummyCard = {suit: 1, number: 1}
let dummyGame = {rounds: [], players: [], onTable: [], onDeck: [], started: false, owner: {}}
let dummyRound = {nextPlayer: "", cardsShowed: false, finished: false, cardsDiscarded: false, scores: []}
let dummyPlayer = {cards: [], score: 0}
let dummyScore = {player: "", points: 0}