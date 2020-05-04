package com.crowsoft.chinchon

//#game-registry-actor
import akka.actor.typed.scaladsl.Behaviors
import akka.actor.typed.{ActorRef, Behavior}
import akka.util.Timeout

import scala.collection.immutable
import scala.util.{Failure, Random, Success}

//#game-case-classes
abstract case class CardSuit(id: Int)

object CardSuit {
  def apply(suit: Int): CardSuit = suit match  {
    case 1 => GOLD
    case 2 => SPADE
    case 3 => CUP
    case 4 => CLUB
    case 5 => JOKER
  }

}

object GOLD extends CardSuit(1)
object SPADE extends CardSuit(2)
object CUP extends CardSuit(3)
object CLUB extends CardSuit(4)
object JOKER extends CardSuit(5)
final case class Card(number: Int, suit: CardSuit)
final case class NewGame(userName: String)
final case class Player(userName: String, gameName: String)
final case class GamePlayer(user: User, cards: List[Card] = List(), game1: List[Card] = List(), game2: List[Card] = List())
final case class Play(user: User, cardTaken: Card, cardThrown: Option[Card] = None)
final case class Score(user: User, points: Int)
final case class Round(nextPlayer: GamePlayer,
                       plays: List[Play] = List(),
                       scores: List[Score] = List(),
                       finished: Boolean = false,
                       discardedCards: Boolean = false)
final case class Game(name: String,
                      players: List[GamePlayer] = List(),
                      onDeck: List[Card] = List(),
                      onTable: List[Card] = List(),
                      started: Boolean = false,
                      finished: Boolean = false,
                      rounds: List[Round] = List())
final case class Games(games: immutable.Seq[Game])
final case class GameName(name: String)
final case class RoundInfo(gameName: String)
final case class TakeCardInfo(gameName: String, playerName: String, fromDeck: Boolean)
final case class ThrowCardInfo(gameName: String, playerName: String, card: Card)
final case class EndRoundInfo(gameName: String, playerName: String, card: Card, game1: List[Card], game2: List[Card])
final case class DiscardCardList(playerName: String, game1: List[Card], game2: List[Card], discardedCards: List[Card])
final case class DiscardCardInfo(gameName: String, playerName: String, game1: List[Card], game2: List[Card], discard: List[DiscardCardList])
//#game-case-classes

object GameRegistry {

  // actor protocol
  sealed trait Command

  final case class GetGames(replyTo: ActorRef[Games]) extends Command

