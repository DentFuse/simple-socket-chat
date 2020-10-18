const io = require('socket.io')();
const randomatic = require('randomatic');

const rooms = new Map;

io.on('connection', (socket) => {
	console.log('a user connected');
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});

	socket.on('message', (data) => {
		const token = data.token;
		const username = data.username;
		if(!rooms.has(token)) {
			// Room does not exist
			// This can't possiblly happen in a correct application, i dont think someone will try to reverse engineer this but idc.
			return socket.disconnect();
		}
		const arr = rooms.get(token);
		if(arr.indexOf(username) == -1) return socket.disconnect();
		io.to(token).emit('message', { username: data.username, message: data.message });
	});

	socket.on('joinRoom', data => {
		const token = data.token;
		const username = data.username;
		if(!rooms.has(token)) {
			// Room does not exist
			return socket.emit('invalidRoom');
		}
		const arr = rooms.get(token);
		arr.push(username);
		rooms.set(token, arr)
		socket.join(token, () => {
			io.to(token).emit('userJoined', username);
			socket.emit('roomToken', token);
		});
	});

	socket.on('requestRoom', (username) => {
		const token = randomatic('A', 4);
		rooms.set(token, [username]);
		socket.join(token, () => {
			io.to(token).emit('userJoined', username);
			socket.emit('roomToken', token);
		});
	});
});

io.attach(8080);

console.log('hi')
