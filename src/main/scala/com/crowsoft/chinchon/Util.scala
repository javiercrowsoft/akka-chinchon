package com.crowsoft.chinchon

import scala.util.Random

object Util {

  object OneTimeCode {
    def apply(length: Int = 6) = {
      Random.alphanumeric.take(length).mkString("")
    }
  }
}
