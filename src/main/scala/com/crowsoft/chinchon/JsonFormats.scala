package com.crowsoft.chinchon

import com.crowsoft.chinchon.GameRegistry.CreateGameResponse
import spray.json.{JsNumber, JsValue, JsonFormat}

//#json-formats
import spray.json.DefaultJsonProtocol

object JsonFormats  {
  // import the default encoders for primitive types (Int, String, Lists etc)
  import DefaultJsonProtocol._

  implicit object cardSuitJsonFormat extends JsonFormat[CardSuit] {
    def write(c: CardSuit) = JsNumber(c.id)
    def read(value: JsValue) = CardSuit(value.convertTo[Int])
  }

  implicit val userJsonFormat = jsonFormat3(User)
  implicit val usersJsonFormat = jsonFormat1(Users)

  implicit val cardJsonFormat = jsonFormat2(Card)

  implicit val playerJsonFormat = jsonFormat2(Player)
  implicit val playJsonFormat = jsonFormat3(Play)
  implicit val gamePlayerJsonFormat = jsonFormat9(GamePlayer)
  implicit val scoreJsonFormat = jsonFormat2(Score)
  implicit val roundJsonFormat = jsonFormat6(Round)
  implicit val gameJsonFormat = jsonFormat8(Game)
  implicit val gamesJsonFormat = jsonFormat1(Games)

  implicit val newGameJsonFormat = jsonFormat1(NewGame)
  implicit val createGameJsonFormat = jsonFormat2(CreateGameResponse)

  implicit val startGameJsonFormat = jsonFormat1(GameName)
  implicit val takeCardJsonFormat = jsonFormat3(TakeCardInfo)
  implicit val throwCardJsonFormat = jsonFormat3(ThrowCardInfo)
  implicit val endRoundJsonFormat = jsonFormat5(EndRoundInfo)
  implicit val showCardsJsonFormat = jsonFormat4(ShowCardsInfo)
  implicit val discardCardGameJsonFormat = jsonFormat4(DiscardedCards)
  implicit val discardCardInfoJsonFormat = jsonFormat3(DiscardCardsInfo)

  implicit val userActionPerformedJsonFormat = jsonFormat1(UserRegistry.ActionPerformed)
  implicit val gameActionPerformedJsonFormat = jsonFormat2(GameRegistry.ActionPerformed)
}
//#json-formats
