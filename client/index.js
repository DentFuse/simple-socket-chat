const socket = require('socket.io-client')('http://localhost:8080');
const enquirer = require('enquirer');

socket.on('connect', async () => {
	console.log(socket.connected); // true
	await sleep(1000);
	preMain(socket);
});

async function preMain(socket) {
	const name = (await enquirer.prompt({ name: 'name', message: 'Please enter your username', type: 'input' })).name;
	const state = new State(socket, name);
	main(state);
}

async function main(state) {
	let choice;
	if(!state.invalidtoken) {
		choice = await enquirer.select({ name: 'choice', message: 'Please select an option', choices: ['Make New Room', 'Join Existing Room']});
	}
	if(choice === 'Make New Room') {
		await state.makeRoom();
		console.log('Room made, token:', state.token);
	} else if (choice === 'Join Existing Room' || state.invalidtoken) {
		const token = (await enquirer.prompt({ name: 'token', message: 'Please enter room token', type: 'input' })).token;
		console.log('Joining room:', token);
		await state.joinRoom(token);
		console.log('Successfully joined room:', state.socket);
	}
	messageLoop(state);
}

async function messageLoop(state) {
	const message = (await enquirer.prompt({ name: 'message', message: 'Message:', type: 'input' })).message;
	await state.sendMessage(message);
	messageLoop(state);
}

class State {
	constructor(socket, username) {
		this.socket = socket;
		this.username = username;
		socket.on('userJoined', (user) => console.log(`${user} joined the room!`));
		socket.on('invalidRoom', () => {
			console.log('Invalid room token');
			this.invalidtoken = true;
			main(this);
		});
		socket.on('message', data => {
			console.log(data.username, data.message);
		});
	}

	static invalidtoken = this.invalidtoken;
	static socket = this.socket;
	static username = this.username;

	sendMessage(message) {
		return new Promise(resolve => {
			socket.emit('message', { token: this.token, username: this.username, message});
			// console.log(this.username, message);
			resolve();
		});
	}

	makeRoom() {
		return new Promise((resolve) => {
			socket.emit('requestRoom', this.username);
			socket.once('roomToken', (token) => {
				this.invalidtoken = false;
				this.token = token;
				return resolve(token);
			});
		})
	}

	joinRoom(token) {
		return new Promise((resolve) => {
			this.socket.emit('joinRoom', {token, username: this.username});
			socket.once('roomToken', (token) => {
				this.token = token;
				resolve();
			});
		});
	}
}

const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));