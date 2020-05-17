package com.crowsoft.chinchon

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Random, Success}

object Util {

  object OneTimeCode {
    def apply(length: Int = 6) = {
      Random.alphanumeric.take(length).mkString("")
    }
  }

  def waitAll[T](futures: Seq[Future[T]])(implicit ex: ExecutionContext) =
    Future.sequence(futures)

}
