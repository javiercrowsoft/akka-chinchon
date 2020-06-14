FROM openjdk:8-jre-alpine
ADD target/scala-**/your-fat-jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
EXPOSE 8080