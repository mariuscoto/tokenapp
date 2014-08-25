setup: package.json
	sudo add-apt-repository ppa:chris-lea/node.js -y
	sudo apt-get update
	sudo apt-get install nodejs -y
	npm config set registry http://registry.npmjs.org/
	sudo npm install
	sudo apt-get install mongodb

	mongod &
	mongo localhost/tokenapp --eval "db.users.insert({'user_name': 'admin', 'pin': 'admin'})"

run:
	@mongod &
	@echo "Server running at localhost:3000"
	@nodejs generator.js

drop:
	@mongod &
	mongo localhost/tokenapp --eval "db.dropDatabase()"
