var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var chatters = 0;
var lastNudge = 0;

app.get('/', function(req, res){
    res.sendFile('/var/www/chat/index.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(socket){
  init(io, socket);

  socket.on('chat message', function(msg){ 
  		handleMessage(io, socket, msg);
  	});
  
  socket.on('disconnect', function(){
      disconnect(io, socket);
    });

});

function init(io, socket)
{
  chatters += 1;
  if(nickTaken("MSNLover" + chatters))
  {
    socket.nickname = "MSNLover" + Math.floor((Math.random() * 100)) + chatters;
  }
  else
  {
    socket.nickname = "MSNLover" + chatters;
  }
  
  console.log('user: ' + socket.id + " connected and is called " + socket.nickname + ". IP: " + socket.handshake.address);
  socket.emit('greeting', 'Hey there, ' + socket.nickname + '. Welcome to this nostalgia trip! You can change your nick with /nick nick. Say !help at any time for more info.');
  io.emit('alert', 'chatters:' + chatters);
  console.log(chatters);
  socket.emit('alert', 'nick:' + socket.nickname);
  io.emit('greeting', socket.nickname + " has joined the chat.");
  io.emit('alert', 'newChatter:playsound');
}

function disconnect(io, socket)
{
  chatters -= 1;
  io.emit('alert', 'chatters:' + chatters);
  io.emit('greeting', socket.nickname + " has left the chat.");
  console.log(socket.nickname + ' disconnected');
}

function handleMessage(io, socket, msg)
{
      console.log("the split: " + msg.split(" ")[0]);
      var firstChar = msg.charAt(0);
      if(isCommand(firstChar))
      {
        var cmd = msg.split(" ")[0];
        switch(cmd)
        {
          case '/nick':
            var newNick = msg.split(" ")[1];
            if(newNick != undefined)
            {
              changeNick(io, socket, newNick);
            }
            break;
          case '!help':
            msg = 'Change nick with /nick nick, you can resize, move (click and drag on the blue bar) and mini/maximize window and nudge. ';
            msg += 'Press Start to reset window position. Press a display picture to change to random new one. <a href="https://github.com/OEHobby/xp-messenger-webbchat" target="_blank">Project on Git</a>';
            socket.emit('greeting', msg);
            break;
          case '!send':
            var widget = createSpotifyWidget(msg);
            if(widget != 0)
            {
              widget = socket.nickname + ": " + widget;
              io.emit('chat message', widget);
            }
            break;
          case '!nudge':
            console.log("lastNudge: " + lastNudge);
            if((new Date().getTime() - lastNudge) > 1000)
            {
              io.emit('alert', "nudge");
              lastNudge = new Date().getTime(); 
            }
            break;
          case '/msg':
            privMsg(socket, msg);
            break;
        }
      }

      else
      {
        if(msg != "" && msg != " ")
        {
          if(isLink(msg))
          {
            msg = createLink(msg);
          }
          msg = socket.nickname + ": " + msg;
          io.emit('chat message', msg);
          console.log(msg);
        }
    }
}
function isCommand(string)
{
	var cmds = ["/", "!"];
	var bool = false;
	if( cmds.indexOf(string) != -1 )
	{
		bool = true;
	}
	return bool;
}

function changeNick(io, socket, nick)
{
  var found = false;
	var clients = findClientsSocket();
	for (var i = 0; i < clients.length && !found; i++) 
	{
		console.log("searching for: " + socket.id + " found: " + clients[i].id);
		if(clients[i].id == socket.id)
		{
      found = true;
			if(!nickTaken(nick) && nick.length > 2 && nick.length < 20)
			{
            io.emit('greeting', clients[i].nickname + " is now known as: " + nick);
        		clients[i].nickname = nick;
            clients[i].emit('alert', 'nick:' + nick);
        		console.log(clients[i].id + "is now: " + clients[i].nickname);
        	}
        	else
        	{
        	console.log("nick taken");
        	}
        }
    }
}

function nickTaken(nick)
{
	var bool = false;
	var clients = findClientsSocket();
	for(var i in clients)
	{
		if(clients[i].nickname == nick)
		{
			console.log(clients[i].nickname + " is same as " + nick);
			bool = true;
		}
	}
	return bool;
}

function findClientsSocket(roomId, namespace) {
    var res = [];
    var ns = io.of(namespace ||"/");    // the default namespace is "/"

    if(ns) 
    {
        for (var i in ns.connected) 
        {
            res.push(ns.connected[i]);
        }
    }
    return res;
}

function isLink(msg)
{
  var bool = false;
  if( msg.indexOf("http://") > -1)
  {
    bool = true;
    console.log("found http://");
  }
  return bool;
}

function createLink(msg) //fix problem with the need of space after link. Fix more than one link.
{
  var linkStart;
  var link;
  var linkEnd = 0;
  linkStart = msg.indexOf("http://");
  console.log("linkstart: " + linkStart);
  console.log("found one link");
  linkEnd = msg.indexOf(" ", linkStart);
  console.log("linkend: " + linkEnd);
  link = msg.slice(linkStart, (linkEnd+1));
  console.log(link);
  msg = msg.replace(link, "<a href='" + link + "' target='_blank'>" + link + "</a>");

  return msg;
}

function createSpotifyWidget(msg)
{
  var widget = 0;
  var id = "";
  if(msg.indexOf("spotify.com/track/") > -1)
  {
    id = msg.split("spotify.com/track/")[1];
  }

  else if(msg.indexOf("spotify:track:") > -1)
  {
    id = msg.split("spotify:track:")[1];
  }

  if(id.split(" ")[0])
  {
     id = id.split(" ")[0];
  }

  console.log(id);
  if(id != "")
  {
    widget = "<iframe src='https://embed.spotify.com/?uri=spotify:track:" + id + "' width='500px' height='80px' frameborder='0' allowtransparency='true'></iframe>";
  }

  return widget;
}

function privMsg(socket, msg, namespace)
{
  var clients = findClientsSocket();
  var ns = io.of(namespace ||"/");

  var nick = msg.split(" ")[1];
  msg = msg.slice( msg.indexOf(msg.split(" ")[2]), msg.length );
  

  if(ns)
  {
    for (var i in clients)
    {
      if(clients[i].nickname == nick)
      {
        console.log(clients[i].nickname + " got a priv msg from " + socket.nickname);
        clients[i].emit('privmsg', socket.nickname + ": " + msg);
      }
    }
  }
}