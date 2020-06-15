Chinchonazo

An implementation of Chinchon Game in Akka, Akka Http, Vanilla JavaScript and Bootstrap 4.

[![video](https://raw.githubusercontent.com/javiercrowsoft/akka-chinchon/master/videos/youtube01.png)](https://www.youtube.com/watch?v=SIM6cu9_dtw)

[https://www.youtube.com/watch?v=SIM6cu9_dtw](https://www.youtube.com/watch?v=SIM6cu9_dtw)


# Run
```
sbt run
```

Browse http://localhost:8080/

# Backend Commands

## User

### create
```
curl -XPOST 'localhost:8080/users' -d '{"name": "John Doe", "age": 110, "countryOfResidence": "Arisa" }' --header 'Content-Type:application/json'
curl -XPOST 'localhost:8080/users' -d '{"name": "Jean Foe", "age": 220, "countryOfResidence": "Ursiku" }' --header 'Content-Type:application/json'
```

### list
```
curl 'localhost:8080/users' | json_pp
curl 'localhost:8080/users/Jean%20Foe' | json_pp
```

### delete
```
curl -XDELETE 'localhost:8080/users/john%20doe'
```

## Game

### create
```
curl -XPOST 'localhost:8080/games' -d '{"userName":"John Doe"}' --header 'Content-Type:application/json'
```

### join a game
```
curl -XPOST 'localhost:8080/games/:game_name/players' -d '{"userName":"Jean Foe", "gameName": ":game_name"}' --header 'Content-Type:application/json'
curl -XPOST 'localhost:8080/games/dFfyId/players' -d '{"userName":"Jean Foe", "gameName": "dFfyId"}' --header 'Content-Type:application/json'
```

### list
```
curl 'localhost:8080/games' | json_pp
curl 'localhost:8080/games/:game_name' | json_pp
curl 'localhost:8080/games/dFfyId' | json_pp
```
### delete
```
curl -XDELETE 'localhost:8080/games/:game_name'
```

### complete sequence
```
curl -XPOST 'localhost:8080/users' -d '{"name": "John Doe", "age": 110, "countryOfResidence": "Arisa" }' --header 'Content-Type:application/json'
curl -XPOST 'localhost:8080/games' -d '{"userName":"John Doe"}' --header 'Content-Type:application/json'
curl -XPOST 'localhost:8080/users' -d '{"name": "Jean Foe", "age": 87, "countryOfResidence": "Kuratia" }' --header 'Content-Type:application/json'
curl 'localhost:8080/games' | json_pp
curl -XPOST 'localhost:8080/games//players' -d '{"userName":"Jean Foe", "gameName": ""}' --header 'Content-Type:application/json'
```

### Expose local server to other computers in local network
```
ssh -R 80:localhost:8080 ssh.localhost.run
```
### Build
```
sbt assembly
```
### Run
```
scala target/scala-2.13/akka-chinchon-assembly-0.1.0-SNAPSHOT.jar
```
### Docker

#### To create a docker image
```
sbt docker:publishLocal
```
#### To start container
```
docker run --publish 8080:8080 --detach --name chinchon akka-chinchon:0.1.0-SNAPSHOT 
```
#### To stop
```
docker rm --force chinchon
```
#### To publish in Docker Hub
```
docker login --username=javier2018

docker tag {{IMAGE_ID}} javier2018/akkachinchon:{{semantic version}}

docker push {{tag you just created}}
```
#### To deploy in AWS
```
ssh_cairo_amazon

docker run --publish 8080:8080 --detach --name chinchon javier2018/akkachinchon:0.1.0
```
### To see code
```
cat `find . \( -name '*.scala' -o -name '*.js' -o -name '*.java' \) -print` | perl -pe "system 'sleep .003'"
```

(*) este readme parece escrito por el profesor Jirafales pero en TO TO TO TO !!! 
