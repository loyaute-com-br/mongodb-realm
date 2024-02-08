exports = async function(request, response){
  try {
    if (request.body === undefined) {
      throw new Error(`Request body was not defined.`);
    }

    const body = JSON.parse(await request.body.text());

    const mongodb = context.services.get("mongodb-atlas");

    const client = await mongodb.db("clients").collection("clients").findOne(
        { "cpf": body.cpf });

    if (!client) {
      throw new Error(`Client with CPF ${body.cpf} not found.`);
    }

    const wallet = await mongodb.db("clients").collection("wallets").findOne(
        { "client_id": client._id });

    if (!wallet) {
      // create wallet
      return;
    }

    response.setStatusCode(200);
    response.setBody(JSON.stringify({ "name": client.first_name, "balance": wallet.balance }));
    return;
  } catch (error) {
    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "error": { "message": error.message }}));
  }
};
