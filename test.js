const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client
  .connect()
  .then(async () => {
    console.log("Conectou!");
    console.log(await client.query("select now()"));
    await client.end();
  })
  .catch(console.error);
