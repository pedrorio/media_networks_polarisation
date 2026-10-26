module.exports = {
	name: "scrapper",
	type: "postgres",
	host: process.env.DB_HOST || "localhost",
	port: Number(process.env.DB_PORT || 5432),
	username: process.env.DB_USER || "test",
	password: process.env.DB_PASSWORD || "test",
	database: process.env.DB_NAME || "test",
	logging: true,
	dropSchema: false,
	synchronize: true,
	migrationsRun: true,
	migrations: ["migration/*.ts"],
	entities: ["entities/**/*.ts"]
}