  final case class CreateGame(newGame: NewGame, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class GetGame(name: String, replyTo: ActorRef[GetGameResponse]) extends Command

  final case class DeleteGame(name: String, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class JoinGame(player: Player, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class StartGame(gameName: GameName, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class StartRound(round: RoundInfo, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class TakeCard(info: TakeCardInfo, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class ThrowCard(info: ThrowCardInfo, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class EndRound(info: EndRoundInfo, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class DiscardCards(info: DiscardCardInfo, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class GetGameResponse(maybeGame: Option[Game])

  final case class ActionPerformed(description: String)

  case class User4CreateGameResponse(response: UserRegistry.GetUserResponse, createGame: CreateGame) extends Command

  case class User4JoinGameResponse(response: UserRegistry.GetUserResponse, joinGame: JoinGame) extends Command

  case class UserRegistryFailure(exception: Throwable) extends Command

  def apply(userRegistry: ActorRef[UserRegistry.Command]): Behavior[Command] = Behaviors.setup[Command] { context =>

    implicit val timeout: Timeout = Timeout.create(context.system.settings.config.getDuration("my-app.internal.ask-timeout"))
    val MAX_PLAYERS_PER_GAME = context.system.settings.config.getInt("my-app.game.max-players-per-game")

    def registry(games: Set[Game]): Behavior[Command] = Behaviors.receiveMessage {
      case GetGames(replyTo) =>
        replyTo ! Games(games.toSeq)
        Behaviors.same

      case createGame: CreateGame =>
        implicit val timeout: Timeout = Timeout.create(context.system.settings.config.getDuration("my-app.internal.ask-timeout"))

        def buildUserRequest(ref: ActorRef[UserRegistry.GetUserResponse]) =
          UserRegistry.GetUser(createGame.newGame.userName, ref)

        context.ask(userRegistry, buildUserRequest) {
          case Success(response: UserRegistry.GetUserResponse) => User4CreateGameResponse(response, createGame)
          case Failure(exception) => UserRegistryFailure(exception)
        }
        Behaviors.same

      case User4CreateGameResponse(UserRegistry.GetUserResponse(Some(user)), createGame) =>
        val game = Game(newGameId, List(GamePlayer(user)))
        createGame.replyTo ! ActionPerformed(s"Game ${game.name} created.")
        registry(games + game)

      case User4CreateGameResponse(UserRegistry.GetUserResponse(None), createGame) =>
        createGame.replyTo ! ActionPerformed(s"User ${createGame.newGame.userName} doesn't exists. Game was not created.")
        Behaviors.same

      case UserRegistryFailure(exception) =>
        context.log.warn("Could not retrieve configuration", exception)
        Behaviors.unhandled

      case joinGame: JoinGame =>

        def buildUserRequest(ref: ActorRef[UserRegistry.GetUserResponse]) =
          UserRegistry.GetUser(joinGame.player.userName, ref)

        context.ask(userRegistry, buildUserRequest) {
          case Success(response: UserRegistry.GetUserResponse) => User4JoinGameResponse(response, joinGame)
          case Failure(exception) => UserRegistryFailure(exception)
        }
        Behaviors.same

      case User4JoinGameResponse(UserRegistry.GetUserResponse(Some(user)), joinGame) =>
        whenGameExists(games, joinGame.player.gameName, joinGame.replyTo) { game =>
          whenGameIsGoingToStart(game, joinGame.replyTo) {
            // check if player is not already in game
            game.players.find(_.user.name == user.name).fold[Behavior[Command]] { // add if not exists
              if (game.players.size < MAX_PLAYERS_PER_GAME) {
                joinGame.replyTo ! ActionPerformed(s"User ${user.name} was added to game ${game.name}.")
                val updatedGames = (games - game) + game.copy(players = GamePlayer(user) :: game.players)
                registry(updatedGames)
              } else {
                joinGame.replyTo ! ActionPerformed(s"The maximum players of $MAX_PLAYERS_PER_GAME has been reached for game ${game.name}.")
                Behaviors.same
              }
            } // already present
              { _ =>
                joinGame.replyTo ! ActionPerformed(s"User ${user.name} is already present in game ${game.name}.")
                Behaviors.same
              }
          }
        }

      case User4JoinGameResponse(UserRegistry.GetUserResponse(None), joinGame) =>
        joinGame.replyTo ! ActionPerformed(s"User ${joinGame.player.userName} doesn't exists. Game was not updated.")
        Behaviors.same

      case StartGame(gameName, replyTo) =>
        whenGameExists(games, gameName.name, replyTo) { game =>
          whenGameIsGoingToStart(game, replyTo) {
            if (game.players.size < 2) {
              replyTo ! ActionPerformed(s"The game ${gameName.name} only has one player. What a lonely game :(")
              Behaviors.same
            } else {
              replyTo ! ActionPerformed(s"Game ${gameName.name} was started.")
              val updatedGames = (games - game) + game.copy(started = true, onDeck = deck)
              registry(updatedGames)
            }
          }
        }

      case StartRound(info, replyTo) =>
        whenGameExists(games, info.gameName, replyTo) { game =>
          whenGameIsRunning(game, replyTo) {
            game.rounds.headOption.fold {
              // rounds is empty so create the first one
              startRound(games, game, replyTo)
            } { round =>
              ifRoundFinished(game.name, round, replyTo) {
                // previous round is finished so create the next one
                startRound(games, game, replyTo)
              }
            }
          }
        }

      case TakeCard(info, replyTo) =>
        whenGameExists(games, info.gameName, replyTo) {
          game =>
            whenGameIsRunning(game, replyTo) {
              whenRoundIsRunningAndIsPlayerTurn(game, replyTo, info.playerName, true) {
                val (card, deck, table) = {
                  if (info.fromDeck) (game.onDeck.head, game.onDeck.drop(1), game.onTable)
                  else (game.onTable.head, game.onTable.drop(1), game.onDeck)
                }
                val round = game.rounds.head
                val player = round.nextPlayer
                val updatedPlayer = player.copy(cards = card :: player.cards)
                val updatedRound = round.copy(nextPlayer = updatedPlayer,
                  plays = Play(updatedPlayer.user, card) :: round.plays)
                val updatedGame = game.copy(rounds = updatedRound :: game.rounds.tail,
                  onDeck = deck,
                  onTable = table)
                val updatedGames = (games - game) + updatedGame
                registry(updatedGames)
              }
            }
        }

      case ThrowCard(info, replyTo) =>
        whenGameExists(games, info.gameName, replyTo) {
          game =>
            whenGameIsRunning(game, replyTo) {
              whenRoundIsRunningAndIsPlayerTurn(game, replyTo, info.playerName, false) {
                val round = game.rounds.head
                val player = round.nextPlayer
                val updatedCards = player.cards.filterNot(_ == info.card)

                whenCardIsInPlayerHand(game, info.card, updatedCards, player, replyTo) {
                  val updatedPlayer = player.copy(cards = updatedCards)
                  val updatedRound = round.copy(nextPlayer = updatedPlayer,
                    plays = round.plays.head.copy(cardThrown = Some(info.card)) :: round.plays.tail)
                  updateGame(games, info.card, game, updatedRound)
                }
              }
            }
        }

      case EndRound(info, replyTo) =>
        whenGameExists(games, info.gameName, replyTo) {
          game =>
            whenGameIsRunning(game, replyTo) {
              whenRoundIsRunningAndIsPlayerTurn(game, replyTo, info.playerName, false) {
                val round = game.rounds.head
                val player = round.nextPlayer
                val updatedCards = player.cards.filterNot(_ == info.card)

                whenCardIsInPlayerHand(game, info.card, updatedCards, player, replyTo) {
                  if (!hasWinningHand(updatedCards, info)) {
                    replyTo ! ActionPerformed(s"In $game player ${player.user.name} doesn't have a winning hand.")
                    Behaviors.same
                  }
                  else {
                    val updatedPlayer = player.copy(cards = updatedCards)
                    val updatedRound = round.copy(nextPlayer = updatedPlayer,
                      plays = round.plays.head.copy(cardThrown = Some(info.card)) :: round.plays.tail,
                      scores = scores(game),
                      finished = true)
                    updateGame(games, info.card, game, updatedRound)
                  }
                }
              }
            }
        }

      case DiscardCards(info, replyTo) =>
        whenGameExists(games, info.gameName, replyTo) {
          game =>
            whenGameIsRunning(game, replyTo) {
              whenRoundIsWaitingForDiscard(game, replyTo, info.playerName) {
                withPlayer(game, info.playerName, replyTo) { player =>
                  whenDiscardDataIsValid(game, player, info, replyTo) {
                    Behaviors.same
                  }
                }
              }
            }
        }

      case GetGame(name, replyTo) =>
        replyTo ! GetGameResponse(games.find(_.name == name))
        Behaviors.same

      case DeleteGame(name, replyTo) =>
        replyTo ! ActionPerformed(s"Game $name deleted.")
        registry(games.filterNot(_.name == name))
    }

    def updateGame(games: Set[Game], card: Card, game: Game, updatedRound: Round) = {
      val updatedGame = game.copy(rounds = updatedRound :: game.rounds.tail, onTable = card :: game.onTable)
      val updatedGames = (games - game) + updatedGame
      registry(updatedGames)
    }

    def ifRoundFinished(gameName: String, round: Round, replyTo: ActorRef[ActionPerformed]
                       )(block: => Behavior[Command]): Behavior[Command] = {
      if (!round.finished) {
        replyTo ! ActionPerformed(s"Current round for game ${gameName} is not finished yet.")
        Behaviors.same
      } else {
        if (!round.discardedCards) {
          replyTo ! ActionPerformed(s"Current round for game ${gameName} is waiting for players to discard cards.")
          Behaviors.same
        } else {
          block
        }
      }
    }

    def startRound(games: Set[Game], game: Game, replyTo: ActorRef[ActionPerformed]) = {
      replyTo ! ActionPerformed(s"Round in game ${game.name} has started.")
      val (updatedPlayers, cards, onTableCard) = giveCards(game.players)
      val updatedGames = (games - game) + game.copy(
        rounds = Round(updatedPlayers.head) :: game.rounds, players = updatedPlayers, onDeck = cards, onTable = onTableCard)
      registry(updatedGames)
    }

    registry(Set.empty)
  }

  private def scores(game: Game) = {
    List()
  }

  def isValidNumber(card: Card, cards: List[Card]) = !cards.exists(_.number != card.number)

  def isValidSuit(jokers: Int, cards: List[Card]) = {
    def validateSequence(jokers: Int, cardNumber: Int, cards: List[Card]): Boolean = cards match {
      case Nil => true
      case c :: t =>
        if (cardNumber + 1 != c.number) {
          if (jokers < 1) false
          else validateSequence(jokers - 1, cardNumber + 1, cards)
        }
        else validateSequence(jokers, c.number, t)
    }

    if (cards.tail.exists(_.suit != cards.head.suit)) false
    else validateSequence(jokers, cards.head.number, cards.tail)
  }

  def isValidGame(cards: List[Card]) = {
    val jokers = cards.filter(_ == joker).size
    if (jokers > 1 && cards.size < 4) false
    else {
      val withoutJoker = cards.filterNot(_ == joker)
      isValidNumber(withoutJoker.head, withoutJoker.tail) || isValidSuit(jokers, withoutJoker.sortBy(_.number))
    }
  }

  private def invalidCards(cards: List[Card], game1: List[Card], game2: List[Card]) = {
    ((game1.count(_ == joker) + game2.count(_ == joker) > 2)
      || game1.exists(c => c != joker && game2.contains(c))
      || game1.exists(c => !cards.contains(c))
      || game2.exists(c => !cards.contains(c)))
  }

  private def hasValidGames(cards: List[Card], info: DiscardCardInfo) = {
    if (info.game1.distinct.size != info.game1.size) {
      false
    } else if (info.game2.distinct.size != info.game2.size) {
      false
    } else {
      if (invalidCards(cards, info.game1, info.game2)) {
        false
      } else {
        (info.game1.isEmpty || isValidGame(info.game1)) && (info.game2.isEmpty || isValidGame(info.game2))
      }
    }
  }

  private def hasWinningHand(cards: List[Card], info: EndRoundInfo) = {
    if (info.game1.distinct.size != info.game1.size) {
      false
    } else if (info.game2.distinct.size != info.game2.size) {
      false
    } else if (info.game1.size < 3 || info.game2.size < 3) {
      false
    } else if (info.game1.size < 6 && info.game2.size < 3) {
      false
    } else if (info.game1.size >= 6) {
      if (info.game1.exists(c => !cards.exists(_ == c))) {
        false
      } else {
        isValidGame(info.game1)
      }
    } else {
      if (invalidCards(cards, info.game1, info.game2)) {
        false
      } else {
        isValidGame(info.game1) && isValidGame(info.game2)
      }
    }
  }

  /*  this function could be used to let the computer play again a user
      if it works someone could create a game an choose to play again many bots
      there is a lonely world out there

  private def hasWinningHand(player: GamePlayer) = {
    def makeGameByNumber(card: Card, cards: List[Card], count: Int, remainingCards: List[Card]): (Boolean, List[Card]) = cards match {
      case Nil => (count > 3, remainingCards)
      case c :: t =>
        val (newCount, r) = if(card.number == c.number || c == joker) {
          (count+1, remainingCards)
        } else {
          (count, c :: remainingCards)
        }
        makeGameByNumber(card, t, newCount, r)
    }

    def sortCards(a: Card, b: Card) = (a.suit.id * 100) + a.number < ((b.suit.id * 100) + b.number)

    def makeGameBySuit(card: Card, cards: List[Card], count: Int, remainingCards: List[Card]): (Boolean, List[Card]) = cards match {
      case Nil => (count > 3, remainingCards)
      case c :: t =>
        val (newCount, r) = if((card.suit == c.suit && card.number == c.number+1) || c == joker) {
          (count+1, remainingCards)
        } else {
          (count, c :: remainingCards)
        }
        makeGameBySuit(c, t, newCount, r)
    }

    def findGames(f1: (Card, List[Card], Int, List[Card]) => (Boolean, List[Card]),
                  f2: (Card, List[Card], Int, List[Card]) => (Boolean, List[Card])
                 ) = player.cards.exists(card => {
      val (existsGame, remainingCards) = f1(card, player.cards.filterNot(_ == card), 0, List())
      if(existsGame) {
        remainingCards.exists(card => {
          f1(card, remainingCards.filterNot(_ == card) , 0, List())._1 ||
            f2(card, remainingCards.filterNot(_ == card).sortWith(sortCards) , 0, List())._1
        })
      } else false
    })

    findGames(makeGameByNumber, makeGameBySuit) || findGames(makeGameBySuit, makeGameByNumber)
  }
  */

  private def withPlayer(game: Game, playerName: String, replyTo: ActorRef[ActionPerformed]
                        )(block: GamePlayer => Behavior[Command]): Behavior[Command] = {
    game.players.find(p => p.user.name == playerName).fold[Behavior[Command]] {
      replyTo ! ActionPerformed(s"$playerName is not found in game ${game.name}.")
      Behaviors.same
    }
    { player => block(player) }
  }

  private def whenDiscardDataIsValid(game: Game, player: GamePlayer, info: DiscardCardInfo, replyTo: ActorRef[ActionPerformed]
                                    )(block: => Behavior[Command]): Behavior[Command] = {
    def invalidCards = {
      val cards = info.discard.map(_.discardedCards).flatten
      cards.exists(c => ! player.cards.contains(c)) || cards.distinct.size != cards.size // duplicated cards
    }
    if(invalidCards || ! hasValidGames(player.cards, info) || invalidDiscard(game, info)) {
      replyTo ! ActionPerformed(s"Discard cards are not valid for user ${player.user.name} in game $game.")
      Behaviors.same
    }
    else block
  }

  private def whenCardIsInPlayerHand(game: Game, card: Card, cards: List[Card], player: GamePlayer,
                                     replyTo: ActorRef[ActionPerformed]
                                    )(block: => Behavior[Command]): Behavior[Command] = {
    if(cards.size == player.cards.size) {
      replyTo ! ActionPerformed(s"In $game card ${card} is not in player's hand (${player.user.name})")
      Behaviors.same
    }
    else block
  }

  private def giveCards(players: List[GamePlayer]) = {
    def giveCards(players : List[GamePlayer],
                  newPlayers : List[GamePlayer],
                  deck: List[Card]): (List[GamePlayer], List[Card], List[Card]) = players match {
      case Nil => (newPlayers, deck.drop(1), List(deck.head))
      case p :: tail =>
        val cards = deck.take(7)
        val player = p.copy(cards = cards)
        giveCards(tail, player :: newPlayers, deck.drop(7))
    }

    giveCards(players, List(), shuffle(deck))
  }

  private def whenGameExists(games: Set[Game],
                             gameName: String,
                             replyTo: ActorRef[ActionPerformed]
                            )(block: Game => Behavior[Command]): Behavior[Command] = {
    val maybeGame = games.find(_.name == gameName)
    maybeGame.fold[Behavior[Command]]
      { // game doesn't exists
        replyTo ! ActionPerformed(s"Game ${gameName} doesn't exists.")
        Behaviors.same
      } { block }
  }

  private def whenGameIsGoingToStart(game: Game, replyTo: ActorRef[ActionPerformed]
                                    )(block: => Behavior[Command]): Behavior[Command] = {
    if(game.finished) replyTo ! ActionPerformed(s"The game ${game.name} has already finished.")
    if(game.started) replyTo ! ActionPerformed(s"The game ${game.name} has already started.")
    if(game.started || game.finished) Behaviors.same
    else block
  }

  private def whenGameIsRunning(game: Game, replyTo: ActorRef[ActionPerformed]
                               )(block: => Behavior[Command]): Behavior[Command] = {
    if(game.finished) replyTo ! ActionPerformed(s"The game ${game.name} has already finished.")
    if(! game.started) replyTo ! ActionPerformed(s"The game ${game.name} has not started yet.")
    if(! game.started || game.finished) Behaviors.same
    else block
  }

  private def whenRoundIsRunningAndIsPlayerTurn(
                                                 game: Game,
                                                 replyTo: ActorRef[ActionPerformed],
                                                 playerName: String,
                                                 takingACard: Boolean
                                               )(block: => Behavior[Command]): Behavior[Command] = {
    val roundRunning = game.rounds.headOption.exists(!_.finished)
    val action = if(takingACard) "take a card" else "throw a card"
    if(! roundRunning) {
      replyTo ! ActionPerformed(s"You need to start a round in game ${game.name} to $action.")
      Behaviors.same
    } else {
      val round = game.rounds.head
      val nextPlayer = round.nextPlayer
      if(nextPlayer.user.name != playerName) {
        replyTo ! ActionPerformed(s"Yuo are $playerName but next player to $action is ${nextPlayer.user.name}.")
        Behaviors.same
      } else {
        val invalidAction = if(takingACard) {
          // okay it is your turn but I found there is a play waiting to be completed. You need to throw a card
          // you have already take one
          ! round.plays.headOption.forall(_.cardThrown.isDefined)
        } else {
          // okay it is your turn but I don't have a record of you had taken a card. You need to take a card.
          ! round.plays.headOption.exists(_.cardThrown.isEmpty)
        }
        if(invalidAction) {
          replyTo ! ActionPerformed(s"In game ${game.name} next action is to $action to continue playing.")
          Behaviors.same
        }
        else block
      }
    }
  }

  private def whenRoundIsWaitingForDiscard(
                                           game: Game,
                                           replyTo: ActorRef[ActionPerformed],
                                           playerName: String
                                          )(block: => Behavior[Command]): Behavior[Command] = {
    val roundFinished = game.rounds.headOption.exists(_.finished)
    if(! roundFinished) {
      replyTo ! ActionPerformed(s"In game ${game.name} round is not finished yet. You can't discard cards yet.")
      Behaviors.same
    } else {
      game.players.find(p => p.user.name == playerName && ! p.cards.isEmpty).fold[Behavior[Command]] {
        replyTo ! ActionPerformed(s"$playerName doesn't have any cards to discard in game ${game.name}.")
        Behaviors.same
      }
      { _ => block }
    }
  }

  private def newGameId = Util.OneTimeCode(6)

  private def cardOf(suit: CardSuit)(number: Int) = Card(number, suit)

  private def createDeck(suit: CardSuit) = (1 to 12).map(cardOf(suit))

  val joker = cardOf(JOKER)(0)

  val deck = (
    createDeck(SPADE) ++ createDeck(CLUB) ++ createDeck(CUP) ++ createDeck(CLUB) ++ List(joker, joker)
  ).toList

  def shuffle(deck: List[Card]) = Random.shuffle(deck)

}
//#game-registry-actor
