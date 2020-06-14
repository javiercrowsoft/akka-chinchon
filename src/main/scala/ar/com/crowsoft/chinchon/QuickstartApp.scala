package ar.com.crowsoft.chinchon

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import akka.actor.typed.scaladsl.Behaviors
import akka.event.Logging
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.directives.DebuggingDirectives

import scala.util.Failure
import scala.util.Success

//#main-class
object QuickstartApp extends CORSHandler {
  //#start-http-server
  private def startHttpServer(routes: Route, system: ActorSystem[_]): Unit = {
    // Akka HTTP still needs a classic ActorSystem to start
    implicit val classicSystem: akka.actor.ActorSystem = system.toClassic
    import system.executionContext

    val futureBinding = Http().bindAndHandle(routes, "0.0.0.0", 8080)
    futureBinding.onComplete {
      case Success(binding) =>
        val address = binding.localAddress
        system.log.info("Server online at http://{}:{}/", address.getHostString, address.getPort)
      case Failure(ex) =>
        system.log.error("Failed to bind HTTP endpoint, terminating system", ex)
        system.terminate()
    }
  }
  //#start-http-server
  def main(args: Array[String]): Unit = {
    //#server-bootstrapping
    val rootBehavior = Behaviors.setup[Nothing] { context =>
      val userRegistryActor = context.spawn(UserRegistry(), "UserRegistryActor")
      val gameRegistryActor = context.spawn(GameRegistry(userRegistryActor), "GameRegistryActor")
      context.watch(userRegistryActor)
      context.watch(gameRegistryActor)

      val userRoutes = new UserRoutes(userRegistryActor)(context.system)
      val gameRoutes = new GameRoutes(gameRegistryActor)(context.system)

      val route = corsHandler(WebRoutes.webRoutes ~ userRoutes.userRoutes ~ gameRoutes.gameRoutes)
      val routeLogged = DebuggingDirectives.logRequestResult("Client ReST", Logging.InfoLevel)(route)

      startHttpServer(routeLogged , context.system)

      Behaviors.empty
    }
    val system = ActorSystem[Nothing](rootBehavior, "HelloAkkaHttpServer")
    //#server-bootstrapping
  }
}
//#main-class
