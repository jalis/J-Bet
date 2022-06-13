import { useState, useEffect } from 'react';
import axios from 'axios';

import { GuildItem } from './GuildItem';

// Fetches guilds from API and lists them, adding buttons for some interactions

export const GuildList = (props) => {
	const [guilds, setGuilds] = useState([]);

	useEffect(() => {
		axios.get(`/api/user_guilds?type=${props.type}`, { withCredentials: true }).then((res) => {
			setGuilds(res.data);
		});
	}, []);

	return (
		<ul className="guild-list">
			<h2>Guilds:</h2>
			{guilds.map((guild) => (
				<li className="guild-item">
					<GuildItem guild={guild}></GuildItem>
					{props.type == 'managed' && props.onClick && (
						<button onClick={(e) => props.onClick(e, guild)}>Open Guild</button>
					)}
				</li>
			))}
		</ul>
	);
};
