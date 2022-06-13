import { useState } from 'react';

import logo from './logo.svg';
import './App.css';
import { GuildList } from './components/GuildList';
import { BetList } from './components/BetList';

function App() {
	const [guild, setGuild] = useState({});
	const [bet, setBet] = useState({});

	// Use window.location.hash for navigating the app
	if (window.location.hash.startsWith('#')) {
		const args = window.location.hash.substring(1).split('&');
		for (const arg of args) {
			const [key, value] = arg.split('=');

			if (key == 'guild') {
				guild.id = value;
			}
			if (key == 'bet') {
				bet.id = value;
			}
		}
	}

	// Opens specified guild in guild view by updating state
	const openGuild = (e, guild) => {
		console.log(guild);
		window.location.hash = `#guild=${guild.id}`;
		setGuild(guild);
	};

	// Open guild, bet or dashboard depending on app state

	// TODO: Single bet has highest prio, add it here
	if (guild.id) {
		return (
			<div className="App">
				<div className="Bets">
					<BetList></BetList>
				</div>
			</div>
		);
	} else {
		return (
			<div className="App">
				<div className="ManagedGuilds">
					<GuildList type="managed" onClick={openGuild}></GuildList>
				</div>
			</div>
		);
	}
}

export default App;
