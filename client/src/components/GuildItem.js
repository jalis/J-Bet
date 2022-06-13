// List item component for showing guilds
export const GuildItem = (props) => {
	return (
		<div className="guild">
			<div className="guild-icon-wrapper">
				{props.guild.icon && (
					<img
						className="guild-icon"
						src={`https://cdn.discordapp.com/icons/${props.guild.id}/${props.guild.icon}.png`}
					></img>
				)}
			</div>
			<span className="guild-name">{props.guild.name}</span>
		</div>
	);
};
