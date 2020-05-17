package com.crowsoft.chinchon

import akka.http.scaladsl.model.{ContentType, HttpCharsets, MediaTypes}
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

object WebRoutes {

  val webRoutes: Route =
    concat(
      path("") {
        pathEndOrSingleSlash {
          getFromResource(s"web/index.html", ContentType(MediaTypes.`text/html`, () => HttpCharsets.`UTF-8`))
        }
      },
      path("api" / Segment) { file =>
        getFromResource(s"web/api/$file", ContentType(MediaTypes.`application/javascript`, () => HttpCharsets.`UTF-8`))
      },
      path("style" / Segment) { file =>
        getFromResource(s"web/styles/$file", ContentType(MediaTypes.`text/css`, () => HttpCharsets.`UTF-8`))
      })
}
