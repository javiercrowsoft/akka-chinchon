lazy val akkaHttpVersion = "10.1.11"
lazy val akkaVersion    = "2.6.5"

lazy val root = (project in file(".")).
  settings(
    inThisBuild(List(
      organization    := "ar.com.crowsoft",
      scalaVersion    := "2.13.1"
    )),
    name := "akka-chinchon",
    libraryDependencies ++= Seq(
      "com.typesafe.akka" %% "akka-http"                % akkaHttpVersion,
      "com.typesafe.akka" %% "akka-http-spray-json"     % akkaHttpVersion,
      "com.typesafe.akka" %% "akka-actor-typed"         % akkaVersion,
      "com.typesafe.akka" %% "akka-stream"              % akkaVersion,
      "ch.qos.logback"    % "logback-classic"           % "1.2.3",

      "com.typesafe.akka" %% "akka-http-testkit"        % akkaHttpVersion % Test,
      "com.typesafe.akka" %% "akka-actor-testkit-typed" % akkaVersion     % Test,
      "org.scalatest"     %% "scalatest"                % "3.0.8"         % Test
    )
  )

mainClass in Compile := Some("ar.com.crowsoft.chinchon.QuickstartApp")
enablePlugins(JavaAppPackaging)
enablePlugins(DockerPlugin)