package com.crowsoft.chinchon

//#game-registry-actor
import akka.actor.typed.{ActorRef, Behavior}
import akka.actor.typed.scaladsl.Behaviors
import akka.util.Timeout

import scala.concurrent.duration._
import scala.collection.immutable
import scala.util.{Failure, Success}

//#game-case-classes
abstract case class CardSuit(suit: Int)

object CardSuit {
  def apply(suit: Int): CardSuit = suit match  {
    case 1 => GOLD
    case 2 => SPADE
    case 3 => CUP
    case 4 => CLUB
  }

}

object GOLD extends CardSuit(1)
object SPADE extends CardSuit(2)
object CUP extends CardSuit(3)
object CLUB extends CardSuit(4)
final case class Card(number: Int, suit: CardSuit)
final case class NewGame(userName: String)
final case class Player(userName: String, gameName: String)
final case class Game(name: String, players: List[User] = List(), onDeck: List[Card] = List(), onTable: List[Card] = List())
final case class Games(games: immutable.Seq[Game])
//#game-case-classes

object GameRegistry {
  // actor protocol
  sealed trait Command
  final case class GetGames(replyTo: ActorRef[Games]) extends Command
  final case class CreateGame(newGame: NewGame, replyTo: ActorRef[ActionPerformed]) extends Command
  final case class GetGame(name: String, replyTo: ActorRef[GetGameResponse]) extends Command
  final case class DeleteGame(name: String, replyTo: ActorRef[ActionPerformed]) extends Command
  final case class JoinGame(player: Player, replyTo: ActorRef[ActionPerformed]) extends Command

  final case class GetGameResponse(maybeGame: Option[Game])
  final case class ActionPerformed(description: String)

  case class User4CreateGameResponse(response: UserRegistry.GetUserResponse, createGame: CreateGame) extends Command
  case class User4JoinGameResponse(response: UserRegistry.GetUserResponse, joinGame: JoinGame) extends Command
  case class UserRegistryFailure(exception: Throwable) extends Command

  def apply(userRegistry: ActorRef[UserRegistry.Command]): Behavior[Command] = Behaviors.setup[Command] { context =>

    implicit val timeout: Timeout = Timeout.create(context.system.settings.config.getDuration("my-app.internal.ask-timeout"))

    def registry(games: Set[Game]): Behavior[Command] =
    Behaviors.receiveMessage {
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
        val game = Game(newGameId, List(user))
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
        val maybeGame = games.find(_.name == joinGame.player.gameName)
        maybeGame.fold[Behavior[Command]]
        { // game doesn't exists
          joinGame.replyTo ! ActionPerformed(s"Game ${joinGame.player.gameName} doesn't exists.")
          Behaviors.same
        } { game =>
          // check if player is not already in game
          game.players.find(_.name == user.name).fold[Behavior[Command]]
          { // add if not exists
            joinGame.replyTo ! ActionPerformed(s"User ${user.name} was added to game ${game.name}.")
            val updatedGame = (games - game) + Game(game.name, game.players.appended(user), game.onDeck, game.onTable)
            registry(updatedGame)
          } // already present
          { _ =>
            joinGame.replyTo ! ActionPerformed(s"User ${user.name} is already present in game ${game.name}.")
            Behaviors.same
          }
        }

      case User4JoinGameResponse(UserRegistry.GetUserResponse(None), joinGame) =>
        joinGame.replyTo ! ActionPerformed(s"User ${joinGame.player.userName} doesn't exists. Game was not created.")
        Behaviors.same

      case GetGame(name, replyTo) =>
        replyTo ! GetGameResponse(games.find(_.name == name))
        Behaviors.same

      case DeleteGame(name, replyTo) =>
        replyTo ! ActionPerformed(s"Game $name deleted.")
        registry(games.filterNot(_.name == name))
    }

    registry(Set.empty)
  }

  private def newGameId = Util.OneTimeCode(6)

}
//#game-registry-actor
