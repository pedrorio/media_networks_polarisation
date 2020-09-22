jq -r '
unique_by(.id) | 
unique_by(.fullTitle) | 
.[] |
 {
	# article_id: ("OBS" + (.id | tostring)),
	title: .fullTitle,
	url: .links.webUri,
	text: (.body | @text),
	date: (.pubDate // ""),
	tags: (
		.metadata | 
		(

			[
				.topics? | unique_by(.id)[] |
				{
					# tag_id:  ("OBS" + (.id | tostring)),
					name:  (.name | @text)
				} |
				select(
					((.name | length) > 0)
				)
			]
		)
	),
	
	authors: (
		.metadata |
		(
			[
				.authors? | unique_by(.id)[] |
				{
					# author_id:  ("OBS" + (.id | tostring)),
					name:  (.name | @text),
					creditType: [
						.creditType?[] | select(
							(.  == "text")
						)
					]
				} |
				select(
					((.name | length) > 0)
					and
					((.creditType | length) > 0)
				) |
				{
	 				# author_id:  .author_id,
	 				name:  .name
	 			}
			]
		)
	),
	newspapers: [
		"Observador"
	]
} |
select(
	((.text | length) > 0)
	and
	((.date | length) > 0)
	and
	((.authors | length) > 0)
	and
	((.tags | length) > 0)
)
' $RESEARCH/media_networks_polarisation/data/raw/observador.json > $RESEARCH/media_networks_polarisation/data/clean/observador.json
sed 's/<[^>]*>//g ; /^$/d' $RESEARCH/media_networks_polarisation/data/clean/observador.json > $RESEARCH/media_networks_polarisation/data/clean/observador.json