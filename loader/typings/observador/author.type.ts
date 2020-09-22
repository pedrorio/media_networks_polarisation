export interface ObservadorAuthor {
	name: string;
	[key: string]: any;
}

export interface ObservadorAuthorBulk {
	user: {
		displayName: string;
	}
	[key: string]: any;
}