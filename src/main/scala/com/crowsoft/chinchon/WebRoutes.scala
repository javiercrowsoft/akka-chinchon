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
      path("styles" / Segment) { file =>
        getFromResource(s"web/styles/$file", ContentType(MediaTypes.`text/css`, () => HttpCharsets.`UTF-8`))
      },
      path("images" / Segment) { file =>
        getFromResource(s"web/images/$file", ContentType(MediaTypes.`image/png`, () => HttpCharsets.`UTF-8`))
      },
      path("favicon.ico") {
        getFromResource("web/images/favico/favicon.ico", ContentType(MediaTypes.`image/x-icon`, () => HttpCharsets.`UTF-8`)) // will look for the file inside your `resources` folder
      }
    )
}
