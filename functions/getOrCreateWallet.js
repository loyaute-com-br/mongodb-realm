exports = async function(request, response){
  try {
    if (request.body === undefined) {
      throw new Error(`Request body was not defined.`);
    }

    if (!context.user) {
      response.setStatusCode(401);
      response.setBody(JSON.stringify({ "error": { "message": `User not authenticated.` }}));
      return;
    }

    if (!context.user.custom_data.roles.includes("SELLER")) {
      response.setStatusCode(401);
      response.setBody(JSON.stringify({ "error": { "message": `User not authorized.` }}));
      return;
    }

    const body = JSON.parse(await request.body.text());

    if(body.cpf == undefined) {
      throw new Error(`Request body missing data.`);
    }

    const mongodb = context.services.get("mongodb-atlas");

    const client = await mongodb.db("clients").collection("clients").findOne(
        { "cpf": body.cpf });

    if (!client) {
      response.setStatusCode(404);
      response.setBody(JSON.stringify({ "error": { "message": `Client with CPF ${body.cpf} not found.` }}));
      return;
    }

    const wallet = await mongodb.db("clients").collection("wallets").findOne(
        { "client_id": client._id, "establishment_id": context.user.custom_data.establishment_id });

    let balance = 0;

    if (!wallet) {
      // create wallet
      let doc = {
        client_id: client._id,
        establishment_id: context.user.custom_data.establishment_id,
        balance: balance,
      }

      await mongodb.db("clients").collection("wallets").insertOne(doc);
      response.setStatusCode(201);
    } else {
      balance = wallet.balance;
      response.setStatusCode(200);
    }

    response.setBody(JSON.stringify({ "name": client.first_name, "balance": balance }));
  } catch (error) {
    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "error": { "message": error.message }}));
  }
};
