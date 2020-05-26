# Run

sbt run

# Commands

## User

### create
curl -XPOST 'localhost:8080/users' -d '{"name": "John Doe", "age": 110, "countryOfResidence": "Arisa" }' --header 'Content-Type:application/json'
curl -XPOST 'localhost:8080/users' -d '{"name": "Jean Foe", "age": 220, "countryOfResidence": "Ursiku" }' --header 'Content-Type:application/json'

### list
curl 'localhost:8080/users' | json_pp
curl 'localhost:8080/users/Jean%20Foe' | json_pp

### delete
curl -XDELETE 'localhost:8080/users/john%20doe'

## Game

### create
curl -XPOST 'localhost:8080/games' -d '{"userName":"John Doe"}' --header 'Content-Type:application/json'

### join a game
curl -XPOST 'localhost:8080/games/:game_name/players' -d '{"userName":"Jean Foe", "gameName": ":game_name"}' --header 'Content-Type:application/json'
curl -XPOST 'localhost:8080/games/dFfyId/players' -d '{"userName":"Jean Foe", "gameName": "dFfyId"}' --header 'Content-Type:application/json'

### list
curl 'localhost:8080/games' | json_pp
curl 'localhost:8080/games/:game_name' | json_pp
curl 'localhost:8080/games/dFfyId' | json_pp

### delete
curl -XDELETE 'localhost:8080/games/:game_name'

### complete sequence
curl -XPOST 'localhost:8080/users' -d '{"name": "John Doe", "age": 110, "countryOfResidence": "Arisa" }' --header 'Content-Type:application/json'
curl -XPOST 'localhost:8080/games' -d '{"userName":"John Doe"}' --header 'Content-Type:application/json'
curl -XPOST 'localhost:8080/users' -d '{"name": "Jean Foe", "age": 87, "countryOfResidence": "Kuratia" }' --header 'Content-Type:application/json'
curl 'localhost:8080/games' | json_pp
curl -XPOST 'localhost:8080/games//players' -d '{"userName":"Jean Foe", "gameName": ""}' --header 'Content-Type:application/json'

### Expose local server to other computers in local network
ssh -R 80:localhost:8080 ssh.localhost.run