package com.crowsoft.chinchon

import java.time.Duration

import akka.actor.testkit.typed.scaladsl.ActorTestKit
import akka.actor.typed.scaladsl.AskPattern._
import akka.actor.typed.scaladsl.adapter._
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.model._
import akka.http.scaladsl.testkit.ScalatestRouteTest
import akka.util.Timeout
import com.crowsoft.chinchon.GameRegistry._
import com.crowsoft.chinchon.UserRegistry.{CreateUser, ActionPerformed => UserActionPerform}
import com.crowsoft.chinchon.Util.waitAll
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.concurrent.Waiters.Waiter
import org.scalatest.{Matchers, WordSpec}

import scala.concurrent.Future

class GameRoutesSpec extends WordSpec with Matchers with ScalaFutures with ScalatestRouteTest {
  lazy val testKit = ActorTestKit()
  implicit def typedSystem = testKit.system
  override def createActorSystem(): akka.actor.ActorSystem =
    testKit.system.toClassic

  val userRegistry = testKit.spawn(UserRegistry())
  val gameRegistry = testKit.spawn(GameRegistry(userRegistry))
  lazy val routes = new GameRoutes(gameRegistry).gameRoutes

  val users = List(
    User("John Doe", 102, "Chekulin"),
    User("Jean Foe", 102, "Chekulin"),
    User("Bil Murray", 102, "Chekulin"),
    User("Amy elon", 102, "Chekulin")
  )

  implicit val timeout = Timeout.create(Duration.ofSeconds(1))

  val w = new Waiter

  def createUser(user: User): Future[UserActionPerform] =
    userRegistry.ask[UserRegistry.ActionPerformed](CreateUser(user, _))

  def createGame(newGame: NewGame): Future[CreateGameResponse] =
    gameRegistry.ask(CreateGame(newGame, _))
  def getGames(): Future[Games] =
    gameRegistry.ask(GetGames)
  def getGame(name: String): Future[GetGameResponse] =
    gameRegistry.ask(GetGame(name, _))
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
  def discardCards(info: DiscardCardsInfo): Future[ActionPerformed] =
    gameRegistry.ask(DiscardCards(info, _))

  waitAll(users.map(createUser)) onComplete { case _ =>
    println("Setup complete")
    w.dismiss()
  }

  w.await()

  import JsonFormats._
  import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._

  "GameRoutes" should {
    "return no games if no present (GET /games)" in {
      // note that there's no need for the host part in the uri:
      val request = HttpRequest(uri = "/games")

      request ~> routes ~> check {
        status should ===(StatusCodes.OK)

        // we expect the response to be json:
        contentType should ===(ContentTypes.`application/json`)

        // and no entries should be in the list:
        entityAs[String] should ===("""{"games":[]}""")
      }
    }

    "be able to add games (POST /games)" in {
      val game = NewGame("John Doe")
      val gameEntity = Marshal(game).to[MessageEntity].futureValue // futureValue is from ScalaFutures

      // using the RequestBuilding DSL:
      val request = Post("/games").withEntity(gameEntity)

      request ~> routes ~> check {
        status should ===(StatusCodes.Created)

        // we expect the response to be json:
        contentType should ===(ContentTypes.`application/json`)

        // and we know what message we're expecting back:
        entityAs[String] should fullyMatch regex """\{"description":"Game (.*) created.","game":\{(.*)\},"success":true\}"""
      }
    }

    "be able to remove games (DELETE /games)" in {
      // user the RequestBuilding DSL provided by ScalatestRouteSpec:
      val gameName = createGame(NewGame("John Doe")).map(_ => getGames().map(_.games.head.name)).flatten.futureValue
      val request = Delete(uri = s"/games/$gameName")

      request ~> routes ~> check {
        status should ===(StatusCodes.OK)

        // we expect the response to be json:
        contentType should ===(ContentTypes.`application/json`)

        // and no entries should be in the list:
        entityAs[String] should fullyMatch regex """\{"description":"Game (.*) deleted.","success":true\}"""
      }
    }

    "be able to start a game (POST /games/:game/start)" in {
      val gameName = createGame(NewGame("John Doe")).map(_ => getGames()).flatten.map(_.games.head.name)
        .map(gameName => waitAll(users.map(u => joinGame(Player(u.name, gameName)))).map(_ => gameName)).flatten.futureValue

      val game = GameName(gameName)
      val gameEntity = Marshal(game).to[MessageEntity].futureValue // futureValue is from ScalaFutures

      // using the RequestBuilding DSL:
      val request = Post(s"/games/${gameName}/start").withEntity(gameEntity)

      request ~> routes ~> check {
        status should ===(StatusCodes.Accepted)

        // we expect the response to be json:
        contentType should ===(ContentTypes.`application/json`)

        // and we know what message we're expecting back:
        entityAs[String] should fullyMatch regex s"""\\{"description":"Game $gameName has started.","success":true\\}"""
      }
    }

    "be able to start a round (POST /games/:game/start_round)" in {
      val gameName = createGame(NewGame("John Doe")).map(_ => getGames()).flatten.map(_.games.head.name)
        .map(gameName => waitAll(users.map(u => joinGame(Player(u.name, gameName)))).map(_ => gameName)).flatten
        .map(gameName => startGame(GameName(gameName)).map(_ => gameName)).flatten.futureValue

      val game = GameName(gameName)
      val gameEntity = Marshal(game).to[MessageEntity].futureValue // futureValue is from ScalaFutures

      // using the RequestBuilding DSL:
      val request = Post(s"/games/${gameName}/start_round").withEntity(gameEntity)

      request ~> routes ~> check {
        status should ===(StatusCodes.Accepted)

        // we expect the response to be json:
        contentType should ===(ContentTypes.`application/json`)

        // and we know what message we're expecting back:
        entityAs[String] should fullyMatch regex s"""\\{"description":"Round in game $gameName has started.","success":true\\}"""

        getGame(gameName).foreach(g => g.maybeGame.foreach({ g=> {
          println(s"players ${g.players.size}")
          println(s"table ${g.onTable.size}")
          println(s"deck ${g.onDeck.size}")
          println(gameJsonFormat.write(g).prettyPrint)
        } }))

        Thread.sleep(2000)
      }
    }

  }
}
