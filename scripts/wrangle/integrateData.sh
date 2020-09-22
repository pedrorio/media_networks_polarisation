{
	{
		# Articles
		jq -r '
		.[]? |
		{
			title: .title,
			url: .url,
			text: .text,
			date: .date
		} | 
		[
			.title,
			.url,
			.text,
			.date
		]
		| @tsv
		' $RESEARCH/media_networks_polarisation/data/composite/data.json > $RESEARCH/media_networks_polarisation/data/integrated/articles.tsv;
	}

	{	
		# Tags
		jq -r '
		.[]? | 
		.tags[]
		' $RESEARCH/media_networks_polarisation/data/composite/data.json > $RESEARCH/media_networks_polarisation/data/composite/tags.json;
		
		jq -rs '
		.? |
		unique_by(.name) |
		.[] |
		[
			.name
		] |
		@tsv
		' $RESEARCH/media_networks_polarisation/data/composite/tags.json > $RESEARCH/media_networks_polarisation/data/integrated/tags.tsv;
	}

	{
		# Authors
		jq -r '
		.[]? | 
		.authors[] 
		' $RESEARCH/media_networks_polarisation/data/composite/data.json > $RESEARCH/media_networks_polarisation/data/composite/authors.json;
		
		jq -rs '
		.? | 
		unique_by(.name) |
		.[] |
		[
			.name
		] |
		@tsv
		' $RESEARCH/media_networks_polarisation/data/composite/authors.json > $RESEARCH/media_networks_polarisation/data/integrated/authors.tsv;
	}

	{
		# Newspapers
		jq -r '
        .[]? |
        {
                newspaper: .newspapers?[]
        } |
        [
                .newspaper
        ]
        | @tsv
        ' $RESEARCH/media_networks_polarisation/data/composite/data.json > $RESEARCH/media_networks_polarisation/data/integrated/newspapers.tsv;
	}

	{
		# Tagged
		jq -r '
        .[]? |
        {
                article: .title,
                tag: .tags?[].name
        } |
        [
                .article,
                .tag
        ]
        | @tsv
        ' $RESEARCH/media_networks_polarisation/data/composite/data.json > $RESEARCH/media_networks_polarisation/data/integrated/tagged.tsv;
	}

	{
		# Wrote
		jq -r '
        .[]? |
        {
                article: .title,
                author: .authors?[].name
        } |
        [
                .article,
                .author
        ]
        | @tsv
        ' $RESEARCH/media_networks_polarisation/data/composite/data.json > $RESEARCH/media_networks_polarisation/data/integrated/wrote.tsv;
	}

	{
		# Published
		jq -r '
        .[]? |
        {
                article: .title,
                newspaper: .newspapers?[]
        } |
        [
                .article,
                .newspaper
        ]
        | @tsv
        ' $RESEARCH/media_networks_polarisation/data/composite/data.json > $RESEARCH/media_networks_polarisation/data/integrated/published.tsv;
	}
}