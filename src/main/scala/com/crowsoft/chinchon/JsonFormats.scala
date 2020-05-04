package com.crowsoft.chinchon

import com.crowsoft.chinchon.UserRegistry.ActionPerformed
import spray.json.{JsArray, JsNumber, JsObject, JsString, JsValue, JsonFormat}

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

  implicit val newGameJsonFormat = jsonFormat1(NewGame)
  implicit val playerJsonFormat = jsonFormat2(Player)
  implicit val playJsonFormat = jsonFormat3(Play)
  implicit val scoreJsonFormat = jsonFormat2(Score)
  implicit val gamePlayerJsonFormat = jsonFormat4(GamePlayer)
  implicit val roundJsonFormat = jsonFormat5(Round)
  implicit val gameJsonFormat = jsonFormat7(Game)
  implicit val gamesJsonFormat = jsonFormat1(Games)

  implicit val startGameJsonFormat = jsonFormat1(GameName)
  implicit val startRoundJsonFormat = jsonFormat1(RoundInfo)
  implicit val takeCardJsonFormat = jsonFormat3(TakeCardInfo)
  implicit val throwCardJsonFormat = jsonFormat3(ThrowCardInfo)
  implicit val endRoundJsonFormat = jsonFormat5(EndRoundInfo)
  implicit val discardCardGameJsonFormat = jsonFormat4(DiscardCardList)
  implicit val discardCardInfoJsonFormat = jsonFormat5(DiscardCardInfo)

  implicit val userActionPerformedJsonFormat = jsonFormat1(UserRegistry.ActionPerformed)
  implicit val gameActionPerformedJsonFormat = jsonFormat1(GameRegistry.ActionPerformed)
}
//#json-formats
