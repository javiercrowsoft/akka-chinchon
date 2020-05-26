package com.crowsoft.chinchon

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Route

import scala.concurrent.Future
import com.crowsoft.chinchon.GameRegistry._
import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout

//#import-json-formats
//#game-routes-class
class GameRoutes(gameRegistry: ActorRef[GameRegistry.Command])(implicit val system: ActorSystem[_]) {

  //#game-routes-class
  import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
  import JsonFormats._
  //#import-json-formats

  // If ask takes more time than this to complete the request is failed
  private implicit val timeout = Timeout.create(system.settings.config.getDuration("my-app.routes.ask-timeout"))

  def getGames(): Future[Games] =
    gameRegistry.ask(GetGames)
  def getGame(name: String): Future[GetGameResponse] =
    gameRegistry.ask(GetGame(name, _))
  def createGame(newGame: NewGame): Future[CreateGameResponse] =
    gameRegistry.ask(CreateGame(newGame, _))
  def deleteGame(name: String): Future[ActionPerformed] =
    gameRegistry.ask(DeleteGame(name, _))
  def joinGame(player: Player): Future[ActionPerformed] =
    gameRegistry.ask(JoinGame(player, _))
  def startGame(gameName: GameName): Future[ActionPerformed] =
    gameRegistry.ask(StartGame(gameName, _))
  def startRound(round: GameName): Future[ActionPerformed] =
    gameRegistry.ask(StartRound(round, _))
  def takeCard(info: TakeCardInfo): Future[ActionPerformed] =
    gameRegistry.ask(TakeCard(info, _))
  def throwCard(info: ThrowCardInfo): Future[ActionPerformed] =
    gameRegistry.ask(ThrowCard(info, _))
  def endRound(info: EndRoundInfo): Future[ActionPerformed] =
    gameRegistry.ask(EndRound(info, _))
  def showCards(info: ShowCardsInfo): Future[ActionPerformed] =
    gameRegistry.ask(ShowCards(info, _))
  def discardCards(info: DiscardCardsInfo): Future[ActionPerformed] =
    gameRegistry.ask(DiscardCards(info, _))

  //#all-routes
  //#games-get-post
  //#games-get-delete
  val gameRoutes: Route =
  pathPrefix("games") {
    concat(
      //#games-get-post
      pathEnd {
        concat(
          get {
            complete(getGames())
          },
          post {
            entity(as[NewGame]) { newGame =>
              onSuccess(createGame(newGame)) { performed =>
                complete((StatusCodes.Created, performed))
              }
            }
          })
      },
      path(Segment / "players") { name =>
        concat(
          post {
            entity(as[Player]) { player =>
              onSuccess(joinGame(player)) { performed =>
                complete((StatusCodes.Created, performed))
              }
            }
          })
      },
      path(Segment / "start") { name =>
        concat(
          post {
            entity(as[GameName]) { gameName =>
              onSuccess(startGame(gameName)) { performed =>
                complete((StatusCodes.Accepted, performed))
              }
            }
          })
      },
      path(Segment / "start_round") { name =>
        concat(
          post {
            entity(as[GameName]) { round =>
              onSuccess(startRound(round)) { performed =>
                complete((StatusCodes.Accepted, performed))
              }
            }
          })
      },
      path(Segment / "take_card") { name =>
        concat(
          post {
            entity(as[TakeCardInfo]) { info =>
              onSuccess(takeCard(info)) { performed =>
                complete((StatusCodes.Accepted, performed))
              }
            }
          })
      },
      path(Segment / "throw_card") { name =>
        concat(
          post {
            entity(as[ThrowCardInfo]) { info =>
              onSuccess(throwCard(info)) { performed =>
                complete((StatusCodes.Accepted, performed))
              }
            }
          })
      },
      path(Segment / "end_round") { name =>
        concat(
          post {
            entity(as[EndRoundInfo]) { info =>
              onSuccess(endRound(info)) { performed =>
                complete((StatusCodes.Accepted, performed))
              }
            }
          })
      },
      path(Segment / "show_cards") { name =>
        concat(
          post {
            entity(as[ShowCardsInfo]) { info =>
              onSuccess(showCards(info)) { performed =>
                complete((StatusCodes.Accepted, performed))
              }
            }
          })
      },
      path(Segment / "discard_cards") { name =>
        concat(
          post {
            entity(as[DiscardCardsInfo]) { info =>
              onSuccess(discardCards(info)) { performed =>
                complete((StatusCodes.Accepted, performed))
              }
            }
          })
      },
      //#games-get-post
      //#games-get-delete
      path(Segment) { name =>
        concat(
          get {
            //#retrieve-game-info
            rejectEmptyResponse {
              onSuccess(getGame(name)) { response =>
                complete(response.maybeGame)
              }
            }
            //#retrieve-game-info
          },
          delete {
            //#games-delete-logic
            onSuccess(deleteGame(name)) { performed =>
              complete((StatusCodes.OK, performed))
            }
            //#games-delete-logic
          })
      })
    //#games-get-delete
  }
  //#all-routes
}
