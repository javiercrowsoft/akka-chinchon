package com.crowsoft.chinchon

import com.crowsoft.chinchon.UserRegistry.ActionPerformed
import spray.json.{JsArray, JsNumber, JsObject, JsString, JsValue, JsonFormat}

//#json-formats
import spray.json.DefaultJsonProtocol

object JsonFormats  {
  // import the default encoders for primitive types (Int, String, Lists etc)
  import DefaultJsonProtocol._

  implicit object cardSuitJsonFormat extends JsonFormat[CardSuit] {
    def write(c: CardSuit) = JsNumber(c.suit)
    def read(value: JsValue) = CardSuit(value.convertTo[Int])
  }

  implicit val userJsonFormat = jsonFormat3(User)
  implicit val usersJsonFormat = jsonFormat1(Users)

  implicit val cardJsonFormat = jsonFormat2(Card)

  implicit val newGameJsonFormat = jsonFormat1(NewGame)
  implicit val playerJsonFormat = jsonFormat2(Player)
  implicit val gameJsonFormat = jsonFormat4(Game)
  implicit val gamesJsonFormat = jsonFormat1(Games)

  implicit val userActionPerformedJsonFormat = jsonFormat1(UserRegistry.ActionPerformed)
  implicit val gameActionPerformedJsonFormat = jsonFormat1(GameRegistry.ActionPerformed)
}
//#json-formats
