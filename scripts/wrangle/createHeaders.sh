# Articles
(
    echo '[
            "title",
            "url",
            "text",
            "date"
    ]' | 
    jq -r '
        . | 
        @tsv
    ' > $RESEARCH/media_networks_polarisation/data/headers/articles.tsv
)

# Tags
(
    echo '[
            "name"
    ]' | 
    jq -r '
        . | 
        @tsv
    ' > $RESEARCH/media_networks_polarisation/data/headers/tags.tsv
)

# Authors
(
    echo '[
            "name"
    ]' | 
    jq -r '
        . | 
        @tsv
    ' > $RESEARCH/media_networks_polarisation/data/headers/authors.tsv
)

# Newspapers
(
    echo '[
            "name"
    ]' | 
    jq -r '
        . | 
        @tsv
    ' > $RESEARCH/media_networks_polarisation/data/headers/newspapers.tsv
)

(
    echo '[
            "article",
            "tag"
    ]' | 
    jq -r '
        . | 
        @tsv
    ' > $RESEARCH/media_networks_polarisation/data/headers/tagged.tsv
)

(
    echo '[
            "article",
            "author"
    ]' | 
    jq -r '
        . | 
        @tsv
    ' > $RESEARCH/media_networks_polarisation/data/headers/wrote.tsv
)

(
    echo '[
            "article",
            "newspaper"
    ]' | 
    jq -r '
        . | 
        @tsv
    ' > $RESEARCH/media_networks_polarisation/data/headers/published.tsv
)