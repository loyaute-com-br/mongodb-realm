exports = async function(request, response){
  try {
    // if (request.body === undefined) {
    //   throw new Error(`Request body was not defined.`);
    // }

    // const body = JSON.parse(await request.body.text());

    const body = {
      "cpf": "45639157852"
    }

    const mongodb = context.services.get("mongodb-atlas");

    console.log("Searching for client with CPF:", body.cpf);
    const client = await mongodb.db("clients").collection("clients").findOne(
        { "cpf": body.cpf });

    if (!client) {
      throw new Error(`Client with CPF ${body.cpf} not found.`);
    }

    console.log("Found client:", client);

    const wallet = await mongodb.db("clients").collection("wallets").findOne(
        { "client_id": client._id });

    console.log("Wallet for client:", wallet);

    return wallet;
  } catch (error) {
    console.error("Error:", error);
    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "error": { "message": error.message }}));
  }
};
