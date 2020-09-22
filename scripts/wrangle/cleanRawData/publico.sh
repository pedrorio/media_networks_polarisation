jq -r '
unique_by(.id) | 
unique_by(.titulo) |
.[] |
{
	article_id: ("PUB" + (.id | tostring)),
	url: .url,
	title: .titulo,
	text: .texto,
	date: .data,
	tags: (
	 		[
	 			.tags?[] |
	 			{
	 				tag_id:  ("PUB" + (.id | tostring)),
	 				name:  (.nome | @text)
	 			} |
	 			select(
	 				((.name | length) > 0)
	 			)
	 		]
	 	),
	authors:  (
 		[
 			.autores?[] |
 			{
 				author_id:  ("PUB" + (.id | tostring)),
 				name:  (.nome | @text),
 				creditType: .contribuicao
 			} |
 			select(
 				((.name | length) > 0)
  				and
 				((.creditType | length) > 0)
  				and
 				(
	 				(.creditType | contains("texto"))
	 				or
	 				(.creditType | contains("Texto"))
 				)
 			) |
 			{
 				author_id: .author_id,
 				name: .name
 			}
 		]
 	),
 	newspapers: [
		"Público"
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
' $RESEARCH/media_networks_polarisation/data/raw/publico.json > $RESEARCH/media_networks_polarisation/data/clean/publico.json
sed 's/<[^>]*>//g ; /^$/d' $RESEARCH/media_networks_polarisation/data/clean/publico.json > $RESEARCH/media_networks_polarisation/data/clean/publico.json