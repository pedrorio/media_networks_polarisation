module.exports = {
	name: "scrapper",
	type: "postgres",
	host: "localhost",
	port: 3306,
	username: "test",
	password: "test",
	database: "test",
	logging: true,
	dropSchema: false,
	synchronize: true,
	migrationsRun: true,
	migrations: ["migration/*.ts"],
	entities: ["entities/*.ts"]
}